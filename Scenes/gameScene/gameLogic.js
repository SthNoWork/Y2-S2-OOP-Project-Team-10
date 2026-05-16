// ========================================
// GAME LOGIC
// ========================================
// Central coordinator for all gameplay rules.
// Owns: PlayerState, collision handling, blast physics, bombing run lifecycle,
//       bomb spawning, per-frame bombing update, and game-over/win detection.
// Does NOT own: scene setup, UI, building config, drag logic.

// ========================================
// PLAYER STATE
// ========================================
// Internal health and game-over tracking for the player.
// Accessed by GameLogic only — not exposed as a global.

const PlayerState = {
  health:   window.ObjectConfig?.player?.maxHealth ?? 100,
  gameOver: false,

  // Reset health to max and clear game-over flag.
  init() {
    this.health   = window.ObjectConfig.player.maxHealth;
    this.gameOver = false;
  },

  // Reduce health by amount. Returns true if the player just died.
  takeDamage(amount) {
    if (this.gameOver) return true;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) { this.gameOver = true; return true; }
    return false;
  },

  // Restore health up to the configured maximum.
  heal(amount) {
    this.health = Math.min(this.health + amount, window.ObjectConfig.player.maxHealth);
  },

  isAlive() { return this.health > 0 && !this.gameOver; },
};

// ========================================
// GAME LOGIC
// ========================================

window.GameLogic = {

  // ========================================
  // STATE
  // ========================================

  scene:        null,
  player:       null,
  arena:        null,
  buildings:    [],
  _onCollision: null,

  // Bombing run runtime state — null when no run is active.
  _run: null,
  // Live bomb list — cleaned up each frame.
  _activeBombs: [],

  // Expose PlayerState so GameScene can read health / gameOver for the HUD.
  playerState: PlayerState,

  // ========================================
  // INITIALIZATION
  // ========================================

  // Bind to a scene, player, and arena. Removes any previous collision listener.
  init(scene, player, arena) {
    // Remove old collision listener before rebinding.
    if (this.scene && this._onCollision && this.scene.matter?.world) {
      try { this.scene.matter.world.off('collisionstart', this._onCollision); } catch (e) {}
    }

    this.scene       = scene;
    this.player      = player;
    this.arena       = arena;
    this.buildings   = [];
    this._run        = null;
    this._activeBombs = [];

    PlayerState.init();

    this._onCollision = (event) => {
      event.pairs.forEach((pair) => this._handleCollision(pair.bodyA, pair.bodyB));
    };
    this.scene.matter.world.on('collisionstart', this._onCollision);
  },

  // ========================================
  // BOMBING RUN — CONTROL
  // ========================================

  // Start a new bombing run: spawn the plane and initialise timing state.
  // velocityPxPerSec: how fast the plane moves across the screen.
  // spawnLocation: { x, y } where the plane appears.
  // direction: 1 = left-to-right, -1 = right-to-left.
  startBombingRun(velocityPxPerSec, spawnLocation, direction) {
    const planeCfg = window.ObjectConfig.plane;

    // Destroy any plane already in flight.
    if (this._run?.plane?.active) this._run.plane.destroy();

    const plane = window.ObjectFactory.createPlane(this.scene, spawnLocation, this.arena);
    const range = planeCfg.bombDropDelayRangeSec;

    this._run = {
      plane,
      speed:            velocityPxPerSec,
      direction,
      planeVelocity:    { x: velocityPxPerSec * direction, y: 0 },
      spawnAccumulator: 0,
      // First bomb drops after a random delay within the configured range.
      nextBombDelay:    range.min + Math.random() * Math.max(0, range.max - range.min),
      bombOffsetY:      this.arena.ARENA_H * (planeCfg.bombDropYOffsetRatio ?? 0.04),
      // endX: the x position at which the plane exits and is destroyed.
      endX:             direction > 0 ? this.arena.W * 2 : -this.arena.W,
    };
  },

  // ========================================
  // BOMBING RUN — PER-FRAME UPDATE
  // ========================================

  // Advance the plane, spawn bombs on schedule, and clean up landed/inactive bombs.
  // Call this from GameScene.update() every frame.
  update(delta) {
    const dt = delta / 1000;
    this._updatePlane(dt);
    this._updateBombs();
  },

  // Move the plane and trigger bomb drops on the accumulator schedule.
  _updatePlane(dt) {
    if (!this._run?.plane?.active) return;

    const run   = this._run;
    const prevX = run.plane.x;
    const prevY = run.plane.y;

    run.plane.x += run.speed * run.direction * dt;

    // Track actual plane velocity so bombs inherit it at spawn time.
    const safeDt          = dt > 0 ? dt : 1 / 60;
    run.planeVelocity.x   = (run.plane.x - prevX) / safeDt;
    run.planeVelocity.y   = (run.plane.y - prevY) / safeDt;

    // Accumulate time and drop bombs whenever the delay threshold is crossed.
    run.spawnAccumulator += dt;
    const { min, max } = window.ObjectConfig.plane.bombDropDelayRangeSec;
    while (run.spawnAccumulator >= run.nextBombDelay) {
      this._spawnBomb();
      run.spawnAccumulator -= run.nextBombDelay;
      run.nextBombDelay     = min + Math.random() * Math.max(0, max - min);
    }

    // Destroy the plane once it exits the physics bounds.
    const reachedEnd = run.direction > 0
      ? run.plane.x >= run.endX
      : run.plane.x <= run.endX;

    if (reachedEnd) {
      run.plane.destroy();
      this._run = null;
    }
  },

  // ========================================
  // BOMB SPAWNING
  // ========================================

  // Create one bomb below the plane with a randomised horizontal offset.
  _spawnBomb() {
    if (!this._run?.plane?.active) return;

    const { plane, planeVelocity, bombOffsetY } = this._run;
    const planeCfg    = window.ObjectConfig.plane;
    const offsetRange = planeCfg.bombDropOffsetRatioRange;
    const planeWidth  = this.arena.W * planeCfg.widthRatio;
    const offsetX     = (offsetRange.min + Math.random() * Math.max(0, offsetRange.max - offsetRange.min)) * planeWidth;

    const bomb = window.ObjectFactory.createBomb(
      this.scene, plane.x + offsetX, plane.y + bombOffsetY, this.arena
    );

    // Bombs inherit the plane's velocity so they arc naturally.
    const matterStepRate = 60;
    Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, {
      x: planeVelocity.x / matterStepRate,
      y: planeVelocity.y / matterStepRate,
    });

    this._activeBombs.push(bomb);
  },

  // ========================================
  // BOMB LIFECYCLE
  // ========================================

  // Sweep active bombs: explode and remove any that have landed or gone inactive.
  _updateBombs() {
    if (!this._activeBombs.length) return;

    const bottom = this.arena.ARENA_Y + this.arena.ARENA_H;

    for (let i = this._activeBombs.length - 1; i >= 0; i--) {
      const bomb = this._activeBombs[i];

      if (!bomb.active || bomb.y >= bottom) {
        if (bomb.active) {
          // Bomb reached the floor without a collision — detonate it.
          const bombCfg = window.ObjectConfig.bomb;
          const radius  = Math.max(
            this.arena.W * (bombCfg.blastRadiusRatio || 0.06),
            this.arena.H * (bombCfg.blastRadiusRatio || 0.06)
          );
          try { this._createBlastRadius(bomb.x, bomb.y, radius, bombCfg.blastForce); } catch (e) {}
          try { bomb.destroy(); } catch (e) {}
        }
        this._activeBombs.splice(i, 1);
      }
    }
  },

  // ========================================
  // COLLISION HANDLING
  // ========================================

  // Called on every Matter collision pair. Handles bomb impacts only.
  _handleCollision(bodyA, bodyB) {
    if (!bodyA || !bodyB) return;

    const bombBody  = bodyA.label === 'bomb' ? bodyA : bodyB.label === 'bomb' ? bodyB : null;
    if (!bombBody) return;

    const otherBody = bombBody === bodyA ? bodyB : bodyA;
    // Bombs do not detonate on other bombs.
    if (otherBody.label === 'bomb') return;

    const bombGO = bombBody.gameObject;
    if (!bombGO?.active) return;

    const bombCfg   = window.ObjectConfig.bomb;
    const radius    = Math.max(40, bombCfg.blastRadiusRatio * this.scene.scale.width);
    const force     = bombCfg.blastForce     || 50;
    const directDmg = bombCfg.directHitDamage || 50;

    // Apply direct-hit damage to whatever was struck.
    const otherGO = otherBody?.gameObject;
    if (otherGO) {
      if (otherGO === this.player) {
        const dead = PlayerState.takeDamage(directDmg);
        if (dead) this._endGame(false);
      } else if (typeof otherGO.takeDamage === 'function') {
        otherGO.takeDamage(directDmg);
      }
    }

    this._createBlastRadius(bombGO.x, bombGO.y, radius, force);
    try { bombGO.destroy(); } catch (e) {}
  },

  // ========================================
  // BLAST PHYSICS
  // ========================================

  // Spawn an explosion visual and apply knockback + damage to all nearby bodies.
  // maxDamageOverride: optional — if provided, overrides ObjectConfig.bomb.blastMaxDamage.
  // This lets bomb_crate use its own blast.maxDamage without touching the plane-bomb config.
  _createBlastRadius(x, y, radius, force, maxDamageOverride) {
    // Visual: expanding orange circle that fades out.
    try {
      const gfx = this.scene.add.circle(x, y, Math.max(8, radius * 0.2), 0xff6600, 0.5);
      this.scene.tweens.add({
        targets:    gfx,
        alpha:      0,
        scale:      2,
        duration:   300,
        onComplete: () => gfx.destroy(),
      });
    } catch (e) {}

    const bodies      = this.scene.matter.intersectRect(x - radius, y - radius, radius * 2, radius * 2) || [];
    const blastMaxDmg = (maxDamageOverride !== undefined)
      ? maxDamageOverride
      : (window.ObjectConfig.bomb.blastMaxDamage || 50);

    bodies.forEach((body) => {
      const obj = body.gameObject;
      if (!obj || obj.isBomb || body.label === 'bomb') return;

      const falloff = this._applyKnockback(body, x, y, force, radius);
      if (falloff <= 0) return;

      const damage = Math.round(blastMaxDmg * falloff);

      if (obj === this.player) {
        const dead = PlayerState.takeDamage(damage);
        if (dead) this._endGame(false);
      } else if (obj.isBuilding || obj.buildingConfig) {
        if (typeof obj.takeDamage === 'function') {
          obj.takeDamage(damage);
          if (obj.health <= 0) {
            try { window.BuildingManager.destroyBuilding(obj); } catch (e) {}
            this.buildings = this.buildings.filter((b) => b !== obj);
          }
        }
      }
    });
  },

  // Apply a velocity impulse to a single physics body based on distance falloff.
  // Uses mass only (no blastResistance). Returns the falloff value (0 = no effect).
  _applyKnockback(body, bx, by, blastForce, radius) {
    const obj = body.gameObject;
    if (!obj || body.isStatic || obj.isBomb || body.label === 'bomb') return 0;

    const dx   = body.position.x - bx;
    const dy   = body.position.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= radius || dist <= 0) return 0;

    const falloff = (1 - dist / radius) ** 2;
    const mass    = body.mass || 1;
    // Knockback = force × falloff / mass. Heavier objects move less.
    const deltaV  = (blastForce * falloff) / mass;

    const nx = dx / dist;
    const ny = dy / dist;
    const velocity = obj.getVelocity();
    obj.setVelocity(velocity.x + nx * deltaV, velocity.y + ny * deltaV);

    return falloff;
  },

  // ========================================
  // BUILDING TRACKING
  // ========================================

  // Register a building so blast queries can find and damage it.
  addBuilding(building) {
    this.buildings.push(building);
    building.isBuilding = true;
  },

  // ========================================
  // GAME STATE
  // ========================================

  // Trigger game over or win. Fires only once.
  _endGame(won) {
    if (PlayerState.gameOver) return;
    PlayerState.gameOver = true;
    console.log(won ? 'Level Complete!' : 'Game Over!');
  },

  // Reset all bombing run and bomb state without rebinding collision listeners.
  resetRun() {
    if (this._run?.plane?.active) {
      try { this._run.plane.destroy(); } catch (e) {}
    }
    this._run = null;

    for (const bomb of this._activeBombs) {
      if (bomb?.active) try { bomb.destroy(); } catch (e) {}
    }
    this._activeBombs = [];

    PlayerState.init();
  },

};
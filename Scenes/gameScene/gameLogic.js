// ========================================
// GAME LOGIC
// ========================================
// Central coordinator for all gameplay rules.
// Owns: collision handling, blast physics, bombing run lifecycle,
//       bomb spawning, per-frame update, and game-over detection.
// Does NOT own: scene setup, UI, building config, drag logic.
//
// Player health now lives on the player object itself (set by ObjectFactory
// via cfg.health). GameLogic reads player.health directly.

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
  _run:         null,
  // Live bomb list — cleaned up each frame.
  _activeBombs: [],

  // gameOver flag — lives here.
  gameOver: false,

  // ========================================
  // INITIALIZATION
  // ========================================

  init(scene, player, arena) {
    // Remove old collision listener before rebinding.
    if (this.scene && this._onCollision && this.scene.matter?.world) {
      try { this.scene.matter.world.off('collisionstart', this._onCollision); } catch (e) {}
    }

    this.scene        = scene;
    this.player       = player;
    this.arena        = arena;
    this.buildings    = [];
    this._run         = null;
    this._activeBombs = [];
    this.gameOver     = false;

    // Reset player health to max via config.
    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    if (this.player) this.player.health = maxHp;

    this._onCollision = (event) => {
      event.pairs.forEach((pair) => this._handleCollision(pair.bodyA, pair.bodyB));
    };
    this.scene.matter.world.on('collisionstart', this._onCollision);
  },

  // ========================================
  // BOMBING RUN — CONTROL
  // ========================================

  startBombingRun(velocityPxPerSec, spawnLocation, direction) {
    const planeCfg = window.ObjectConfig.internalTypes.plane;

    if (this._run?.plane?.active) this._run.plane.destroy();

    const plane = window.ObjectFactory.createInternal(
      this.scene, 'plane', 0, 0, this.arena, { spawnLocation }
    );
    const range = planeCfg.bombDropDelayRangeSec;

    this._run = {
      plane,
      speed:            velocityPxPerSec,
      direction,
      planeVelocity:    { x: velocityPxPerSec * direction, y: 0 },
      spawnAccumulator: 0,
      nextBombDelay:    range.min + Math.random() * Math.max(0, range.max - range.min),
      bombOffsetY:      this.arena.ARENA_H * (planeCfg.bombDropYOffsetRatio ?? 0.04),
      endX:             direction > 0 ? this.arena.W * 2 : -this.arena.W,
    };
  },

  // ========================================
  // PER-FRAME UPDATE
  // ========================================

  update(delta) {
    const dt = delta / 1000;
    this._updatePlane(dt);
    this._updateBombs();
  },

  _updatePlane(dt) {
    if (!this._run?.plane?.active) return;

    const run   = this._run;
    const prevX = run.plane.x;
    const prevY = run.plane.y;

    run.plane.x += run.speed * run.direction * dt;

    const safeDt        = dt > 0 ? dt : 1 / 60;
    run.planeVelocity.x = (run.plane.x - prevX) / safeDt;
    run.planeVelocity.y = (run.plane.y - prevY) / safeDt;

    run.spawnAccumulator += dt;
    const planeCfg = window.ObjectConfig.internalTypes.plane;
    const { min, max } = planeCfg.bombDropDelayRangeSec;
    while (run.spawnAccumulator >= run.nextBombDelay) {
      this._spawnBomb();
      run.spawnAccumulator -= run.nextBombDelay;
      run.nextBombDelay     = min + Math.random() * Math.max(0, max - min);
    }

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

  _spawnBomb() {
    if (!this._run?.plane?.active) return;

    const { plane, planeVelocity, bombOffsetY } = this._run;
    const planeCfg    = window.ObjectConfig.internalTypes.plane;
    const offsetRange = planeCfg.bombDropOffsetRatioRange;
    const planeWidth  = this.arena.W * planeCfg.widthRatio;
    const offsetX     = (offsetRange.min + Math.random() * Math.max(0, offsetRange.max - offsetRange.min)) * planeWidth;

    const bomb = window.ObjectFactory.createInternal(
      this.scene, 'bomb', plane.x + offsetX, plane.y + bombOffsetY, this.arena
    );

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

  _updateBombs() {
    if (!this._activeBombs.length) return;

    const bottom  = this.arena.ARENA_Y + this.arena.ARENA_H;
    const bombCfg = window.ObjectConfig.internalTypes.bomb;

    for (let i = this._activeBombs.length - 1; i >= 0; i--) {
      const bomb = this._activeBombs[i];

      if (!bomb.active || bomb.y >= bottom) {
        if (bomb.active) {
          const radius = Math.max(
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

  _handleCollision(bodyA, bodyB) {
    if (!bodyA || !bodyB) return;

    const bombBody = bodyA.label === 'bomb' ? bodyA : bodyB.label === 'bomb' ? bodyB : null;
    if (!bombBody) return;

    const otherBody = bombBody === bodyA ? bodyB : bodyA;
    if (otherBody.label === 'bomb') return;

    const bombGO = bombBody.gameObject;
    if (!bombGO?.active) return;

    const bombCfg   = window.ObjectConfig.internalTypes.bomb;
    const radius    = Math.max(40, bombCfg.blastRadiusRatio * this.scene.scale.width);
    const force     = bombCfg.blastForce      || 50;
    const directDmg = bombCfg.directHitDamage || 50;

    const otherGO = otherBody?.gameObject;
    window.logDebug?.('[GameLogic._handleCollision] bomb hit', {
      otherLabel: otherBody.label,
      otherType: otherGO?.buildingType ?? otherGO?.objectType ?? 'unknown',
      isPlayer: otherGO === this.player,
      directDmg,
    });

    if (otherGO) {
      if (otherGO === this.player) {
        this._damagePlayer(directDmg);
      } else if (typeof otherGO.takeDamage === 'function') {
        const died = otherGO.takeDamage(directDmg);
        if (died) this._onBuildingDied(otherGO);
      }
    }

    this._createBlastRadius(bombGO.x, bombGO.y, radius, force);
    try { bombGO.destroy(); } catch (e) {}
  },

  // ========================================
  // BLAST PHYSICS
  // ========================================

  _createBlastRadius(x, y, radius, force, maxDamageOverride) {
    // Visual: expanding circle that fades out.
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

    const bombCfg     = window.ObjectConfig.internalTypes.bomb;
    const blastMaxDmg = maxDamageOverride !== undefined
      ? maxDamageOverride
      : (bombCfg.blastMaxDamage || 50);

    const bodies = this.scene.matter.intersectRect(x - radius, y - radius, radius * 2, radius * 2) || [];

    bodies.forEach((body) => {
      const obj = body.gameObject;
      if (!obj || obj.isBomb || body.label === 'bomb') return;

      const falloff = this._applyKnockback(body, x, y, force, radius);
      if (falloff <= 0) return;

      const damage = Math.round(blastMaxDmg * falloff);

      if (obj === this.player) {
        this._damagePlayer(damage);
      } else if (obj.isBuilding || obj.buildingConfig) {
        if (typeof obj.takeDamage === 'function') {
          const died = obj.takeDamage(damage);
          if (died) this._onBuildingDied(obj);
        }
      }
    });
  },

  _applyKnockback(body, bx, by, blastForce, radius) {
    const obj = body.gameObject;
    if (!obj || body.isStatic || obj.isBomb || body.label === 'bomb') return 0;

    const dx   = body.position.x - bx;
    const dy   = body.position.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= radius || dist <= 0) return 0;

    const falloff = (1 - dist / radius) ** 2;
    const mass    = body.mass || 1;
    const deltaV  = (blastForce * falloff) / mass;

    const nx       = dx / dist;
    const ny       = dy / dist;
    const velocity = obj.getVelocity();
    obj.setVelocity(velocity.x + nx * deltaV, velocity.y + ny * deltaV);

    return falloff;
  },

  // ========================================
  // DAMAGE HELPERS
  // ========================================

  // Reduce player health; trigger game-over when it hits zero.
  _damagePlayer(amount) {
    if (this.gameOver || !this.player) return;
    this.player.health = Math.max(0, (this.player.health || 0) - amount);
    if (this.player.health <= 0) this._endGame(false);
  },

  // Called whenever a building's takeDamage() returns true (health <= 0).
  _onBuildingDied(obj) {
    window.logDebug?.('[GameLogic._onBuildingDied] building died', {
      type: obj.buildingType,
      health: obj.health,
      x: Math.round(obj.x),
      y: Math.round(obj.y),
      isLocked: obj.isLocked,
    });
    try { window.BuildingManager.destroyBuilding(obj); } catch (e) {}
    this.buildings = this.buildings.filter((b) => b !== obj);
  },

  // ========================================
  // BUILDING TRACKING
  // ========================================

  addBuilding(building) {
    this.buildings.push(building);
    building.isBuilding = true;
  },

  // ========================================
  // GAME STATE
  // ========================================

  _endGame(won) {
    if (this.gameOver) return;
    this.gameOver = true;
    window.logDebug?.(won ? 'Level Complete!' : 'Game Over!');
  },

  resetRun() {
    if (this._run?.plane?.active) {
      try { this._run.plane.destroy(); } catch (e) {}
    }
    this._run = null;

    for (const bomb of this._activeBombs) {
      if (bomb?.active) try { bomb.destroy(); } catch (e) {}
    }
    this._activeBombs = [];

    this.gameOver = false;

    // Restore player health.
    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    if (this.player) this.player.health = maxHp;
  },

};
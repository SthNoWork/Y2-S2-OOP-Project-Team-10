// core/gameLogic.js
// Owns the bombing-run loop: plane movement, bomb spawning, detonations,
// damage/knockback application, and win/lose detection.

window.GameLogic = {

  scene: null,
  player: null,
  arena: null,
  buildings: [],
  gameOver: false,

  _onCollision: null,
  _run: null,   // active bombing run state
  _activeBombs: [],
  _chainExplosionQueue: [],    // queued chain explosions, flushed each frame


  // ── Initialisation ────────────────────────────────────────────────────────

  init(scene, player, arena) {
    this._detachCollisionListener();
    if (this.scene) {
      if (this._onBombSpawn) {
        try { this.scene.events.off('bomb:spawn', this._onBombSpawn, this); } catch (e) { }
      }
    }

    this.scene = scene;
    this.player = player;
    this.arena = arena;
    this.buildings = [];
    this._run = null;
    this._activeBombs = [];
    this._chainExplosionQueue = [];
    this._targets = [];
    this._recentExplosions = [];
    this.gameOver = false;

    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    if (this.player) this.player.health = maxHp;

    this._attachCollisionListener();

    // Attach decoupled event listeners
    this._onBombSpawn = (bomb) => {
      try { window.SfxManager?.playDrop?.(); } catch (e) { }
    };
    this.scene.events.on('bomb:spawn', this._onBombSpawn, this);
  },

  _attachCollisionListener() {
    this._onCollision = (event) => {
      event.pairs.forEach((pair) => this._handleCollision(pair.bodyA, pair.bodyB));
    };
    this.scene.matter.world.on('collisionstart', this._onCollision);
  },

  _detachCollisionListener() {
    if (this.scene && this._onCollision && this.scene.matter?.world) {
      try { this.scene.matter.world.off('collisionstart', this._onCollision); } catch (e) { }
    }
    if (this.scene && this._onBombSpawn) {
      try { this.scene.events.off('bomb:spawn', this._onBombSpawn, this); } catch (e) { }
    }
  },


  // ── Public API ────────────────────────────────────────────────────────────

  // Called each frame by the scene.
  update(delta) {
    this._processChainExplosions();
    this._updateBombs();
  },

  // Registers a placed building so it can receive blast damage.
  addBuilding(building) {
    this.buildings.push(building);
    building.isBuilding = true;
  },

  // Resets run state between attempts (keeps the scene alive).
  resetRun() {
    this._destroyActivePlane();
    this._run = null;

    for (const bomb of this._activeBombs) {
      if (bomb?.active) { try { bomb.destroy(); } catch (e) { } }
    }
    this._activeBombs = [];
    this.gameOver = false;

    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    if (this.player) this.player.health = maxHp;

    try { window.SfxManager?.stopAll?.(); } catch (e) { }
  },


  // ── Bombing run ───────────────────────────────────────────────────────────

  // Starts a new bombing run. Called by LevelManager for each wave.
  startBombingRun(velocityPxPerSec, spawnLocation, direction, waveBombType) {
    const planeCfg = window.ObjectConfig.internalTypes.plane;
    if (!this._validatePlaneCfg(planeCfg)) return;

    this._destroyActivePlane();

    const spawn = this._resolveSpawnPoint(planeCfg, spawnLocation);
    const plane = window.ObjectFactory.createInternal(
      this.scene, 'plane', 0, 0, this.arena, { spawnLocation: spawn }
    );
    if (!plane) return;

    this._targets.push(plane);
    this._run = { plane };

    plane.startFlight(velocityPxPerSec, direction, waveBombType);
  },

  _validatePlaneCfg(planeCfg) {
    const required = ['spawnYOffsetY', 'bladeOffsetX', 'bladeOffsetY', 'bombDropYOffsetY'];
    for (const key of required) {
      if (planeCfg[key] == null) {
        console.error(`[GameLogic.startBombingRun] planeCfg.${key} is not defined`);
        return false;
      }
    }
    return true;
  },

  _destroyActivePlane() {
    if (this._run?.plane?.active) {
      this._targets = this._targets.filter((t) => t !== this._run.plane);
      window.ObjectFactory.destroy(this._run.plane);
      this._run = null;
    }
  },

  _resolveSpawnPoint(planeCfg, spawnLocation) {
    return spawnLocation
      ? { x: spawnLocation.x, y: spawnLocation.y + planeCfg.spawnYOffsetY }
      : { x: 0, y: planeCfg.spawnYOffsetY };
  },

  _updateBombs() {
    if (!this._activeBombs.length) return;

    const bottom = this.arena.ARENA_Y + this.arena.ARENA_H;

    for (let i = this._activeBombs.length - 1; i >= 0; i--) {
      const bomb = this._activeBombs[i];

      if (!bomb || !bomb.active || !bomb.body) {
        this._activeBombs.splice(i, 1);
        continue;
      }

      // PERFORMANCE OPTIMIZATION: Clean up bombs that go far off-screen horizontally or fly too high.
      const isOffScreen = bomb.x < -1000 || bomb.x > 2920 || bomb.y < -2000;

      if (bomb.y >= bottom || isOffScreen) {
        if (bomb.y >= bottom) {
          // Explode on ground contact
          const bombCfg = window.ObjectConfig.internalTypes[bomb.objectType] || window.ObjectConfig.internalTypes.bomb;
          try { this.scene.events.emit('bomb:explode', bomb); } catch (e) { }
          try { this._explodeAt(bombCfg, bomb.x, bomb.y, bomb); } catch (e) { }
          try { this.scene.events.emit('bomb:destroy', bomb); } catch (e) { }
          try { bomb.destroy(); } catch (e) { }
        } else {
          // Silently reclaim off-screen bombs without triggering performance-heavy explosions
          try { this.scene.events.emit('bomb:destroy', bomb); } catch (e) { }
          try { bomb.destroy(); } catch (e) { }
        }
        this._activeBombs.splice(i, 1);
      }
    }
  },


  // ── Collision handling ────────────────────────────────────────────────────

  // Triggers a detonation when a bomb body touches anything that isn't another bomb.
  _handleCollision(bodyA, bodyB) {
    if (!bodyA || !bodyB) return;

    // ── Trampoline bounce (checked first — overrides bomb detonation) ─────
    const trampolineBody = bodyA.label === 'trampoline' ? bodyA : bodyB.label === 'trampoline' ? bodyB : null;
    if (trampolineBody) {
      const otherBody = trampolineBody === bodyA ? bodyB : bodyA;
      // ONLY bounces bombs
      if (otherBody.label === 'bomb') {
        if (trampolineBody.gameObject && typeof trampolineBody.gameObject.bounce === 'function') {
          trampolineBody.gameObject.bounce(otherBody);
        }
        return; // Early return prevents the bomb from exploding
      }
    }

    // ── Bomb collision ────────────────────────────────────────────────────
    const bombBody = bodyA.label === 'bomb' ? bodyA : bodyB.label === 'bomb' ? bodyB : null;
    if (!bombBody) return;

    const otherBody = bombBody === bodyA ? bodyB : bodyA;
    if (otherBody.label === 'bomb') return;

    const bombGO = bombBody.gameObject;
    if (!bombGO?.active) return;

    const bombType = bombGO.objectType;
    const bombCfg = window.ObjectConfig.internalTypes[bombType] || window.ObjectConfig.internalTypes.bomb;
    const explodeOnImpact = bombCfg.explodeOnImpact !== undefined ? bombCfg.explodeOnImpact : true;

    if (explodeOnImpact) {
      try { this.scene.events.emit('bomb:explode', bombGO); } catch (e) { console.error('Error emitting bomb:explode:', e); }
      try { this._explodeAt(bombCfg, bombGO.x, bombGO.y, bombGO); } catch (e) { console.error('Error in _explodeAt:', e); }
      try { this.scene.events.emit('bomb:destroy', bombGO); } catch (e) { console.error('Error emitting bomb:destroy:', e); }
      try { bombGO.destroy(); } catch (e) { console.error('Error destroying bomb:', e); }
    }
  },

  // ── Detonation ────────────────────────────────────────────────────────────

  // Shows VFX, collects nearby bodies, and applies knockback + damage.
  _explodeAt(explosiveCfg, x, y, sourceBomb) {
    try {
      const cmd = new window.ExplosionCommand(this.scene, {
        x,
        y,
        explosiveCfg,
        sourceBomb
      });
      cmd.execute();
    } catch (e) {
      console.error('Error executing ExplosionCommand in _explodeAt:', e);
    }
  },

  _damagePlayer(amount) {
    if (this.gameOver || !this.player) return;

    // Shield active — absorb the hit completely, no HP reduction
    if (this.player._shielded && this.player._shieldEnd && Date.now() < this.player._shieldEnd) {
      return;
    }

    this.player.health = Math.max(0, (this.player.health || 0) - amount);
    if (this.player.health <= 0) {
      this._handlePlayerDeath();
      this._triggerGameOver();
    }
  },

  _handlePlayerDeath() {
    if (!this.player) return;

    const player = this.player;
    this.player = null;

    const playerCfg = window.ObjectConfig?.internalTypes?.player;
    const shouldExplode = playerCfg?.onDeath === 'explode' && playerCfg?.explosion;
    if (shouldExplode) {
      this._chainExplosionQueue.push({ cfg: playerCfg, x: player.x, y: player.y });
    }

    try { window.ObjectFactory.destroy(player); } catch (e) { }
  },

  _triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    window.logDebug?.('Game Over!');
  },


  // ── Building death & chain explosions ────────────────────────────────────

  // Removes a building that reached 0 HP and optionally queues a chain explosion.
  _handleBuildingDeath(obj) {
    const savedX = obj.x;
    const savedY = obj.y;
    const cfg = obj.buildingConfig || window.ObjectConfig.internalTypes[obj.objectType];
    const willChainBlast = cfg?.onDeath === 'explode' && cfg?.explosion;

    obj._dying = true;

    // Notify PillboxManager if it's a pillbox dying
    try { window.PillboxManager?.unregisterPillbox?.(obj); } catch (e) { }
    // Notify MortarManager if it's a mortar dying
    try { window.MortarManager?.unregisterMortar?.(obj); } catch (e) { }

    try { window.BuildingManager.destroyBuilding(obj); } catch (e) { }
    this.buildings = this.buildings.filter((b) => b !== obj);
    this._targets = this._targets.filter((t) => t !== obj);

    if (obj.objectType === 'plane') {
      if (obj._blade?.active) {
        try { obj._blade.destroy(); } catch (e) { }
      }
      this._run = null;
      try { obj.destroy(); } catch (e) { }
    }

    if (willChainBlast && this.scene) {
      this._chainExplosionQueue.push({ cfg, x: savedX, y: savedY, owner: obj, sourceBomb: obj });
    }
  },

  // Detonates all queued chain explosions accumulated during this frame.
  _processChainExplosions() {
    if (!this._chainExplosionQueue.length) return;

    const queue = this._chainExplosionQueue;
    this._chainExplosionQueue = [];

    for (const exp of queue) {
      try { this._explodeAt(exp.cfg, exp.x, exp.y, exp.sourceBomb); } catch (e) { }
    }
  },

  // ── Targeting ────────────────────────────────────────────────────────────

  getTarget(x, y) {
    if (this.player && this.player.active) {
      return this.player;
    }
    return null;
  },
};

window.spawnBomb = function (scene, bombTypeKey, spawnX, spawnY, directionDeg, target, owner) {
  const bombCfg = window.ObjectConfig.internalTypes[bombTypeKey] || window.ObjectConfig.placeableTypes[bombTypeKey] || window.ObjectConfig.levelTypes[bombTypeKey];
  if (!bombCfg) {
    console.error(`spawnBomb: unknown bomb type key "${bombTypeKey}"`);
    return null;
  }

  // Check pool first
  let bomb = window.GameLogicHelper.getPooledBomb(scene, bombTypeKey);

  if (!bomb) {
    const arena = window.GameLogic?.arena;
    const isPlaceable = !!window.ObjectConfig.placeableTypes[bombTypeKey];
    if (isPlaceable) {
      bomb = window.ObjectFactory.createPlaceable(scene, bombTypeKey, spawnX, spawnY, arena);
    } else {
      bomb = window.ObjectFactory.createInternal(scene, bombTypeKey, spawnX, spawnY, arena);
    }
    if (!bomb) return null;
  } else {
    // Reset properties for recycled bomb
    bomb.setPosition(spawnX, spawnY);
    bomb.setAngle(0);
    if (bomb._lifetimeTimer) {
      bomb._lifetimeTimer.destroy();
      bomb._lifetimeTimer = null;
    }
    if (bomb.body) {
      Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, { x: 0, y: 0 });
      Phaser.Physics.Matter.Matter.Body.setAngularVelocity(bomb.body, 0);
      bomb.body.force.x = 0;
      bomb.body.force.y = 0;
      bomb.body.torque = 0;
    }
  }

  bomb.owner = owner || {};

  // Ensure poolable is set up
  window.GameLogicHelper.setupPoolableBomb(bomb, bombCfg);
  window.GameLogicHelper.registerPoolCleanup(scene);

  // Resolve target & launch physics
  const speed = bombCfg.speed !== undefined ? bombCfg.speed : (window.GameLogic?._run?.speed || 200);
  const gravityObj = scene.matter?.world?.localWorld?.gravity || scene.matter?.world?.engine?.gravity;
  const worldGravity = (gravityObj && gravityObj.y !== undefined && gravityObj.scale !== undefined)
    ? (gravityObj.y * gravityObj.scale * 1000000)
    : 1000;
  const g = bombCfg.gravity !== undefined ? bombCfg.gravity : worldGravity;

  let launchAngle = directionDeg !== undefined ? (directionDeg * Math.PI / 180) : (Math.PI / 2); // default to 90 deg (down)

  // Ballistic aiming solver if shootingType is player
  if (bombCfg.shootingType === 'player') {
    let targetX = null;
    let targetY = null;
    if (target) {
      targetX = target.x;
      targetY = target.y;
    } else if (window.GameLogic?.player) {
      targetX = window.GameLogic.player.x;
      targetY = window.GameLogic.player.y;
    }

    if (targetX !== null && targetY !== null) {
      const dx = targetX - spawnX;
      const dy = targetY - spawnY;
      launchAngle = window.GameLogicHelper.solveBallistic(dx, dy, speed, g);
    }
  }

  // Apply inaccuracy if configured
  const inaccuracy = bombCfg.inaccuracy;
  let finalSpeed = speed;
  if (inaccuracy) {
    if (inaccuracy.angleDeg) {
      const angleOffset = (Math.random() * 2 - 1) * inaccuracy.angleDeg * Math.PI / 180;
      launchAngle += angleOffset;
    }
    if (inaccuracy.speedPct) {
      const speedOffset = (Math.random() * 2 - 1) * inaccuracy.speedPct;
      finalSpeed *= (1 + speedOffset);
    }
  }

  // Set visual properties, flip, and animation
  const isGoingLeft = Math.cos(launchAngle) < 0;
  bomb.setFlipX(isGoingLeft);

  const animKey = bombCfg.animKey;
  if (animKey && scene.anims.exists(animKey)) {
    try { bomb.play(animKey); } catch (e) { }
  } else {
    // Fallback to standard direction-based animations
    const fallbackAnim = isGoingLeft ? 'bomb_rtl' : 'bomb_ltr';
    if (scene.anims.exists(fallbackAnim)) {
      try { bomb.play(fallbackAnim); } catch (e) { }
    }
  }

  // Apply launch velocity to physics body
  if (bomb.body) {
    const vx = (finalSpeed / 60) * Math.cos(launchAngle);
    const vy = (finalSpeed / 60) * Math.sin(launchAngle);
    Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, { x: vx, y: vy });

    // Configure angular velocity if defined (in deg/sec)
    if (bombCfg.angularVelocity !== undefined) {
      const angVelRadPerFrame = (bombCfg.angularVelocity * Math.PI / 180) / 60;
      Phaser.Physics.Matter.Matter.Body.setAngularVelocity(bomb.body, angVelRadPerFrame);
    }
  }

  // Handle lifetime timer
  if (bombCfg.lifetime !== undefined) {
    const currentTimer = scene.time.delayedCall(bombCfg.lifetime, () => {
      if (bomb.active && bomb._lifetimeTimer === currentTimer) {
        bomb._lifetimeTimer = null;
        try { scene.events.emit('bomb:explode', bomb); } catch (e) { }
        try { window.GameLogic._explodeAt(bombCfg, bomb.x, bomb.y, bomb); } catch (e) { }
        try { scene.events.emit('bomb:destroy', bomb); } catch (e) { }
        try { bomb.destroy(); } catch (e) { }
      }
    });
    bomb._lifetimeTimer = currentTimer;
  }

  // Add to active bombs list
  if (window.GameLogic?._activeBombs) {
    window.GameLogic._activeBombs.push(bomb);
  }

  // Emit spawn event
  try { scene.events.emit('bomb:spawn', bomb); } catch (e) { }

  return bomb;
};

window.GameLogic.spawnBomb = window.spawnBomb;
// core/gameLogic.js
// Owns the bombing-run state transitions and single-player level win/lose logic.

window.GameLogic = {

  scene: null,
  player: null,
  arena: null,
  gameOver: false,

  _targets: [],
  _recentExplosions: [],
  _onCollision: null,
  _run: null,   // active bombing run state

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
    this._run = null;
    this.gameOver = false;

    // Initialize the EntityManager
    if (window.EntityManager) {
      window.EntityManager.init(scene);
      if (this.player) {
        window.EntityManager.registerEntity(this.player);
      }
    }

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
    if (window.EntityManager) {
      window.EntityManager.update(delta);
    }
  },

  // Registers a placed building so it can receive blast damage.
  addBuilding(building) {
    building.isBuilding = true;
    if (window.EntityManager) {
      window.EntityManager.registerEntity(building);
    }
  },

  // Resets run state between attempts (keeps the scene alive).
  resetRun() {
    this._destroyActivePlane();
    this._run = null;

    if (window.EntityManager) {
      for (const bomb of [...window.EntityManager.bombs]) {
        if (bomb?.active) { try { bomb.destroy(); } catch (e) { } }
      }
      window.EntityManager.init(this.scene);
      if (this.player) {
        window.EntityManager.registerEntity(this.player);
      }
    }
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
      window.ObjectFactory.destroy(this._run.plane);
      this._run = null;
    }
  },

  _resolveSpawnPoint(planeCfg, spawnLocation) {
    return spawnLocation
      ? { x: spawnLocation.x, y: spawnLocation.y + planeCfg.spawnYOffsetY }
      : { x: 0, y: planeCfg.spawnYOffsetY };
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
      try {
        const cmd = new window.ExplosionCommand(this.scene, {
          x: bombGO.x,
          y: bombGO.y,
          explosiveCfg: bombCfg,
          sourceBomb: bombGO
        });
        cmd.execute();
      } catch (e) { console.error('Error in explosion command:', e); }
      try { this.scene.events.emit('bomb:destroy', bombGO); } catch (e) { console.error('Error emitting bomb:destroy:', e); }
      try { bombGO.destroy(); } catch (e) { console.error('Error destroying bomb:', e); }
    }
  },

  _triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    window.logDebug?.('Game Over!');
  },

  getTarget(x, y) {
    if (window.EntityManager) {
      return window.EntityManager.getNearestTarget(x, y);
    }
    return this.player;
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
    } else if (window.EntityManager && window.EntityManager.getNearestTarget(spawnX, spawnY)) {
      const tgt = window.EntityManager.getNearestTarget(spawnX, spawnY);
      targetX = tgt.x;
      targetY = tgt.y;
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
        try {
          const cmd = new window.ExplosionCommand(scene, {
            x: bomb.x,
            y: bomb.y,
            explosiveCfg: bombCfg,
            sourceBomb: bomb
          });
          cmd.execute();
        } catch (e) { }
        try { scene.events.emit('bomb:destroy', bomb); } catch (e) { }
        try { bomb.destroy(); } catch (e) { }
      }
    });
    bomb._lifetimeTimer = currentTimer;
  }

  // Add to active bombs list
  if (window.EntityManager) {
    window.EntityManager.registerEntity(bomb);
  }

  // Emit spawn event
  try { scene.events.emit('bomb:spawn', bomb); } catch (e) { }

  return bomb;
};

window.GameLogic.spawnBomb = window.spawnBomb;
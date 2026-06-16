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
    const dt = delta / 1000;
    this._processChainExplosions();
    this._updatePlane(dt);
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
  startBombingRun(velocityPxPerSec, spawnLocation, direction) {
    const planeCfg = window.ObjectConfig.internalTypes.plane;
    if (!this._validatePlaneCfg(planeCfg)) return;

    this._destroyActivePlane();

    const spawn = this._resolveSpawnPoint(planeCfg, spawnLocation);
    const plane = this._createPlane(spawn);
    if (!plane) return;

    this._createBlade(planeCfg, plane, direction);
    this._initRunState(planeCfg, plane, velocityPxPerSec, direction);
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
      if (this._run.plane._blade?.active) this._run.plane._blade.destroy();
      this._run.plane.destroy();
    }
  },

  _resolveSpawnPoint(planeCfg, spawnLocation) {
    return spawnLocation
      ? { x: spawnLocation.x, y: spawnLocation.y + planeCfg.spawnYOffsetY }
      : { x: 0, y: planeCfg.spawnYOffsetY };
  },

  _createPlane(spawn) {
    return window.ObjectFactory.createInternal(
      this.scene, 'plane', 0, 0, this.arena, { spawnLocation: spawn }
    );
  },

  // Creates the rotor-blade sprite and attaches it to the plane.
  _createBlade(planeCfg, plane, direction) {
    const blade = this.scene.add.sprite(plane.x, plane.y, 'plane_atlas', 'plane_blade_1');
    if (planeCfg.bladeScale !== undefined) blade.setScale(planeCfg.bladeScale);
    blade.setDepth((plane.depth || 0) + 1);
    blade.setFlipX(direction > 0);
    plane.setFlipX(direction > 0);
    if (this.scene.anims.exists('plane_blades')) blade.play('plane_blades');
    plane._blade = blade;
  },

  // Stores all state needed to advance the run each frame.
  _initRunState(planeCfg, plane, velocityPxPerSec, direction) {
    const { min, max } = planeCfg.bombDropDelayRangeSec;
    const bladeOffsetY = planeCfg.bladeOffsetY * plane.displayHeight;

    this._run = {
      plane,
      bladeOffset: { x: planeCfg.bladeOffsetX * direction, y: bladeOffsetY },
      speed: velocityPxPerSec,
      direction,
      bombTimer: 0,
      bombInterval: min + Math.random() * Math.max(0, max - min),
      exitX: direction > 0 ? 3840 : -1920,
    };
  },


  // ── Plane update ──────────────────────────────────────────────────────────

  _updatePlane(dt) {
    if (!this._run?.plane?.active) return;

    this._movePlane(dt);
    this._syncBlade();
    this._updateBombSpawn(dt);
    this._checkPlaneExit();
  },

  _movePlane(dt) {
    const run = this._run;
    run.plane.x += run.speed * run.direction * dt;
  },

  // Keeps the blade sprite glued to the plane.
  _syncBlade() {
    const { plane, bladeOffset } = this._run;
    if (plane._blade?.active) {
      plane._blade.x = plane.x + bladeOffset.x;
      plane._blade.y = plane.y + bladeOffset.y;
    }
  },

  // Accumulates time and spawns a bomb when the interval elapses.
  _updateBombSpawn(dt) {
    const run = this._run;
    const { min, max } = window.ObjectConfig.internalTypes.plane.bombDropDelayRangeSec;

    run.bombTimer += dt;
    while (run.bombTimer >= run.bombInterval) {
      this._spawnBomb();
      run.bombTimer -= run.bombInterval;
      run.bombInterval = min + Math.random() * Math.max(0, max - min);
    }
  },

  // Destroys the plane once it flies off-screen.
  _checkPlaneExit() {
    const run = this._run;
    const exited = run.direction > 0
      ? run.plane.x >= run.exitX
      : run.plane.x <= run.exitX;

    if (exited) {
      if (run.plane._blade?.active) run.plane._blade.destroy();
      run.plane.destroy();
      try { window.SfxManager?.stopAll?.(); } catch (e) { }
      this._run = null;
    }
  },


  // ── Bomb spawning & update ────────────────────────────────────────────────

  _spawnBomb() {
    if (!this._run?.plane?.active) return;

    const { plane, speed, direction } = this._run;
    const planeCfg = window.ObjectConfig.internalTypes.plane;
    const offsetRange = planeCfg.bombDropOffsetRatioRange;

    const planeHalfW = plane.displayWidth * 0.5;
    const planeHalfH = plane.displayHeight * 0.5;
    const offsetX = (offsetRange.min + Math.random() * Math.max(0, offsetRange.max - offsetRange.min)) * planeHalfW;

    const bombTypeKey = planeCfg.bomb || 'bomb';
    const spawnX = plane.x + offsetX;
    const spawnY = plane.y + planeHalfH;

    const bomb = window.spawnBomb(this.scene, bombTypeKey, spawnX, spawnY, 90, null, plane);
    if (bomb) {
      bomb.setPosition(bomb.x, plane.y + planeHalfH + bomb.displayHeight * 0.5);
    }
  },

  _updateBombs() {
    if (!this._activeBombs.length) return;

    const bottom = this.arena.ARENA_Y + this.arena.ARENA_H;

    for (let i = this._activeBombs.length - 1; i >= 0; i--) {
      const bomb = this._activeBombs[i];

      if (!bomb.active || bomb.y >= bottom) {
        if (bomb.active) {
          const bombCfg = window.ObjectConfig.internalTypes[bomb.objectType] || window.ObjectConfig.internalTypes.bomb;
          try { this.scene.events.emit('bomb:explode', bomb); } catch (e) { }
          try { this._explodeAt(bombCfg, bomb.x, bomb.y, bomb); } catch (e) { }
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
        this._applyTrampolineBounce(trampolineBody, otherBody);
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
      try { this.scene.events.emit('bomb:explode', bombGO); } catch (e) { }
      try { this._explodeAt(bombCfg, bombGO.x, bombGO.y, bombGO); } catch (e) { }
      try { this.scene.events.emit('bomb:destroy', bombGO); } catch (e) { }
      try { bombGO.destroy(); } catch (e) { }
    }
  },

  // Applies bounce velocity to bombs hitting the trampoline, perpendicular to its surface.
  _applyTrampolineBounce(trampolineBody, bombBody) {
    const trampolineGO = trampolineBody.gameObject;
    const trampolineCfg = trampolineGO?.buildingConfig
      ?? window.ObjectConfig.placeableTypes?.trampoline
      ?? window.ObjectConfig.levelTypes?.trampoline;
    if (!trampolineCfg) return;

    const bounceForce = trampolineCfg.bounceForce ?? 28;
    const velocityCap = trampolineCfg.bounceVelocityCap ?? 30;

    // Get the angle of the trampoline surface
    const angle = trampolineBody.angle ?? 0; // in radians

    // Normal vector pointing "upward" from the surface
    const nx = Math.sin(angle);
    const ny = -Math.cos(angle);

    // Tangent vector perpendicular to normal
    const tx = -ny;
    const ty = nx;

    const cv = bombBody.velocity;

    // Decompose current velocity into normal and tangential components
    const vn = cv.x * nx + cv.y * ny;
    const vt = cv.x * tx + cv.y * ty;

    // Reverse inward normal velocity and apply bounce force
    let newVn = Math.max(0, -vn) + bounceForce;
    newVn = Math.min(velocityCap, newVn);

    // Reconstruct velocity from components
    const rx = newVn * nx + vt * tx;
    const ry = newVn * ny + vt * ty;

    Phaser.Physics.Matter.Matter.Body.setVelocity(bombBody, {
      x: rx,
      y: ry,
    });

    try { window.SfxManager?.playBounce?.(); } catch (e) { }
  },


  // ── Detonation ────────────────────────────────────────────────────────────

  // Shows VFX, collects nearby bodies, and applies knockback + damage.
  _explodeAt(explosiveCfg, x, y, sourceBomb) {
    const explosionCfg = explosiveCfg.explosion;
    const radius = this._blastRadiusPx(explosionCfg);
    if (!radius) return;

    if (window.DEBUG) {
      if (explosiveCfg.blastForce == null) console.error('[GameLogic._explodeAt] blastForce is not defined');
      if (explosiveCfg.blastMaxDamage == null) console.error('[GameLogic._explodeAt] blastMaxDamage is not defined');
    }

    this._spawnExplosionVFX(explosionCfg, x, y);
    this._drawDebugBlastRadius(x, y, radius);

    const bodies = this._collectBlastBodies(x, y, radius, sourceBomb);
    for (const body of bodies) {
      this._applyBlastEffects(body, x, y, radius, explosiveCfg.blastForce, explosiveCfg.blastMaxDamage);
    }
  },

  // Plays the explosion animation sprite at the blast origin.
  _spawnExplosionVFX(explosionCfg, x, y) {
    const { animKey, scale } = explosionCfg;
    const anim = this.scene.anims.get(animKey);
    const firstFrame = anim.frames[0].frame;

    const explosion = this.scene.add.sprite(x, y, firstFrame.texture.key, firstFrame.name);
    explosion.setScale(scale);
    try { window.SfxManager?.playExplosion?.(); } catch (e) { }
    window.SpriteFactory.playAnimation(explosion, animKey);
  },

  // In debug mode, draws a red circle showing the blast radius.
  _drawDebugBlastRadius(x, y, radius) {
    if (!window.DEBUG) return;
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0xff0000, 1);
    g.strokeCircle(x, y, radius);
    g.setDepth(500);
    this.scene.time.delayedCall(600, () => { if (g.active) g.destroy(); });
  },

  // Returns all physics bodies whose AABB overlaps the blast square.
  _collectBlastBodies(x, y, radius, sourceBomb) {
    return (this.scene.matter.intersectRect(
      x - radius, y - radius, radius * 2, radius * 2
    ) || []).filter((body) => {
      const obj = body.gameObject;
      if (!obj || obj._dying || !obj.active || !body.bounds) return false;

      // If it is a bomb, only include it if it has a different owner than the source bomb
      if (body.label === 'bomb' || obj.isBomb) {
        if (sourceBomb) {
          const sourceOwner = sourceBomb.owner;
          const targetOwner = obj.owner;
          if (sourceOwner && targetOwner && sourceOwner === targetOwner) {
            return false; // same owner, ignore
          }
        }
        return true;
      }

      // Non-bombs are always affected
      return true;
    });
  },

  // Calculates falloff for one body, then applies knockback and damage.
  _applyBlastEffects(body, x, y, radius, blastForce, blastMaxDmg) {
    const falloff = this._calcFalloff(x, y, body, radius);
    if (falloff <= 0) return;

    this._applyKnockback(body, falloff, x, y, blastForce);
    this._applyDamage(body.gameObject, falloff, blastMaxDmg);
  },


  // ── Blast maths ───────────────────────────────────────────────────────────

  // Returns the blast radius in pixels derived from the largest animation frame.
  _blastRadiusPx(explosionCfg) {
    if (!explosionCfg?.animKey) return null;

    const { animKey, scale, blastScale } = explosionCfg;
    if (!this.scene.anims.exists(animKey)) return null;
    if (scale == null) { console.error('[GameLogic._blastRadiusPx] explosionCfg.scale is not defined'); return null; }
    if (blastScale == null) { console.error('[GameLogic._blastRadiusPx] explosionCfg.blastScale is not defined'); return null; }

    const anim = this.scene.anims.get(animKey);
    let maxRawDim = 0;
    for (const f of anim.frames) {
      maxRawDim = Math.max(maxRawDim,
        f.frame.realWidth || f.frame.width || 0,
        f.frame.realHeight || f.frame.height || 0
      );
    }
    if (maxRawDim === 0) return null;

    return ((maxRawDim * scale) / 2) * blastScale;
  },

  // Returns falloff in [0, 1] based on the nearest point on the body's AABB.
  // Large objects partially inside the blast radius take appropriate damage.
  _calcFalloff(x, y, body, radius) {
    const closest = this._closestPointOnAABB(x, y, body);
    const dx = closest.x - x;
    const dy = closest.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= radius) return 0;
    return 1 - (dist / radius);
  },

  // Returns the nearest point on a body's axis-aligned bounding box to (px, py).
  _closestPointOnAABB(px, py, body) {
    const { min, max } = body.bounds;
    return {
      x: Math.max(min.x, Math.min(px, max.x)),
      y: Math.max(min.y, Math.min(py, max.y)),
    };
  },


  // ── Damage & knockback ────────────────────────────────────────────────────

  // Pushes a dynamic physics body away from the blast origin.
  _applyKnockback(body, falloff, x, y, blastForce) {
    if (body.isStatic) return;

    const mass = body.mass;
    if (!mass) { console.error('[GameLogic._applyKnockback] body.mass is missing or zero'); return; }

    const dx = body.position.x - x;
    const dy = body.position.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : -1;

    const deltaV = (blastForce * falloff) / mass;
    const cv = body.velocity;

    Phaser.Physics.Matter.Matter.Body.setVelocity(body, {
      x: cv.x + nx * deltaV,
      y: cv.y + ny * deltaV,
    });
  },

  // Reduces HP on the player or a building; triggers death if HP hits 0.
  _applyDamage(obj, falloff, blastMaxDmg) {
    const damage = Math.round(blastMaxDmg * falloff);
    if (damage <= 0) return;

    if (obj.isBomb) {
      if (obj.active && !obj._dying) {
        obj._dying = true;
        const bombCfg = window.ObjectConfig.internalTypes[obj.objectType] || window.ObjectConfig.internalTypes.bomb;
        try { this.scene.events.emit('bomb:explode', obj); } catch (e) { }
        try { this.scene.events.emit('bomb:destroy', obj); } catch (e) { }
        this._chainExplosionQueue.push({ cfg: bombCfg, x: obj.x, y: obj.y, sourceBomb: obj });
        try { obj.destroy(); } catch (e) { }
      }
      return;
    }

    if (obj === this.player) {
      this._damagePlayer(damage);
    } else if ((obj.isBuilding || obj.buildingConfig) && typeof obj.takeDamage === 'function') {
      const died = obj.takeDamage(damage);
      if (died) this._handleBuildingDeath(obj);
    }
  },

  _damagePlayer(amount) {
    if (this.gameOver || !this.player) return;
    
    // Check if shield is active and still valid
    if (this.player._shielded && this.player._shieldEnd && Date.now() < this.player._shieldEnd) {
      // Shield is active - reduce damage by 50% or block depending on design
      amount = Math.ceil(amount * 0.5);  // Shield reduces damage by half
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
    const cfg = obj.buildingConfig;
    const willChainBlast = cfg?.onDeath === 'explode' && cfg?.explosion;

    obj._dying = true;

    try { window.BuildingManager.destroyBuilding(obj); } catch (e) { }
    this.buildings = this.buildings.filter((b) => b !== obj);

    if (willChainBlast && this.scene) {
      this._chainExplosionQueue.push({ cfg, x: savedX, y: savedY });
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
};

window.spawnBomb = function (scene, bombTypeKey, spawnX, spawnY, directionDeg, target, owner) {
  const bombCfg = window.ObjectConfig.internalTypes[bombTypeKey];
  if (!bombCfg) {
    console.error(`spawnBomb: unknown bomb type key "${bombTypeKey}"`);
    return null;
  }

  // Check pool first
  let bomb = window.GameLogicHelper.getPooledBomb(scene, bombTypeKey);

  if (!bomb) {
    const arena = window.GameLogic?.arena;
    bomb = window.ObjectFactory.createInternal(scene, bombTypeKey, spawnX, spawnY, arena);
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
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
  _run: null,        // active bombing run state
  _activeBombs: [],
  _explosionWaveQueue: [],          // chain-explosion queue, flushed each frame

  // ── Initialisation ────────────────────────────────────────────────────────

  init(scene, player, arena) {
    this._detachCollisionListener();

    this.scene = scene;
    this.player = player;
    this.arena = arena;
    this.buildings = [];
    this._run = null;
    this._activeBombs = [];
    this._explosionWaveQueue = [];
    this.gameOver = false;

    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    if (this.player) this.player.health = maxHp;

    this._attachCollisionListener();
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
  },

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(delta) {
    const dt = delta / 1000;
    this._flushExplosionWave();
    this._updatePlane(dt);
    this._updateBombs();
  },

  // ── Bombing run entry point ───────────────────────────────────────────────

  // Starts a new bombing run. Called by LevelManager for each wave.
  startBombingRun(velocityPxPerSec, spawnLocation, direction) {
    const planeCfg = window.ObjectConfig.internalTypes.plane;
    if (!this._validatePlaneCfg(planeCfg)) return;

    this._destroyActivePlane();

    const spawn = this._resolveSpawnPoint(planeCfg, spawnLocation);
    const plane = this._createPlane(spawn);
    if (!plane) return;

    const blade = this._createBlade(plane, direction);
    this._initRunState(planeCfg, plane, blade, velocityPxPerSec, direction);
  },

  // Validates that all required plane config fields exist.
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
    const plane = window.ObjectFactory.createInternal(
      this.scene, 'plane', 0, 0, this.arena, { spawnLocation: spawn }
    );
    return plane ?? null;
  },

  // Creates the rotor-blade sprite that floats above the plane.
  _createBlade(plane, direction) {
    const blade = this.scene.add.sprite(plane.x, plane.y, 'plane_atlas', 'plane_blade_1');
    blade.setDepth((plane.depth || 0) + 1);
    blade.setFlipX(direction > 0);
    if (plane?.setFlipX) plane.setFlipX(direction > 0);
    if (this.scene.anims?.exists?.('plane_blades')) blade.play('plane_blades');
    plane._blade = blade;
    return blade;
  },

  // Stores all state needed to advance the run each frame.
  _initRunState(planeCfg, plane, blade, velocityPxPerSec, direction) {
    const { min, max } = planeCfg.bombDropDelayRangeSec;
    const bladeOffsetY = planeCfg.bladeOffsetY * plane.displayHeight;

    this._run = {
      plane,
      bladeOffset: { x: planeCfg.bladeOffsetX, y: bladeOffsetY },
      speed: velocityPxPerSec,
      direction,
      planeVelocity: { x: velocityPxPerSec * direction, y: 0 },
      spawnAccumulator: 0,
      nextBombDelay: min + Math.random() * Math.max(0, max - min),
      bombOffsetY: planeCfg.bombDropYOffsetY,
      endX: direction > 0 ? 3840 : -1920,
    };
  },

  // ── Plane update (called each frame) ─────────────────────────────────────

  _updatePlane(dt) {
    if (!this._run?.plane?.active) return;

    this._movePlane(dt);
    this._syncBlade();
    this._tickBombDrop(dt);
    this._checkPlaneExit();
  },

  // Moves the plane horizontally and records its velocity for bomb inheritance.
  _movePlane(dt) {
    const run = this._run;
    const prevX = run.plane.x;
    const prevY = run.plane.y;

    run.plane.x += run.speed * run.direction * dt;

    const safeDt = dt > 0 ? dt : 1 / 60;
    run.planeVelocity.x = (run.plane.x - prevX) / safeDt;
    run.planeVelocity.y = (run.plane.y - prevY) / safeDt;
  },

  // Keeps the blade sprite glued to the plane.
  _syncBlade() {
    const { plane, bladeOffset } = this._run;
    if (plane._blade?.active) {
      plane._blade.x = plane.x + bladeOffset.x;
      plane._blade.y = plane.y + bladeOffset.y;
    }
  },

  // Accumulates time and spawns a bomb when the delay elapses.
  _tickBombDrop(dt) {
    const run = this._run;
    const { min, max } = window.ObjectConfig.internalTypes.plane.bombDropDelayRangeSec;

    run.spawnAccumulator += dt;
    while (run.spawnAccumulator >= run.nextBombDelay) {
      this._spawnBomb();
      run.spawnAccumulator -= run.nextBombDelay;
      run.nextBombDelay = min + Math.random() * Math.max(0, max - min);
    }
  },

  // Destroys the plane once it flies off-screen.
  _checkPlaneExit() {
    const run = this._run;
    const reachedEnd = run.direction > 0
      ? run.plane.x >= run.endX
      : run.plane.x <= run.endX;

    if (reachedEnd) {
      if (run.plane._blade?.active) run.plane._blade.destroy();
      run.plane.destroy();
      this._run = null;
    }
  },

  // ── Bomb spawning ─────────────────────────────────────────────────────────

  _spawnBomb() {
    if (!this._run?.plane?.active) return;

    const { plane, planeVelocity } = this._run;
    const planeCfg = window.ObjectConfig.internalTypes.plane;
    const offsetRange = planeCfg.bombDropOffsetRatioRange;

    const planeHalfW = plane.displayWidth * 0.5;
    const planeHalfH = plane.displayHeight * 0.5;
    const offsetX = (offsetRange.min + Math.random() * Math.max(0, offsetRange.max - offsetRange.min)) * planeHalfW;

    const bomb = window.ObjectFactory.createInternal(
      this.scene, 'bomb', plane.x + offsetX, plane.y + planeHalfH, this.arena
    );
    if (!bomb) return;

    bomb.y = plane.y + planeHalfH + bomb.displayHeight * 0.5;
    if (bomb?.setFlipX) bomb.setFlipX(this._run.direction < 0);

    Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, {
      x: 0,
      y: Math.abs(planeVelocity.x) / 60,
    });

    this._activeBombs.push(bomb);
  },

  // ── Bomb update (called each frame) ──────────────────────────────────────

  _updateBombs() {
    if (!this._activeBombs.length) return;

    const bottom = this.arena.ARENA_Y + this.arena.ARENA_H;
    const bombCfg = window.ObjectConfig.internalTypes.bomb;

    for (let i = this._activeBombs.length - 1; i >= 0; i--) {
      const bomb = this._activeBombs[i];

      if (!bomb.active || bomb.y >= bottom) {
        if (bomb.active) {
          try { this._detonateAt(bombCfg, bomb.x, bomb.y); } catch (e) { }
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

    const bombBody = bodyA.label === 'bomb' ? bodyA : bodyB.label === 'bomb' ? bodyB : null;
    if (!bombBody) return;

    const otherBody = bombBody === bodyA ? bodyB : bodyA;
    if (otherBody.label === 'bomb') return;

    const bombGO = bombBody.gameObject;
    if (!bombGO?.active) return;

    try { this._detonateAt(window.ObjectConfig.internalTypes.bomb, bombGO.x, bombGO.y); } catch (e) { }
    try { bombGO.destroy(); } catch (e) { }
  },

  // ── Detonation ────────────────────────────────────────────────────────────

  // Main detonation entry point: shows the VFX, collects nearby bodies,
  // and applies knockback + damage to each one.
  _detonateAt(bombCfg, bombX, bombY) {
    const explosionCfg = bombCfg.explosion;
    const radius = this._blastRadiusPx(explosionCfg);
    if (!radius) return;

    this._validateDetonationCfg(bombCfg, explosionCfg);

    this._spawnExplosionVFX(explosionCfg, bombX, bombY);
    this._drawDebugBlastRadius(bombX, bombY, radius);

    const bodies = this._collectBlastBodies(bombX, bombY, radius);
    for (const body of bodies) {
      this._applyBlastToBody(body, bombX, bombY, radius, bombCfg.blastForce, bombCfg.blastMaxDamage);
    }
  },

  _validateDetonationCfg(bombCfg, explosionCfg) {
    if (bombCfg.blastForce == null) console.error('[GameLogic._detonateAt] bombCfg.blastForce is not defined');
    if (bombCfg.blastMaxDamage == null) console.error('[GameLogic._detonateAt] bombCfg.blastMaxDamage is not defined');
    if (explosionCfg.scale == null) console.error('[GameLogic._detonateAt] explosionCfg.scale is not defined');
  },

  // Plays the explosion animation sprite at the blast origin.
  _spawnExplosionVFX(explosionCfg, bombX, bombY) {
    const { animKey, scale } = explosionCfg;
    const anim = this.scene.anims.get(animKey);
    const firstFrame = anim.frames[0].frame;

    const explosion = this.scene.add.sprite(bombX, bombY, firstFrame.texture.key, firstFrame.name);
    explosion.setScale(scale);
    window.SpriteFactory.playAnimation(explosion, animKey);
  },

  // In debug mode draws a red circle showing the blast radius.
  _drawDebugBlastRadius(bombX, bombY, radius) {
    if (!window.DEBUG) return;
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0xff0000, 1);
    g.strokeCircle(bombX, bombY, radius);
    g.setDepth(500);
    this.scene.time.delayedCall(600, () => { if (g.active) g.destroy(); });
  },

  // Returns all physics bodies whose AABB overlaps the blast square.
  _collectBlastBodies(bombX, bombY, radius) {
    return (this.scene.matter.intersectRect(
      bombX - radius, bombY - radius, radius * 2, radius * 2
    ) || []).filter((body) => {
      const obj = body.gameObject;
      return obj && !obj.isBomb && body.label !== 'bomb' && !obj._dying && obj.active && body.bounds;
    });
  },

  // Calculates falloff for one body, then applies knockback and damage.
  _applyBlastToBody(body, bombX, bombY, radius, blastForce, blastMaxDmg) {
    const falloff = this._calcFalloff(bombX, bombY, body, radius);
    if (falloff <= 0) return;

    this._applyKnockback(body, falloff, bombX, bombY, blastForce);
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
      maxRawDim = Math.max(maxRawDim, f.frame.realWidth || f.frame.width || 0,
        f.frame.realHeight || f.frame.height || 0);
    }
    if (maxRawDim === 0) return null;

    return ((maxRawDim * scale) / 2) * blastScale;
  },

  // Returns falloff in [0, 1] using the nearest point on the body's AABB,
  // so large objects partially inside the blast radius take appropriate damage.
  _calcFalloff(bombX, bombY, body, radius) {
    const closest = this._closestPointOnAABB(bombX, bombY, body);
    const dx = closest.x - bombX;
    const dy = closest.y - bombY;
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
  _applyKnockback(body, falloff, bombX, bombY, blastForce) {
    if (body.isStatic) return;

    const mass = body.mass;
    if (!mass) { console.error('[GameLogic._applyKnockback] body.mass is missing or zero'); return; }

    const dx = body.position.x - bombX;
    const dy = body.position.y - bombY;
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

    if (obj === this.player) {
      this._damagePlayer(damage);
    } else if ((obj.isBuilding || obj.buildingConfig) && typeof obj.takeDamage === 'function') {
      const died = obj.takeDamage(damage);
      if (died) this._onBuildingDied(obj);
    }
  },

  _damagePlayer(amount) {
    if (this.gameOver || !this.player) return;
    this.player.health = Math.max(0, (this.player.health || 0) - amount);
    if (this.player.health <= 0) this._endGame(false);
  },

  // Removes a building that reached 0 HP and optionally queues a chain explosion.
  _onBuildingDied(obj) {
    const savedX = obj.x;
    const savedY = obj.y;
    const cfg = obj.buildingConfig;
    const willChainBlast = cfg?.onDeath === 'explode' && cfg?.explosion;

    obj._dying = true;

    try { window.BuildingManager.destroyBuilding(obj); } catch (e) { }
    this.buildings = this.buildings.filter((b) => b !== obj);

    if (willChainBlast && this.scene) {
      this._explosionWaveQueue.push({ cfg, x: savedX, y: savedY });
    }
  },

  // Detonates all queued chain explosions accumulated during this frame.
  _flushExplosionWave() {
    if (!this._explosionWaveQueue.length) return;

    const wave = this._explosionWaveQueue;
    this._explosionWaveQueue = [];

    for (const exp of wave) {
      try { this._detonateAt(exp.cfg, exp.x, exp.y); } catch (e) { }
    }
  },

  // ── Public helpers ────────────────────────────────────────────────────────

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
  },

  _endGame(won) {
    if (this.gameOver) return;
    this.gameOver = true;
    window.logDebug?.(won ? 'Level Complete!' : 'Game Over!');
  },
};
window.GameLogic = {

  scene:        null,
  player:       null,
  arena:        null,
  buildings:    [],
  _onCollision: null,
  _run:         null,
  _activeBombs: [],
  _explosionWaveQueue: [],
  gameOver: false,

  init(scene, player, arena) {
    if (this.scene && this._onCollision && this.scene.matter?.world) {
      try { this.scene.matter.world.off('collisionstart', this._onCollision); } catch (e) {}
    }

    this.scene               = scene;
    this.player              = player;
    this.arena               = arena;
    this.buildings           = [];
    this._run                = null;
    this._activeBombs        = [];
    this._explosionWaveQueue = [];
    this.gameOver            = false;

    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    if (this.player) this.player.health = maxHp;

    this._onCollision = (event) => {
      event.pairs.forEach((pair) => this._handleCollision(pair.bodyA, pair.bodyB));
    };
    this.scene.matter.world.on('collisionstart', this._onCollision);
  },

  startBombingRun(velocityPxPerSec, spawnLocation, direction) {
    const planeCfg = window.ObjectConfig.internalTypes.plane;

    const spawnOffsetY = planeCfg.spawnYOffsetY;
    if (spawnOffsetY == null) { console.error('[GameLogic.startBombingRun] planeCfg.spawnYOffsetY is not defined'); return; }

    const bladeOffsetX = planeCfg.bladeOffsetX;
    const bladeOffsetY = planeCfg.bladeOffsetY;
    if (bladeOffsetX == null) { console.error('[GameLogic.startBombingRun] planeCfg.bladeOffsetX is not defined'); return; }
    if (bladeOffsetY == null) { console.error('[GameLogic.startBombingRun] planeCfg.bladeOffsetY is not defined'); return; }

    const bombDropYOffsetY = planeCfg.bombDropYOffsetY;
    if (bombDropYOffsetY == null) { console.error('[GameLogic.startBombingRun] planeCfg.bombDropYOffsetY is not defined'); return; }

    const spawn = spawnLocation
      ? { x: spawnLocation.x, y: spawnLocation.y + spawnOffsetY }
      : { x: 0, y: spawnOffsetY };

    if (this._run?.plane?.active) {
      if (this._run.plane._blade?.active) this._run.plane._blade.destroy();
      this._run.plane.destroy();
    }

    const plane = window.ObjectFactory.createInternal(
      this.scene, 'plane', 0, 0, this.arena, { spawnLocation: spawn }
    );
    if (!plane) return;

    // — Plane display size (asset dimensions x scale) —
    const planeW = plane.displayWidth;
    const planeH = plane.displayHeight;

    if (plane?.setFlipX) plane.setFlipX(direction > 0);

    const blade = this.scene.add.sprite(plane.x, plane.y, 'plane_atlas', 'row04_01');
    blade.setDepth((plane.depth || 0) + 1);
    blade.setFlipX(direction > 0);
    if (this.scene.anims?.exists?.('plane_blades')) blade.play('plane_blades');
    plane._blade = blade;

    // bladeOffsetY is a ratio of the plane's rendered height
    const bladeOffset = { x: bladeOffsetX, y: bladeOffsetY * planeH };

    const range = planeCfg.bombDropDelayRangeSec;

    this._run = {
      plane,
      bladeOffset,
      speed:            velocityPxPerSec,
      direction,
      planeVelocity:    { x: velocityPxPerSec * direction, y: 0 },
      spawnAccumulator: 0,
      nextBombDelay:    range.min + Math.random() * Math.max(0, range.max - range.min),
      bombOffsetY:      bombDropYOffsetY,
      endX:             direction > 0 ? 3840 : -1920,
    };
  },

  update(delta) {
    const dt = delta / 1000;
    this._flushExplosionWave();
    this._updatePlane(dt);
    this._updateBombs();
  },

  // Returns the blast radius in px from an explosion sub-config, or null if it
  // cannot be resolved (missing anim, zero-dimension frames, etc.).
  // explosionCfg = the { animKey, scale, blastScale, … } object directly.
  _blastRadiusPx(explosionCfg) {
    if (!explosionCfg?.animKey) return null;

    const { animKey } = explosionCfg;
    if (!this.scene.anims.exists(animKey)) return null;

    const displayScale = explosionCfg.scale;
    if (displayScale == null) { console.error('[GameLogic._blastRadiusPx] explosionCfg.scale is not defined'); return null; }

    const blastScale = explosionCfg.blastScale;
    if (blastScale == null) { console.error('[GameLogic._blastRadiusPx] explosionCfg.blastScale is not defined'); return null; }

    const anim = this.scene.anims.get(animKey);
    let maxRawDim = 0;
    for (const f of anim.frames) {
      const w = f.frame.realWidth  || f.frame.width  || 0;
      const h = f.frame.realHeight || f.frame.height || 0;
      maxRawDim = Math.max(maxRawDim, w, h);
    }
    if (maxRawDim === 0) return null;

    // — Explosion display size (largest raw frame dimension x display scale) —
    const renderedRadius = (maxRawDim * displayScale) / 2;
    return renderedRadius * blastScale;
  },

  // Pure falloff: 1 at ground-zero, 0 at the edge of the blast radius.
  // Returns 0 when the target is outside the radius or at the exact origin.
  _calcFalloff(bombX, bombY, targetX, targetY, radius) {
    const dx   = targetX - bombX;
    const dy   = targetY - bombY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= radius) return 0;
    // dist === 0 means dead-centre — full force, direction resolved later
    return 1 - (dist / radius);
  },

  _updatePlane(dt) {
    if (!this._run?.plane?.active) return;

    const run   = this._run;
    const prevX = run.plane.x;
    const prevY = run.plane.y;

    run.plane.x += run.speed * run.direction * dt;

    if (run.plane._blade?.active) {
      const off = run.bladeOffset;
      run.plane._blade.x = run.plane.x + off.x;
      run.plane._blade.y = run.plane.y + off.y;
    }

    const safeDt        = dt > 0 ? dt : 1 / 60;
    run.planeVelocity.x = (run.plane.x - prevX) / safeDt;
    run.planeVelocity.y = (run.plane.y - prevY) / safeDt;

    run.spawnAccumulator += dt;
    const planeCfg    = window.ObjectConfig.internalTypes.plane;
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
      if (run.plane._blade?.active) run.plane._blade.destroy();
      run.plane.destroy();
      this._run = null;
    }
  },

  _spawnBomb() {
    if (!this._run?.plane?.active) return;

    const { plane, planeVelocity } = this._run;
    const planeCfg    = window.ObjectConfig.internalTypes.plane;
    const offsetRange = planeCfg.bombDropOffsetRatioRange;

    // — Plane display size (asset dimensions x scale) —
    const planeHalfW = plane.displayWidth  * 0.5;
    const planeHalfH = plane.displayHeight * 0.5;

    const offsetX = (offsetRange.min + Math.random() * Math.max(0, offsetRange.max - offsetRange.min)) * planeHalfW;

    const bomb = window.ObjectFactory.createInternal(
      this.scene, 'bomb', plane.x + offsetX, plane.y + planeHalfH, this.arena
    );
    if (!bomb) return;

    // — Bomb display size (asset dimensions x scale) —
    const bombHalfH = bomb.displayHeight * 0.5;

    bomb.y = plane.y + planeHalfH + bombHalfH;

    if (bomb?.setFlipX) bomb.setFlipX(this._run.direction < 0);

    Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, {
      x: 0,
      y: Math.abs(planeVelocity.x) / 60,
    });

    this._activeBombs.push(bomb);
  },

  _updateBombs() {
    if (!this._activeBombs.length) return;

    const bottom  = this.arena.ARENA_Y + this.arena.ARENA_H;
    const bombCfg = window.ObjectConfig.internalTypes.bomb;

    for (let i = this._activeBombs.length - 1; i >= 0; i--) {
      const bomb = this._activeBombs[i];

      if (!bomb.active || bomb.y >= bottom) {
        if (bomb.active) {
          try { this._detonateAt(bombCfg, bomb.x, bomb.y); } catch (e) {}
          try { bomb.destroy(); } catch (e) {}
        }
        this._activeBombs.splice(i, 1);
      }
    }
  },

  _handleCollision(bodyA, bodyB) {
    if (!bodyA || !bodyB) return;

    const bombBody = bodyA.label === 'bomb' ? bodyA : bodyB.label === 'bomb' ? bodyB : null;
    if (!bombBody) return;

    const otherBody = bombBody === bodyA ? bodyB : bodyA;
    if (otherBody.label === 'bomb') return;

    const bombGO = bombBody.gameObject;
    if (!bombGO?.active) return;

    const bombCfg = window.ObjectConfig.internalTypes.bomb;
    try { this._detonateAt(bombCfg, bombGO.x, bombGO.y); } catch (e) {}
    try { bombGO.destroy(); } catch (e) {}
  },

  // Main detonation entry point.
  // bombCfg  – the full config object (e.g. ObjectConfig.internalTypes.bomb or a
  //            levelType cfg).  Must have .explosion, .blastForce, .blastMaxDamage.
  // bombX/Y  – world position of the detonation centre.
  _detonateAt(bombCfg, bombX, bombY) {
    const explosionCfg = bombCfg.explosion;
    const radius       = this._blastRadiusPx(explosionCfg);
    if (!radius) return;

    const blastForce  = bombCfg.blastForce;
    const blastMaxDmg = bombCfg.blastMaxDamage;
    if (blastForce  == null) { console.error('[GameLogic._detonateAt] bombCfg.blastForce is not defined');     return; }
    if (blastMaxDmg == null) { console.error('[GameLogic._detonateAt] bombCfg.blastMaxDamage is not defined'); return; }

    const explosionScale = explosionCfg.scale;
    if (explosionScale == null) { console.error('[GameLogic._detonateAt] explosionCfg.scale is not defined'); return; }

    // — Visual —
    const animKey    = explosionCfg.animKey;
    const anim       = this.scene.anims.get(animKey);
    const firstFrame = anim.frames[0].frame;
    const explosion  = this.scene.add.sprite(bombX, bombY, firstFrame.textureKey, firstFrame.name);
    explosion.setDepth(100);
    // — Explosion display size (asset dimensions x scale) —
    explosion.setScale(explosionScale);
    window.SpriteFactory.playAnimation(explosion, animKey);

    // — Debug radius ring —
    if (window.DEBUG) {
      const g = this.scene.add.graphics();
      g.lineStyle(2, 0xff0000, 1);
      g.strokeCircle(bombX, bombY, radius);
      g.setDepth(500);
      this.scene.time.delayedCall(600, () => { if (g.active) g.destroy(); });
    }

    // — Collect all physics bodies inside the bounding square —
    const bodies = this.scene.matter.intersectRect(
      bombX - radius, bombY - radius, radius * 2, radius * 2
    ) || [];

    for (const body of bodies) {
      const obj = body.gameObject;
      if (!obj || obj.isBomb || body.label === 'bomb') continue;
      if (obj._dying || !obj.active)                   continue;
      if (!body.position)                               continue;

      const falloff = this._calcFalloff(bombX, bombY, body.position.x, body.position.y, radius);
      if (falloff <= 0) continue;

      this._applyKnockback(body, falloff, bombX, bombY, blastForce);
      this._applyDamage(obj, falloff, blastMaxDmg);
    }
  },

  // Pushes a physics body away from the blast origin, scaled by falloff.
  // Does nothing for static bodies or bombs.
  _applyKnockback(body, falloff, bombX, bombY, blastForce) {
    if (body.isStatic) return;

    const mass = body.mass;
    if (!mass) { console.error('[GameLogic._applyKnockback] body.mass is missing or zero'); return; }

    const dx   = body.position.x - bombX;
    const dy   = body.position.y - bombY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // At dead-centre (dist === 0) push straight up so the object is not stuck.
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : -1;

    const deltaV = (blastForce * falloff) / mass;
    const cv     = body.velocity;

    Phaser.Physics.Matter.Matter.Body.setVelocity(body, {
      x: cv.x + nx * deltaV,
      y: cv.y + ny * deltaV,
    });
  },

  // Applies damage to obj (player or building), triggering death if HP reaches 0.
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

  _onBuildingDied(obj) {
    const savedX         = obj.x;
    const savedY         = obj.y;
    const cfg            = obj.buildingConfig;
    const willChainBlast = cfg?.onDeath === 'explode' && cfg?.explosion;

    obj._dying = true;

    try { window.BuildingManager.destroyBuilding(obj); } catch (e) {}
    this.buildings = this.buildings.filter((b) => b !== obj);

    if (willChainBlast && this.scene) {
      // Queue the full cfg so _detonateAt can derive everything it needs.
      this._explosionWaveQueue.push({ cfg, x: savedX, y: savedY });
    }
  },

  _flushExplosionWave() {
    if (!this._explosionWaveQueue.length) return;

    const wave               = this._explosionWaveQueue;
    this._explosionWaveQueue = [];

    for (const exp of wave) {
      try { this._detonateAt(exp.cfg, exp.x, exp.y); } catch (e) {}
    }
  },

  addBuilding(building) {
    this.buildings.push(building);
    building.isBuilding = true;
  },

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
      if (bomb?.active) { try { bomb.destroy(); } catch (e) {} }
    }
    this._activeBombs = [];
    this.gameOver     = false;

    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    if (this.player) this.player.health = maxHp;
  },
};
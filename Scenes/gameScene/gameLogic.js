// gameLogic.js
// Central coordinator for all gameplay rules.
// Owns: collision handling, blast physics, bombing-run lifecycle,
//       bomb spawning, per-frame update, and game-over detection.
// Does not own: scene setup, UI, building config, or drag logic.
//
// Player health lives on the player object itself (set by ObjectFactory
// via cfg.health). GameLogic reads and mutates player.health directly.
//
// All fixed px values are authored at 1920×1080 — Phaser Scale.FIT handles display scaling.

window.GameLogic = {

  scene:        null,
  player:       null,
  arena:        null,
  buildings:    [],
  _onCollision: null,

  // Active bombing run — null when no run is in progress.
  _run:         null,

  // Live bomb list, pruned each frame.
  _activeBombs: [],

  // Cascading chain-explosion wave queue.
  //
  // When a crate dies, its blast is pushed here instead of firing immediately.
  // Each frame, _flushExplosionWave() snapshots the queue, clears it, then fires
  // every blast in the snapshot.  Those blasts may kill more crates, whose blasts
  // land in the (now-empty) queue.  Next frame the same thing repeats until the
  // queue stays empty — meaning the full chain has resolved.
  //
  // One frame of separation between each wave guarantees Matter.js has fully
  // removed the previous wave's bodies before the next blast queries the world.
  //
  // Entry shape: { x, y, radius, force, maxDamage, explosionCfg }
  _explosionWaveQueue: [],

  // Set to true by _endGame(); checked by LevelManager to trigger overlays.
  gameOver: false,

  // Tears down any previous collision listener, resets all state, then rebinds
  // the collision handler and restores the player to full health.
  init(scene, player, arena) {
    if (this.scene && this._onCollision && this.scene.matter?.world) {
      try { this.scene.matter.world.off('collisionstart', this._onCollision); } catch (e) {
        window.logDebug?.('[GameLogic.init] collision off failed', e);
      }
    }

    this.scene        = scene;
    this.player       = player;
    this.arena        = arena;
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

  // Spawns a plane and begins a bombing run.
  startBombingRun(velocityPxPerSec, spawnLocation, direction) {
    const planeCfg     = window.ObjectConfig.internalTypes.plane;
    const spawnOffsetY = planeCfg.spawnYOffsetY ?? 0;
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

    if (plane?.setFlipX) plane.setFlipX(direction > 0);

    const blade = this.scene.add.sprite(plane.x, plane.y, 'plane_atlas', 'row04_01');
    blade.setDepth((plane.depth || 0) + 1);
    blade.setFlipX(direction > 0);
    if (this.scene.anims?.exists?.('plane_blades')) blade.play('plane_blades');
    plane._blade = blade;

    const bladeOffset = { x: 9, y: -plane.displayHeight * 0.50 };
    const range       = planeCfg.bombDropDelayRangeSec;

    this._run = {
      plane,
      bladeOffset,
      speed:            velocityPxPerSec,
      direction,
      planeVelocity:    { x: velocityPxPerSec * direction, y: 0 },
      spawnAccumulator: 0,
      nextBombDelay:    range.min + Math.random() * Math.max(0, range.max - range.min),
      bombOffsetY:      planeCfg.bombDropYOffsetY ?? 39,
      endX:             direction > 0 ? 3840 : -1920,
    };
  },

  // Called every frame by GameScene.
  update(delta) {
    const dt = delta / 1000;
    // Fire the next wave of chain explosions (if any).  One wave per frame keeps
    // the physics world clean between each blast — no stale body reads.
    this._flushExplosionWave();
    this._updatePlane(dt);
    this._updateBombs();
  },

  // Returns bomb blast radius in px, derived from the explosion config embedded in bombCfg.
  // bombCfg.explosion holds animKey, scale, blastScale.
  // Returns null on failure — callers must check before using.
  _blastRadiusPx(bombCfg) {
    if (!bombCfg?.explosion) {
      console.error('[GameLogic._blastRadiusPx] bombCfg.explosion is not defined');
      return null;
    }
    return window.ObjectFactory.explosionFrameRadius(
      this.scene, null, bombCfg.explosion
    );
  },

  // Returns the raw blast force for a bomb.
  _blastForcePx(bombCfg) {
    return bombCfg.blastForce;
  },

  // Moves the plane, accumulates time toward the next bomb drop, and destroys
  // the plane once it has crossed the far edge of the arena.
  _updatePlane(dt) {
    if (!this._run?.plane?.active) return;

    const run   = this._run;
    const prevX = run.plane.x;
    const prevY = run.plane.y;

    run.plane.x += run.speed * run.direction * dt;

    if (run.plane._blade?.active) {
      const off = run.bladeOffset || { x: 0, y: 0 };
      run.plane._blade.x = run.plane.x + off.x;
      run.plane._blade.y = run.plane.y + off.y;
    }

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
      if (run.plane._blade?.active) run.plane._blade.destroy();
      run.plane.destroy();
      this._run = null;
    }
  },

  // Spawns a bomb beneath the plane with a random horizontal offset.
  _spawnBomb() {
    if (!this._run?.plane?.active) return;

    const { plane, planeVelocity } = this._run;
    const planeCfg    = window.ObjectConfig.internalTypes.plane;
    const offsetRange = planeCfg.bombDropOffsetRatioRange;

    const planeHalfW = plane.displayWidth  * 0.5;
    const planeHalfH = plane.displayHeight * 0.5;
    const offsetX    = (offsetRange.min + Math.random() * Math.max(0, offsetRange.max - offsetRange.min)) * planeHalfW;

    const bomb = window.ObjectFactory.createInternal(
      this.scene, 'bomb', plane.x + offsetX, plane.y + planeHalfH, this.arena
    );
    if (!bomb) return;

    const bombHalfH = bomb.displayHeight * 0.5;
    bomb.y = plane.y + planeHalfH + bombHalfH;

    if (bomb?.setFlipX) bomb.setFlipX(this._run.direction < 0);

    const matterStepRate = 60;
    const speed          = Math.abs(planeVelocity.x);
    if (speed === 0) {
      console.warn('[GameLogic._spawnBomb] plane velocity is zero — bomb will drop straight down with no speed');
    }

    Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, {
      x: 0,
      y: speed / matterStepRate,
    });

    this._activeBombs.push(bomb);
  },

  // Checks every live bomb each frame and triggers a blast when one hits the ground.
  _updateBombs() {
    if (!this._activeBombs.length) return;

    const bottom  = this.arena.ARENA_Y + this.arena.ARENA_H;
    const bombCfg = window.ObjectConfig.internalTypes.bomb;

    for (let i = this._activeBombs.length - 1; i >= 0; i--) {
      const bomb = this._activeBombs[i];

      if (!bomb.active || bomb.y >= bottom) {
        if (bomb.active) {
          const radius  = this._blastRadiusPx(bombCfg);
          if (radius === null) {
            console.error('[GameLogic._updateBombs] blast radius is null — blast suppressed for ground-hit bomb');
            try { bomb.destroy(); } catch (e) { /* ignore */ }
            this._activeBombs.splice(i, 1);
            continue;
          }
          const force = this._blastForcePx(bombCfg);
          try { this._createBlastRadius(bomb.x, bomb.y, radius, force, undefined, bombCfg.explosion); } catch (e) {
            window.logDebug?.('[GameLogic._updateBombs] blast failed', e);
          }
          try { bomb.destroy(); } catch (e) {
            window.logDebug?.('[GameLogic._updateBombs] bomb destroy failed', e);
          }
        }
        this._activeBombs.splice(i, 1);
      }
    }
  },

  // Matter.js collisionstart handler.
  _handleCollision(bodyA, bodyB) {
    if (!bodyA || !bodyB) return;

    const bombBody = bodyA.label === 'bomb' ? bodyA : bodyB.label === 'bomb' ? bodyB : null;
    if (!bombBody) return;

    const otherBody = bombBody === bodyA ? bodyB : bodyA;
    if (otherBody.label === 'bomb') return;

    const bombGO = bombBody.gameObject;
    if (!bombGO?.active) return;

    const bombCfg = window.ObjectConfig.internalTypes.bomb;
    if (!bombCfg?.explosion?.animKey) {
      console.error('[GameLogic._handleCollision] bombCfg.explosion.animKey is not set — blast suppressed');
      try { bombGO.destroy(); } catch (e) { /* ignore */ }
      return;
    }
    const radius  = this._blastRadiusPx(bombCfg);
    if (radius === null) {
      console.error('[GameLogic._handleCollision] blast radius is null — blast suppressed for collision bomb');
      try { bombGO.destroy(); } catch (e) { /* ignore */ }
      return;
    }

    const force = this._blastForcePx(bombCfg);

    const otherGO = otherBody?.gameObject;
    window.logDebug?.('[GameLogic._handleCollision] bomb hit', {
      otherLabel: otherBody.label,
      otherType:  otherGO?.buildingType ?? otherGO?.objectType ?? 'unknown',
      isPlayer:   otherGO === this.player,
    });

    this._createBlastRadius(bombGO.x, bombGO.y, radius, force, undefined, bombCfg.explosion);
    try { bombGO.destroy(); } catch (e) {
      window.logDebug?.('[GameLogic._handleCollision] bomb destroy failed', e);
    }
  },

  // Creates an expanding circle visual and applies blast damage/knockback to all
  // bodies within the radius.
  //
  // explosionCfg is the .explosion sub-object from the bomb/blast config.
  // It carries animKey, imageKey, scale, blastScale.
  // Sprite scale is derived from the same formula as _explosionFrameRadius so
  // the visual and the damage zone are always in sync.
  _createBlastRadius(x, y, radius, force, maxDamageOverride, explosionCfg) {
    if (radius == null || radius <= 0) {
      console.error(`[GameLogic._createBlastRadius] invalid radius (${radius}) — blast suppressed`);
      return;
    }

    const animKey    = explosionCfg.animKey;
    const anim       = this.scene.anims.get(animKey);
    const firstFrame = anim.frames[0].frame;
    const atlasKey   = firstFrame.textureKey;
    const frameKey   = firstFrame.name;

    const explosion = this.scene.add.sprite(x, y, atlasKey, frameKey);
    explosion.setDepth(100);

    // displayScale must exactly match the formula in ObjectFactory._explosionFrameRadius.
    let maxRawDim = 0;
    for (const f of anim.frames) {
      const w = f.frame.realWidth  || f.frame.width  || 0;
      const h = f.frame.realHeight || f.frame.height || 0;
      maxRawDim = Math.max(maxRawDim, w, h);
    }

    if (maxRawDim === 0) {
      console.error(`[GameLogic._createBlastRadius] animation "${animKey}" has zero-dimension frames`);
    } else {
      const displayScale = explosionCfg.scale ?? 1;
      explosion.setScale(displayScale);
    }

    window.SpriteFactory.playAnimation(explosion, animKey);

    if (window.DEBUG) {
      const g = this.scene.add.graphics();
      g.lineStyle(2, 0xff0000, 1);
      g.strokeCircle(x, y, radius);
      g.setDepth(500);
      this.scene.time.delayedCall(600, () => { if (g.active) g.destroy(); });
    }

    const bombCfg     = window.ObjectConfig.internalTypes.bomb;
    const blastMaxDmg = maxDamageOverride !== undefined
      ? maxDamageOverride
      : bombCfg.blastMaxDamage;

    const bodies = this.scene.matter.intersectRect(
      x - radius, y - radius,
      radius * 2,  radius * 2
    ) || [];

    bodies.forEach((body) => {
      const obj = body.gameObject;
      if (!obj || obj.isBomb || body.label === 'bomb') return;

      // Skip objects already in the process of being destroyed (e.g. chain-exploding crates).
      if (obj._dying || !obj.active) return;

      // Guard: body may have been removed from the physics world mid-blast.
      if (!body.position) return;

      const dx   = body.position.x - x;
      const dy   = body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) return;

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

  // Applies an outward velocity impulse proportional to blast force and distance falloff.
  // Returns the falloff value so the caller can scale damage by the same factor.
  _applyKnockback(body, bx, by, blastForce, radius) {
    const obj = body.gameObject;
    if (!obj || body.isStatic || obj.isBomb || body.label === 'bomb') return 0;

    // Guard: body may have been removed mid-blast.
    if (!body.position) return 0;

    const dx   = body.position.x - bx;
    const dy   = body.position.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= radius || dist <= 0) return 0;

    const falloff = 1 - (dist / radius);
    const mass    = body.mass || 1;
    const deltaV  = (blastForce * falloff) / mass;
    const nx      = dx / dist;
    const ny      = dy / dist;

    const cv = body.velocity;
    Phaser.Physics.Matter.Matter.Body.setVelocity(body, {
      x: cv.x + nx * deltaV,
      y: cv.y + ny * deltaV,
    });

    return falloff;
  },

  // Subtracts amount from player health and triggers a game-over when it reaches zero.
  _damagePlayer(amount) {
    if (this.gameOver || !this.player) return;
    this.player.health = Math.max(0, (this.player.health || 0) - amount);
    if (this.player.health <= 0) this._endGame(false);
  },

  // Called when a building's takeDamage() signals death.
  //
  // Order of operations — important for chain safety:
  //   1. Capture position and blast config from the live object.
  //   2. Mark _dying so no in-progress blast query can pick it up again.
  //   3. Destroy the game object immediately — physics body leaves the world now.
  //   4. Push its explosion into _explosionWaveQueue if it chain-blasts.
  //      The blast fires on the NEXT frame via _flushExplosionWave(), by which
  //      time Matter.js has fully settled and removed this body.
  _onBuildingDied(obj) {
    window.logDebug?.('[GameLogic._onBuildingDied] building died', {
      type:     obj.buildingType,
      health:   obj.health,
      x:        Math.round(obj.x),
      y:        Math.round(obj.y),
      isLocked: obj.isLocked,
    });

    // 1. Capture before destruction.
    const savedX         = obj.x;
    const savedY         = obj.y;
    const cfg            = obj.buildingConfig;
    const willChainBlast = cfg?.onDeath === 'explode' && cfg?.blast;

    // 2. Mark dying so concurrent blast queries skip it.
    obj._dying = true;

    // 3. Destroy immediately — body is removed from Matter.js world here.
    try { window.BuildingManager.destroyBuilding(obj); } catch (e) {
      window.logDebug?.('[GameLogic._onBuildingDied] destroy failed', e);
    }
    this.buildings = this.buildings.filter((b) => b !== obj);

    // 4. Enqueue chain explosion for the next frame's wave flush.
    if (willChainBlast && this.scene) {
      const blastCfg = cfg.blast;
      const radius   = window.ObjectFactory.explosionFrameRadius(
        this.scene, null, blastCfg
      );
      if (radius !== null) {
        this._explosionWaveQueue.push({
          x:            savedX,
          y:            savedY,
          radius,
          force:        blastCfg.blastForce ?? blastCfg.force ?? 0,
          maxDamage:    blastCfg.maxDamage,
          explosionCfg: blastCfg,
        });
      }
    }
  },

  // Processes one wave of chain explosions per frame.
  //
  // Wave model:
  //   Frame N   — bomb lands, damages crate A → A dies → A's blast pushed to queue
  //   Frame N+1 — _flushExplosionWave snapshots queue ([A]), clears it, fires A's blast
  //               → A's blast kills crate B → B dies → B's blast pushed to (now-empty) queue
  //   Frame N+2 — snapshots [B], clears, fires B's blast → nothing new dies → queue stays empty
  //   Frame N+3 — queue empty, chain fully resolved, nothing fires
  //
  // Snapshotting before iterating is the key: any new entries pushed by _onBuildingDied
  // during this pass land in the freshly-cleared queue and are held for the next frame,
  // never processed in the same pass as the blast that caused them.
  _flushExplosionWave() {
    if (!this._explosionWaveQueue.length) return;

    const wave = this._explosionWaveQueue;  // grab reference to current wave
    this._explosionWaveQueue = [];          // new entries from THIS wave land here, fired next frame

    for (const exp of wave) {
      try {
        this._createBlastRadius(
          exp.x, exp.y, exp.radius, exp.force, exp.maxDamage, exp.explosionCfg
        );
      } catch (e) {
        window.logDebug?.('[GameLogic._flushExplosionWave] blast failed', e);
      }
    }
  },

  // Registers a building so blast queries can find and damage it.
  addBuilding(building) {
    this.buildings.push(building);
    building.isBuilding = true;
  },

  // Sets the gameOver flag and logs the result.
  _endGame(won) {
    if (this.gameOver) return;
    this.gameOver = true;
    window.logDebug?.(won ? 'Level Complete!' : 'Game Over!');
  },

  // Destroys any in-flight plane and bombs, clears the run state, resets gameOver,
  // and restores player health to maximum. Called between waves or on restart.
  resetRun() {
    if (this._run?.plane?.active) {
      try { this._run.plane.destroy(); } catch (e) {
        window.logDebug?.('[GameLogic.resetRun] plane destroy failed', e);
      }
    }
    this._run = null;

    for (const bomb of this._activeBombs) {
      if (bomb?.active) {
        try { bomb.destroy(); } catch (e) {
          window.logDebug?.('[GameLogic.resetRun] bomb destroy failed', e);
        }
      }
    }
    this._activeBombs = [];
    this.gameOver     = false;

    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    if (this.player) this.player.health = maxHp;
  },
};
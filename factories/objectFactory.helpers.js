// factories/objectFactory.helpers.js
// Pure helper functions used by objectFactory.js.
// Kept separate so the main factory file stays focused on object creation.


// ── Size calculation ──────────────────────────────────────────────────────────

// Returns { bodyW, bodyH, scaleX, scaleY, radius? } for a given config,
// or null if the texture / frame is missing.
function _computeSize(scene, cfg) {
  const scaleX = cfg.scaleX ?? cfg.scale ?? 1;
  const scaleY = cfg.scaleY ?? cfg.scale ?? 1;

  if (cfg.collisionSize) {
    const w = cfg.collisionSize.width !== undefined ? cfg.collisionSize.width : cfg.collisionSize[0];
    const h = cfg.collisionSize.height !== undefined ? cfg.collisionSize.height : cfg.collisionSize[1];
    if (cfg.physics?.shape?.type === 'circle') {
      const radius = Math.max(2, Math.round(Math.min(w, h) / 2));
      return { bodyW: radius * 2, bodyH: radius * 2, scaleX, scaleY, radius };
    }
    return { bodyW: w, bodyH: h, scaleX, scaleY };
  }

  if (!scene.textures.exists(cfg.imageKey)) {
    console.error(`[ObjectFactory._computeSize] texture "${cfg.imageKey}" not loaded`);
    return null;
  }

  const frame = cfg.startFrame
    ? scene.textures.getFrame(cfg.imageKey, cfg.startFrame)
    : scene.textures.getFrame(cfg.imageKey);

  if (!frame) {
    console.error(`[ObjectFactory._computeSize] frame "${cfg.startFrame ?? '(base)'}" not found in "${cfg.imageKey}"`);
    return null;
  }

  const texW = frame.realWidth || frame.width;
  const texH = frame.realHeight || frame.height;

  if (!texW || !texH) {
    console.error(`[ObjectFactory._computeSize] frame has zero dimensions`);
    return null;
  }

  if (cfg.physics?.shape?.type === 'circle') {
    const avgScale = (scaleX + scaleY) / 2;
    return _computeCircleSize(texW, texH, avgScale, cfg.physics.shape);
  }

  return { bodyW: texW * scaleX, bodyH: texH * scaleY, scaleX, scaleY };
}

function _computeCircleSize(texW, texH, scale, shape) {
  const radiusRatio = shape.radiusRatio ?? 1;
  const radius = Math.max(2, Math.round((Math.min(texW, texH) / 2) * scale * radiusRatio));
  return { bodyW: radius * 2, bodyH: radius * 2, scaleX: scale, scaleY: scale, radius };
}


// ── Visual creation ───────────────────────────────────────────────────────────

const _graphicsDrawers = {
  // ── Pillbox: static bunker ────────────────────────────────────────────────
  pillbox: (scene, x, y, bodyW, bodyH, cfg) => {
    const texKey = '__pillbox_tex';

    if (!scene.textures.exists(texKey)) {
      const g = scene.add.graphics();
      const w = bodyW;
      const h = bodyH;

      // Base bunker
      g.fillStyle(0x333333, 1);
      g.fillRoundedRect(0, 0, w, h, 8);

      // Gun slot
      g.fillStyle(0x111111, 1);
      g.fillRect(w * 0.2, h * 0.3, w * 0.6, h * 0.2);

      // Detail
      g.lineStyle(2, 0x111111, 1);
      g.strokeRoundedRect(0, 0, w, h, 8);

      g.generateTexture(texKey, Math.ceil(w), Math.ceil(h));
      g.destroy();
    }

    const obj = scene.add.sprite(x, y, texKey);
    obj._factoryScaled = true;
    return obj;
  },

  // ── Mortar: tall dark battery with launch tubes ─────────────────────────
  mortar: (scene, x, y, bodyW, bodyH, cfg) => {
    const texKey = '__mortar_tex';

    if (!scene.textures.exists(texKey)) {
      const g = scene.add.graphics();
      const w = bodyW;
      const h = bodyH;

      // Base body — dark grey tall rectangle
      g.fillStyle(0x404040, 1);
      g.fillRect(0, 0, w, h);

      // Add a sturdy base
      g.fillStyle(0x202020, 1);
      g.fillRect(-w * 0.1, h * 0.9, w * 1.2, h * 0.1);

      // Draw 3 vertical launch tubes
      g.fillStyle(0x111111, 1);
      const tubeW = w * 0.2;
      const tubeH = h * 0.6;
      g.fillRect(w * 0.15, h * 0.1, tubeW, tubeH);
      g.fillRect(w * 0.40, h * 0.1, tubeW, tubeH);
      g.fillRect(w * 0.65, h * 0.1, tubeW, tubeH);

      // Warning stripes on the front
      g.fillStyle(0xdba614, 1);
      for (let i = 0; i < 3; i++) {
        g.fillRect(w * 0.1, h * 0.75 + i * h * 0.05, w * 0.8, h * 0.02);
      }

      g.generateTexture(texKey, Math.ceil(w), Math.ceil(h));
      g.destroy();
    }

    const obj = scene.add.sprite(x, y, texKey);
    obj._factoryScaled = true;
    return obj;
  },
};

function _buildVisual(scene, cfg, x, y, bodyW, bodyH, scaleX, scaleY) {
  if (cfg.useGraphics && cfg.graphicsType && _graphicsDrawers[cfg.graphicsType]) {
    const obj = _graphicsDrawers[cfg.graphicsType](scene, x, y, bodyW, bodyH, cfg);
    obj.setScale(scaleX, scaleY);
    return obj;
  }

  const obj = scene.add.sprite(x, y, cfg.imageKey, cfg.startFrame);

  if (cfg.animKey && scene.anims?.exists?.(cfg.animKey)) obj.play(cfg.animKey);

  obj.setScale(scaleX, scaleY);
  obj._factoryScaled = true;
  return obj;
}


// ── Physics attachment ────────────────────────────────────────────────────────

function _addPhysics(scene, obj, cfg, bodyW, bodyH, dims) {
  const p = cfg.physics;
  const shape = _buildPhysicsShape(p, bodyW, bodyH, dims);

  const frictionMult = window.ObjectConfig.globalFrictionMultiplier ?? 3.0;
  const staticFrictionMult = window.ObjectConfig.globalStaticFrictionMultiplier ?? 3.0;

  const scaledFriction = p.friction !== undefined ? p.friction * frictionMult : undefined;
  const scaledFrictionStatic = p.frictionStatic !== undefined 
    ? p.frictionStatic * staticFrictionMult 
    : (p.friction !== undefined ? p.friction * staticFrictionMult * 1.25 : undefined);

  scene.matter.add.gameObject(obj, {
    friction: scaledFriction,
    frictionStatic: scaledFrictionStatic,
    restitution: p.restitution,
    frictionAir: p.frictionAir,
    label: p.label || 'object',
    shape,
    isSensor: !!p.isSensor,
  });

  if (obj.body) {
    _applyMass(obj.body, p.mass);
    _applyCollisionFilter(obj.body, p.collisionFilter);
    if (p.isStatic) obj.setStatic(true);
    if (p.ignoreGravity) obj.setIgnoreGravity(true);
    if (p.isSensor) obj.setSensor(true);
  }
}

function _buildPhysicsShape(p, bodyW, bodyH, dims) {
  if (p?.shape?.type === 'circle') {
    const radius = dims?.radius ?? Math.max(2, Math.round(Math.min(bodyW, bodyH) * 0.5));
    return { type: 'circle', radius };
  }
  return { type: 'rectangle', width: Math.ceil(bodyW), height: Math.ceil(bodyH) };
}

function _applyMass(body, mass) {
  if (mass === undefined) return;
  try { Phaser.Physics.Matter.Matter.Body.setMass(body, mass); } catch (e) { }
}

function _applyCollisionFilter(body, filter) {
  if (!filter || !body.collisionFilter) return;
  body.collisionFilter.category = filter.category;
  body.collisionFilter.mask = filter.mask;
}


// ── Health system ─────────────────────────────────────────────────────────────

// Attaches health, maxHealth, and a takeDamage method to obj.
function _addHealth(obj, cfg) {
  obj.health = cfg.health;
  obj.maxHealth = cfg.health;

  obj.takeDamage = function (amount) {
    if (!this.active) return false;
    // Negative health means indestructible — ignore all damage.
    if (this.maxHealth < 0) return false;
    this.health -= amount;
    _updateHpLabelOnDamage(this);
    return this.health <= 0;
  }.bind(obj);
}

// Updates the floating HP label after damage, or destroys it when health hits zero.
function _updateHpLabelOnDamage(obj) {
  if (!obj._hpLabel?.active) return;

  if (obj.health > 0) {
    obj._hpLabel.setText(`HP:${Math.max(0, Math.round(obj.health))}`);
    obj._hpLabel.x = obj.x;
    obj._hpLabel.y = obj.y - (obj.displayHeight ?? 0) * 0.5;
  } else {
    obj._hpLabel.destroy();
    obj._hpLabel = null;
  }
}


// ── Debug HP labels ───────────────────────────────────────────────────────────

// Creates or updates the floating HP label above obj (debug mode only).
function _updateHpLabel(obj) {
  if (!obj?.active) return;

  if (!window.DEBUG) {
    if (obj._hpLabel?.active) { obj._hpLabel.destroy(); obj._hpLabel = null; }
    return;
  }

  if (!obj._hpLabel?.active) {
    _createHpLabel(obj);
  }

  obj._hpLabel.x = obj.x;
  obj._hpLabel.y = obj.y - (obj.displayHeight ?? 0) * 0.5;
  obj._hpLabel.setText(`HP:${Math.max(0, Math.round(obj.health))}`);
}

function _createHpLabel(obj) {
  if (!obj.scene) return;

  const label = obj.scene.add.text(obj.x, obj.y, `HP:${Math.max(0, Math.round(obj.health))}`, {
    fontSize: '18px',
    fill: '#ffffff',
    backgroundColor: '#000000',
    padding: { x: 3, y: 2 },
  });

  label.setOrigin(0.5, 1);
  label.setDepth(3000);
  obj._hpLabel = label;
}

function _addWeaponCapabilities(obj, cfg) {
  const weapon = cfg?.weapon;
  if (!weapon) return;

  obj.activate = function(target, options = {}) {
    if (!this.active || this._dying || !this.scene) return;
    if (this._weaponTimer) {
      try { this._weaponTimer.destroy(); } catch (e) {}
    }

    this.isOutOfAmmo = false;
    let shotsFired = 0;

    const scene = this.scene;
    const fireCycle = () => {
      if (!this.active || this._dying || !target || !target.active || target.health <= 0) {
        if (this._weaponTimer) {
          try { this._weaponTimer.destroy(); } catch (e) {}
        }
        return;
      }

      if (weapon.ammo !== undefined && shotsFired >= weapon.ammo) {
        this.isOutOfAmmo = true;
        return;
      }

      const bombType = weapon.bomb || 'smallBomb';
      const spread = weapon.spreadAngleDeg ?? 5;
      const speedSpread = weapon.speedSpreadRatio ?? 0.1;
      const minAngle = weapon.minAngleDeg ?? 60;
      const fireRate = weapon.fireRateMs ?? 3000;

      if (weapon.barrageCount && weapon.barrageCount > 1) {
        const count = weapon.barrageCount;
        const delay = weapon.barrageDelayMs ?? 200;
        
        for (let i = 0; i < count; i++) {
          scene.time.delayedCall(i * delay, () => {
            if (!this.active || this._dying || !target || !target.active || target.health <= 0) return;
            
            const { x: spawnX, y: spawnY } = window.GameLogicHelper.getSafeSpawnPosition(this, target, 0.85);
            const dx = target.x - spawnX;
            const dy = target.y - spawnY;
            
            const bomb = window.GameLogicHelper.fireHighArcBomb(scene, {
              bombType,
              spawnX,
              spawnY,
              dx,
              dy,
              target,
              owner: this,
              spreadAngleDeg: spread,
              speedSpreadRatio: speedSpread,
              minAngleDeg: minAngle
            });
            if (bomb) {
              bomb.isBomb = true;
              if (scene.activeBombs) scene.activeBombs.push(bomb);
              
              if (bomb.body) {
                if (options.collisionCategory !== undefined) {
                  bomb.body.collisionFilter.category = options.collisionCategory;
                }
                if (options.collisionMask !== undefined) {
                  bomb.body.collisionFilter.mask = options.collisionMask;
                }
              }
            }
          });
        }
      } else {
        const { x: spawnX, y: spawnY } = window.GameLogicHelper.getSafeSpawnPosition(this, target, 0.85);
        const dx = target.x - spawnX;
        const dy = target.y - spawnY;
        
        const bomb = window.GameLogicHelper.fireHighArcBomb(scene, {
          bombType,
          spawnX,
          spawnY,
          dx,
          dy,
          target,
          owner: this,
          spreadAngleDeg: spread,
          speedSpreadRatio: speedSpread,
          minAngleDeg: minAngle
        });
        if (bomb) {
          bomb.isBomb = true;
          if (scene.activeBombs) scene.activeBombs.push(bomb);
          
          if (bomb.body) {
            if (options.collisionCategory !== undefined) {
              bomb.body.collisionFilter.category = options.collisionCategory;
            }
            if (options.collisionMask !== undefined) {
              bomb.body.collisionFilter.mask = options.collisionMask;
            }
          }
        }
      }

      shotsFired++;
      if (weapon.ammo !== undefined && shotsFired >= weapon.ammo) {
        this.isOutOfAmmo = true;
        return;
      }

      const nextDelay = fireRate + Math.random() * (weapon.randomDelayMs ?? 500);
      this._weaponTimer = scene.time.delayedCall(nextDelay, fireCycle);
    };

    const initDelay = (weapon.initialDelayMs ?? 1000) + Math.random() * (weapon.randomDelayMs ?? 500);
    this._weaponTimer = scene.time.delayedCall(initDelay, fireCycle);
  }.bind(obj);
}

function _setupPlaneCapabilities(obj, cfg) {
  obj.startFlight = function(speed, direction, bombType) {
    if (!this.active || !this.scene) return;

    const scene = this.scene;

    // Create rotor blade
    const blade = scene.add.sprite(this.x, this.y, 'plane_atlas', 'plane_blade_1');
    if (cfg.bladeScale !== undefined) blade.setScale(cfg.bladeScale);
    blade.setDepth((this.depth || 0) + 1);
    blade.setFlipX(direction > 0);
    this.setFlipX(direction > 0);
    if (scene.anims.exists('plane_blades')) blade.play('plane_blades');
    this._blade = blade;

    // Calculate exit coordinate
    const exitX = direction > 0 ? 2200 : -300;

    // Set up update handler for movement and blade synchronization
    const updateHandler = (time, delta) => {
      if (!this.active) {
        scene.events.off('update', updateHandler);
        if (this._blade?.active) this._blade.destroy();
        return;
      }

      const dt = delta / 1000;
      this.x += speed * direction * dt;

      if (this._blade && this._blade.active) {
        const bladeOffsetY = cfg.bladeOffsetY * this.displayHeight;
        this._blade.x = this.x + (cfg.bladeOffsetX * direction);
        this._blade.y = this.y + bladeOffsetY;
      }

      // Check boundary exit
      const exited = direction > 0 ? this.x >= exitX : this.x <= exitX;
      if (exited) {
        scene.events.off('update', updateHandler);
        if (this._blade?.active) this._blade.destroy();
        
        // Remove from GameLogic targets if present
        if (window.GameLogic && window.GameLogic._targets) {
          window.GameLogic._targets = window.GameLogic._targets.filter(t => t !== this);
        }
        if (window.GameLogic && window.GameLogic._run?.plane === this) {
          window.GameLogic._run = null;
        }

        this.destroy();
        try { window.SfxManager?.stopAll?.(); } catch (e) { }
      }
    };

    this._updateHandler = updateHandler;
    scene.events.on('update', updateHandler);

    // Set up periodic bomb dropping cycle
    const { min, max } = cfg.bombDropDelayRangeSec;
    const spawnBombCycle = () => {
      if (!this.active) return;

      const offsetRange = cfg.bombDropOffsetRatioRange;
      const planeHalfW = this.displayWidth * 0.5;
      const planeHalfH = this.displayHeight * 0.5;
      const offsetX = (offsetRange.min + Math.random() * Math.max(0, offsetRange.max - offsetRange.min)) * planeHalfW;

      const bombTypeKey = bombType || cfg.bomb || 'bomb';
      const spawnX = this.x + offsetX;
      const spawnY = this.y + planeHalfH;

      const bomb = window.spawnBomb(scene, bombTypeKey, spawnX, spawnY, 90, null, this);
      if (bomb) {
        bomb.setPosition(bomb.x, this.y + planeHalfH + bomb.displayHeight * 0.5);
        if (bomb.body) {
          const planeVx = (speed * direction) / 60;
          Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, {
            x: bomb.body.velocity.x + planeVx,
            y: bomb.body.velocity.y
          });
        }
      }

      const nextDelay = (min + Math.random() * Math.max(0, max - min)) * 1000;
      this._bombTimerEvent = scene.time.delayedCall(nextDelay, spawnBombCycle);
    };

    const initDelay = (min + Math.random() * Math.max(0, max - min)) * 1000;
    this._bombTimerEvent = scene.time.delayedCall(initDelay, spawnBombCycle);
  }.bind(obj);
}

function _setupTrampolineCapabilities(obj, cfg) {
  obj.bounce = function(bombBody) {
    if (!this.active || !bombBody || !bombBody.gameObject) return;

    const bounceForce = cfg.bounceForce ?? 28;
    const velocityCap = cfg.bounceVelocityCap ?? 30;

    // Get the angle of the trampoline surface
    const angle = this.body?.angle ?? this.angle ?? 0;

    // Normal vector pointing "upward" from the surface
    const nx = Math.sin(angle);
    const ny = -Math.cos(angle);

    const cv = bombBody.velocity;

    // Decompose current velocity into normal component
    const vn = cv.x * nx + cv.y * ny;

    // We only bounce if the bomb is moving towards the trampoline surface (vn < 0)
    if (vn >= 0) return;

    // Mirror incoming velocity across the normal vector
    const rx_mirror = cv.x - 2 * vn * nx;
    const ry_mirror = cv.y - 2 * vn * ny;

    const mirrorSpeed = Math.sqrt(rx_mirror * rx_mirror + ry_mirror * ry_mirror);

    let rx, ry;
    if (mirrorSpeed > 0.0001) {
      let outgoingSpeed = mirrorSpeed + bounceForce;
      outgoingSpeed = Math.min(outgoingSpeed, velocityCap);

      rx = (rx_mirror / mirrorSpeed) * outgoingSpeed;
      ry = (ry_mirror / mirrorSpeed) * outgoingSpeed;
    } else {
      let outgoingSpeed = Math.min(bounceForce, velocityCap);
      rx = nx * outgoingSpeed;
      ry = ny * outgoingSpeed;
    }

    // Apply bounce velocity
    Phaser.Physics.Matter.Matter.Body.setVelocity(bombBody, { x: rx, y: ry });

    // Handle 1v1 specific owner reflection and collision category toggle
    if (this.scene && (this.scene.player1 || this.scene.player2)) {
      if (this.x < 960) {
        // Player 1 side: make it P1's projectile!
        if (bombBody.gameObject) {
          bombBody.gameObject.owner = this.scene.player1;
          bombBody.collisionFilter.category = 0x0010;
          bombBody.collisionFilter.mask = 0x0001 | 0x0002 | 0x0004 | 0x0008;
        }
      } else {
        // Player 2 side: make it P2's projectile!
        if (bombBody.gameObject) {
          bombBody.gameObject.owner = this.scene.player2;
          bombBody.collisionFilter.category = 0x0020;
          bombBody.collisionFilter.mask = 0x0001 | 0x0002 | 0x0004 | 0x0008;
        }
      }
    } else {
      // Single player mode: take ownership
      if (window.GameLogic && window.GameLogic.player && bombBody.gameObject) {
        bombBody.gameObject.owner = window.GameLogic.player;
      }
    }

    // Play SFX
    window.SfxManager?.playBounce?.();

    // Play spring bounce animation
    if (this.scene) {
      try {
        if (typeof this.stop === 'function') this.stop();
        this.setFrame('spring1');

        const frames = ['spring1', 'spring2', 'spring3', 'spring4', 'spring1'];
        let frameIndex = 0;
        const playNextFrame = () => {
          if (!this.active) return;
          this.setFrame(frames[frameIndex]);
          frameIndex++;
          if (frameIndex < frames.length) {
            this.scene.time.delayedCall(80, playNextFrame);
          }
        };
        playNextFrame();
      } catch (e) {
        console.warn('Spring animation error:', e);
      }
    }

    // Increment bounce count and handle self-destruction if maxBounces is exceeded
    this.bouncesCount = (this.bouncesCount || 0) + 1;
    if (cfg.maxBounces && this.bouncesCount >= cfg.maxBounces) {
      if (window.GameLogic && typeof window.GameLogic._handleBuildingDeath === 'function') {
        window.GameLogic._handleBuildingDeath(this);
      } else {
        // Trigger onDeath: explode command if config calls for it in 1v1 or otherwise
        if (cfg.onDeath === 'explode' && cfg.explosion && this.scene) {
          const cmd = new window.ExplosionCommand(this.scene, {
            x: this.x,
            y: this.y,
            explosiveCfg: {
              explosion: cfg.explosion,
              blastForce: cfg.blastForce || 100,
              blastMaxDamage: cfg.blastMaxDamage || 50
            },
            sourceBomb: this
          });
          cmd.execute();
        }
        
        // Remove from placedObjects list in 1v1Scene if present
        if (this.scene && this.scene.placedObjects) {
          this.scene.placedObjects = this.scene.placedObjects.filter(o => o !== this);
        }
        
        window.ObjectFactory.destroy(this);
      }
    }
  }.bind(obj);
}
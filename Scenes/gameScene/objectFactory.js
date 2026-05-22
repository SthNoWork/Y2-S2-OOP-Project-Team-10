// objectFactory.js
// Creates and destroys all game objects: placeables, level objects, and internal engine objects.
// Reads sizing, visual, and physics config from objectConfig.js.
// Does not track state — that belongs to BuildingManager and GameLogic.
//
// Object sizing pipeline:
//   For sprites:  bodyW = frame.realWidth  × scale
//                 bodyH = frame.realHeight × scale
//   For circles:  radius = (min(texW, texH) / 2) × scale × radiusRatio
//   For fallback: uses cfg.width / cfg.height in px (plain rectangles)
//
// Public API:
//   ObjectFactory.createPlaceable(scene, type, x, y, arena, options) → game object
//   ObjectFactory.createLevelObject(scene, type, x, y, arena)        → game object
//   ObjectFactory.createInternal(scene, type, x, y, arena, options)  → game object
//   ObjectFactory.destroy(obj)                                        → void

window.ObjectFactory = {};

// ─────────────────────────────────────────────────────────────────────────────
// SIZE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

// Computes physics body dimensions and sprite display scale from the texture
// frame size and the per-object scale multiplier.
//
// For sprites (cfg.useImage = true):
//   scaleX = scaleY = cfg.scale
//   bodyW  = frame.realWidth  × scale
//   bodyH  = frame.realHeight × scale
//
// For circles (cfg.physics.shape.type = 'circle'):
//   radius = max(2, round(min(texW, texH) / 2 × scale × radiusRatio))
//   bodyW = bodyH = radius × 2
function _computeSize(scene, cfg) {
  const scale = cfg.scale ?? 1;

  if (cfg.useImage && cfg.imageKey) {
    if (!scene.textures.exists(cfg.imageKey)) {
      console.error(`[ObjectFactory._computeSize] texture "${cfg.imageKey}" not loaded`);
      return null;
    }

    const frame = cfg.startFrame
      ? scene.textures.getFrame(cfg.imageKey, cfg.startFrame)
      : scene.textures.getFrame(cfg.imageKey);

    if (!frame) {
      console.error(`[ObjectFactory._computeSize] frame "${cfg.startFrame ?? '(base)'}" not found in texture "${cfg.imageKey}"`);
      return null;
    }

    const texW = frame.realWidth  || frame.width;
    const texH = frame.realHeight || frame.height;

    if (!texW || !texH) {
      console.error(`[ObjectFactory._computeSize] frame "${cfg.startFrame ?? '(base)'}" in "${cfg.imageKey}" has zero dimensions`);
      return null;
    }

    if (cfg.physics?.shape?.type === 'circle') {
      const inscribed   = Math.min(texW, texH) / 2;
      const radiusRatio = cfg.physics.shape.radiusRatio ?? 1;
      const radius      = Math.max(2, Math.round(inscribed * scale * radiusRatio));
      return { bodyW: radius * 2, bodyH: radius * 2, scaleX: scale, scaleY: scale, radius };
    }

    return {
      bodyW:  texW * scale,
      bodyH:  texH * scale,
      scaleX: scale,
      scaleY: scale,
    };
  }

  // Plain rectangle — uses explicit px dimensions from config.
  if (cfg.width == null || cfg.height == null) {
    console.error('[ObjectFactory._computeSize] cfg has no useImage and no explicit width/height', cfg);
    return null;
  }
  return { bodyW: cfg.width, bodyH: cfg.height, scaleX: 1, scaleY: 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL BUILDER
// ─────────────────────────────────────────────────────────────────────────────

// Builds a Phaser image, sprite, or rectangle for an object.
function _buildVisual(scene, cfg, x, y, bodyW, bodyH, scaleX, scaleY) {
  if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
    let obj;
    if (cfg.animKey) {
      obj = scene.add.sprite(x, y, cfg.imageKey, cfg.startFrame);
      if (scene.anims?.exists?.(cfg.animKey)) obj.play(cfg.animKey);
    } else {
      obj = scene.add.image(x, y, cfg.imageKey, cfg.startFrame);
    }
    obj.setScale(scaleX, scaleY);
    obj._factoryScaled = true;
    return obj;
  }

  return scene.add.rectangle(x, y, bodyW, bodyH, cfg.color);
}

// ─────────────────────────────────────────────────────────────────────────────
// PHYSICS
// ─────────────────────────────────────────────────────────────────────────────

// Attaches a Matter.js physics body to obj using the options in cfg.physics.
function _addPhysics(scene, obj, cfg, bodyW, bodyH, dims) {
  const p = cfg.physics;
  let shape = { type: 'rectangle', width: Math.ceil(bodyW), height: Math.ceil(bodyH) };

  if (p?.shape?.type === 'circle') {
    const radius = dims?.radius ?? Math.max(2, Math.round(Math.min(bodyW, bodyH) * 0.5));
    shape = { type: 'circle', radius };
  }

  scene.matter.add.gameObject(obj, {
    friction:    p.friction,
    restitution: p.restitution,
    frictionAir: p.frictionAir,
    label:       p.label || 'object',
    shape,
  });

  if (obj.body) {
    if (p.mass !== undefined) {
      try { Phaser.Physics.Matter.Matter.Body.setMass(obj.body, p.mass); } catch (e) {
        window.logDebug?.('[ObjectFactory._addPhysics] setMass failed', e);
      }
    }
    if (p.collisionFilter && obj.body.collisionFilter) {
      obj.body.collisionFilter.category = p.collisionFilter.category;
      obj.body.collisionFilter.mask     = p.collisionFilter.mask;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

// Adds health, maxHealth, and a takeDamage(amount) method to obj.
function _addHealth(obj, cfg) {
  obj.health    = cfg.health;
  obj.maxHealth = cfg.health;

  obj.takeDamage = function (amount) {
    if (!this.active) return false;
    this.health -= amount;

    if (this._hpLabel?.active) {
      if (this.health > 0) {
        this._hpLabel.setText(`HP:${Math.max(0, Math.round(this.health))}`);
        this._hpLabel.x = this.x;
        this._hpLabel.y = this.y - (this.displayHeight ?? 0) * 0.5;
      } else {
        this._hpLabel.destroy();
        this._hpLabel = null;
      }
    }

    if (this.health > 0) return false;
    return true;
  }.bind(obj);
}

// Repositions and syncs a debug HP label above its owner each frame.
function _updateHpLabel(obj) {
  if (!obj?.active) return;

  if (!window.DEBUG) {
    if (obj._hpLabel?.active) {
      obj._hpLabel.destroy();
      obj._hpLabel = null;
    }
    return;
  }

  if (!obj._hpLabel?.active) {
    if (!obj.scene) return;
    const label = obj.scene.add.text(obj.x, obj.y, `HP:${Math.max(0, Math.round(obj.health))}`, {
      fontSize:        '18px',
      fill:            '#ffffff',
      backgroundColor: '#000000',
      padding:         { x: 3, y: 2 },
    });
    label.setOrigin(0.5, 1);
    label.setDepth(3000);
    obj._hpLabel = label;
  }

  obj._hpLabel.x = obj.x;
  obj._hpLabel.y = obj.y - (obj.displayHeight ?? 0) * 0.5;
  obj._hpLabel.setText(`HP:${Math.max(0, Math.round(obj.health))}`);
}

// Updates all debug HP labels for a list of objects each frame.
window.ObjectFactory.updateDebugLabels = function (objects) {
  for (const obj of objects) _updateHpLabel(obj);
};

// Destroys the HP label attached to an object, if any.
window.ObjectFactory.destroyDebugLabel = function (obj) {
  if (obj?._hpLabel?.active) {
    obj._hpLabel.destroy();
    obj._hpLabel = null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPLOSION RADIUS
// ─────────────────────────────────────────────────────────────────────────────

// Returns the blast radius in px for an explosion effect.
//
// Pipeline:
//   1. Scan every frame of the animation for the largest raw dimension (maxRawDim).
//   2. displayScale = explosionCfg.scale
//   3. renderedRadius = (maxRawDim × displayScale) / 2
//   4. blastRadius    = renderedRadius × explosionCfg.blastScale
//
// Returns null if the animation or texture isn't available.
function _explosionFrameRadius(scene, _unused, explosionCfg) {
  if (!explosionCfg?.animKey) {
    console.error('[ObjectFactory._explosionFrameRadius] explosionCfg.animKey is required');
    return null;
  }
  const animKey = explosionCfg.animKey;
  if (!scene.anims.exists(animKey)) {
    console.error(`[ObjectFactory._explosionFrameRadius] animation "${animKey}" does not exist`);
    return null;
  }

  const anim = scene.anims.get(animKey);
  let maxRawDim = 0;
  for (const f of anim.frames) {
    const w = f.frame.realWidth  || f.frame.width  || 0;
    const h = f.frame.realHeight || f.frame.height || 0;
    maxRawDim = Math.max(maxRawDim, w, h);
  }

  if (maxRawDim === 0) {
    console.error(`[ObjectFactory._explosionFrameRadius] all frames in "${animKey}" have zero dimensions`);
    return null;
  }

  const displayScale   = explosionCfg.scale ?? 1;
  const renderedRadius = (maxRawDim * displayScale) / 2;
  return renderedRadius * (explosionCfg.blastScale ?? 1);
}

// Public export — GameLogic._blastRadiusPx delegates here.
window.ObjectFactory.explosionFrameRadius = _explosionFrameRadius;

// ─────────────────────────────────────────────────────────────────────────────
// CHAIN EXPLOSION (onDeath: 'explode')
// ─────────────────────────────────────────────────────────────────────────────

function _triggerBlast(obj, blastCfg) {
  if (!obj.scene || !obj.active) return;

  if (!blastCfg?.animKey) {
    console.error('[ObjectFactory._triggerBlast] blastCfg.animKey is required — blast suppressed');
    return;
  }

  const radius = _explosionFrameRadius(obj.scene, null, blastCfg);
  if (radius === null) {
    console.error('[ObjectFactory._triggerBlast] could not compute blast radius — blast suppressed', blastCfg);
    return;
  }

  try {
    window.GameLogic._createBlastRadius(obj.x, obj.y, radius, blastCfg.blastForce, blastCfg.maxDamage, blastCfg);
  } catch (e) {
    console.warn('[ObjectFactory._triggerBlast] _createBlastRadius failed:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC CREATE / DESTROY
// ─────────────────────────────────────────────────────────────────────────────

// Creates a player-draggable building and registers it with GameLogic.
window.ObjectFactory.createPlaceable = function (scene, type, x, y, arena, options = {}) {
  const cfg = window.ObjectConfig.placeableTypes[type];
  if (!cfg) {
    console.error(`ObjectFactory.createPlaceable: unknown placeable type "${type}"`);
    return null;
  }

  const dims = _computeSize(scene, cfg);
  if (!dims) return null;

  const { bodyW, bodyH, scaleX, scaleY } = dims;
  const obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH, scaleX, scaleY);
  obj._bodyW = bodyW;
  obj._bodyH = bodyH;

  _addPhysics(scene, obj, cfg, bodyW, bodyH, dims);
  _addHealth(obj, cfg);

  obj.setInteractive({ useHandCursor: true });

  obj.objectType           = type;
  obj.buildingType         = type;
  obj.buildingConfig       = cfg;
  obj.isBuilding           = true;
  obj.isDragging           = false;
  obj.spawnedFromInventory = !!options.fromInventory;
  obj._dragOrigin          = { x, y };
  obj._ghostRemoved        = false;

  if (window.GameLogic?.addBuilding) window.GameLogic.addBuilding(obj);

  return obj;
};

// Creates a level-designer object (e.g. bomb_crate) and registers it with GameLogic.
window.ObjectFactory.createLevelObject = function (scene, type, x, y, arena) {
  const cfg = window.ObjectConfig.levelTypes[type];
  if (!cfg) {
    console.error(`ObjectFactory.createLevelObject: unknown level type "${type}"`);
    return null;
  }

  const dims = _computeSize(scene, cfg);
  if (!dims) return null;

  const { bodyW, bodyH, scaleX, scaleY } = dims;
  const obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH, scaleX, scaleY);
  obj._bodyW = bodyW;
  obj._bodyH = bodyH;

  if (cfg.physics)              _addPhysics(scene, obj, cfg, bodyW, bodyH, dims);
  if (cfg.health !== undefined) _addHealth(obj, cfg);

  obj.objectType    = type;
  obj.isLevelObject = true;

  if (window.GameLogic?.addBuilding) window.GameLogic.addBuilding(obj);

  return obj;
};

// Creates an engine-internal object: 'bomb', 'plane', or 'player'.
window.ObjectFactory.createInternal = function (scene, type, x, y, arena, options = {}) {
  const cfg = window.ObjectConfig.internalTypes[type];
  if (!cfg) {
    console.error(`ObjectFactory.createInternal: unknown internal type "${type}"`);
    return null;
  }

  const spawnX = options.spawnLocation ? options.spawnLocation.x : x;
  const spawnY = options.spawnLocation ? options.spawnLocation.y : y;

  const dims = _computeSize(scene, cfg);
  if (!dims) return null;

  const { bodyW, bodyH, scaleX, scaleY } = dims;
  const obj = _buildVisual(scene, cfg, spawnX, spawnY, bodyW, bodyH, scaleX, scaleY);
  obj._bodyW = bodyW;
  obj._bodyH = bodyH;

  if (cfg.physics)              _addPhysics(scene, obj, cfg, bodyW, bodyH, dims);
  if (cfg.health !== undefined) _addHealth(obj, cfg);

  obj.objectType = type;
  if (type === 'bomb') obj.isBomb = true;

  return obj;
};

// Destroys a game object safely, cleaning up its debug HP label first.
window.ObjectFactory.destroy = function (obj) {
  if (!obj?.active) return;
  window.ObjectFactory.destroyDebugLabel(obj);
  try { obj.destroy(); } catch (e) {
    window.logDebug?.('[ObjectFactory.destroy] destroy failed', e);
  }
};
// objectFactory.js
// Creates and destroys all game objects: placeables, level objects, and internal engine objects.
// Reads sizing, visual, and physics config from objectConfig.js.
// Does not track state — that belongs to BuildingManager and GameLogic.
//
// Public API:
//   ObjectFactory.createPlaceable(scene, type, x, y, arena, options) → game object
//   ObjectFactory.createLevelObject(scene, type, x, y, arena)        → game object
//   ObjectFactory.createInternal(scene, type, x, y, arena, options)  → game object
//   ObjectFactory.destroy(obj)                                        → void

window.ObjectFactory = {};

// Builds a Phaser image, sprite, or rectangle for an object.
// Uses a sprite with an animation when cfg.animKey is set, an image when cfg.useImage
// is true, and falls back to a coloured rectangle otherwise.
// scaleX / scaleY are independent axis scales so widthRatio and heightRatio can
// stretch the texture freely (e.g. 1:2 turns a square texture into a tall rectangle).
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

// Delegates to SizeCalculator.computeSize — see sizeCalculator.js for full docs.
// Kept as a thin wrapper so call sites inside this file stay concise.
function _computeSize(scene, cfg, arena) {
  return window.SizeCalculator.computeSize(scene, cfg, arena);
}

// Attaches a Matter.js physics body to obj using the options in cfg.physics.
// Supports rectangle and circle body shapes. Sets mass and collision filter
// if those fields are present in the config.
// dims is the result of SizeCalculator.computeSize — for circles it already
// contains the pre-computed radius so we don't redo the inscribed-circle math.
function _addPhysics(scene, obj, cfg, bodyW, bodyH, dims) {
  const p = cfg.physics;
  let shape = { type: 'rectangle', width: Math.ceil(bodyW), height: Math.ceil(bodyH) };

  if (p?.shape?.type === 'circle') {
    // Use the radius already computed by SizeCalculator (inscribed circle ×
    // resolution ratio × scale × radiusRatio). Fall back to a simple inscribed
    // circle if dims weren't passed for some reason.
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

// Adds health, maxHealth, and a takeDamage(amount) method to obj.
// takeDamage returns true when health drops to zero (signals death to the caller).
// If cfg.onDeath is 'explode' and cfg.blast exists, the secondary blast fires on death.
function _addHealth(obj, cfg) {
  obj.health    = cfg.health;
  obj.maxHealth = cfg.health;

  obj.takeDamage = function (amount) {
    if (!this.active) return false;
    this.health -= amount;
    if (this.health > 0) return false;
    if (cfg.onDeath === 'explode' && cfg.blast) _triggerBlast(this, cfg.blast);
    return true;
  }.bind(obj);
}

// Delegates to SizeCalculator.explosionRadius — see sizeCalculator.js for full docs.
// Kept as a named function so the public export below and _triggerBlast can reference it.
function _explosionFrameRadius(scene, arena, blastScale) {
  return window.SizeCalculator.explosionRadius(scene, arena, blastScale);
}

// Public export — GameLogic._blastRadiusPx delegates here so every blast
// (bomb impact, chain explosion) uses the identical sizing pipeline.
window.ObjectFactory.explosionFrameRadius = _explosionFrameRadius;

// Fires a secondary blast centred on obj using the blast sub-config.
// Radius is driven by the explosion sprite frame so visual and damage always match.
// Force is still scaled to arena width via forceRatio (or a raw value fallback).
function _triggerBlast(obj, blastCfg) {
  if (!obj.scene || !obj.active) return;
  const arena  = window.GameLogic?.arena;
  const radius = _explosionFrameRadius(obj.scene, arena, blastCfg.blastScale ?? 1);
  const force  = arena
    ? (blastCfg.forceRatio != null ? arena.ARENA_W * blastCfg.forceRatio : blastCfg.force)
    : blastCfg.force;
  try {
    window.GameLogic._createBlastRadius(obj.x, obj.y, radius, force, blastCfg.maxDamage);
  } catch (e) {
    console.warn('onDeath explode error:', e);
  }
}

// Creates a player-draggable building and registers it with GameLogic.
// Marks the object with isBuilding, buildingType, and drag-related flags
// so BuildingManager can pick it up and move it.
window.ObjectFactory.createPlaceable = function (scene, type, x, y, arena, options = {}) {
  const cfg = window.ObjectConfig.placeableTypes[type];
  if (!cfg) {
    console.warn(`ObjectFactory.createPlaceable: unknown placeable type "${type}"`);
    return null;
  }

  const dims = _computeSize(scene, cfg, arena);
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
// Sets isLevelObject = true so BuildingManager ignores it on pointer events.
// Never registered with BuildingManager's count or drag system.
window.ObjectFactory.createLevelObject = function (scene, type, x, y, arena) {
  const cfg = window.ObjectConfig.levelTypes[type];
  if (!cfg) {
    console.warn(`ObjectFactory.createLevelObject: unknown level type "${type}"`);
    return null;
  }

  const dims = _computeSize(scene, cfg, arena);
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
// Bombs are tagged with isBomb = true for collision filtering.
// Accepts an optional spawnLocation override in options.
window.ObjectFactory.createInternal = function (scene, type, x, y, arena, options = {}) {
  const cfg = window.ObjectConfig.internalTypes[type];
  if (!cfg) {
    console.warn(`ObjectFactory.createInternal: unknown internal type "${type}"`);
    return null;
  }

  const spawnX = options.spawnLocation ? options.spawnLocation.x : x;
  const spawnY = options.spawnLocation ? options.spawnLocation.y : y;

  const dims = _computeSize(scene, cfg, arena);
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

// Destroys a game object safely, catching any Phaser errors that occur if the
// object has already been removed from the scene.
window.ObjectFactory.destroy = function (obj) {
  if (!obj?.active) return;
  try { obj.destroy(); } catch (e) {
    window.logDebug?.('[ObjectFactory.destroy] destroy failed', e);
  }
};
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
function _buildVisual(scene, cfg, x, y, bodyW, bodyH, renderScale) {
  const displayScale = renderScale ?? cfg.scale ?? 1;
  let obj;

  if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
    if (cfg.animKey) {
      obj = scene.add.sprite(x, y, cfg.imageKey, cfg.startFrame);
      if (scene.anims?.exists?.(cfg.animKey)) obj.play(cfg.animKey);
    } else {
      obj = scene.add.image(x, y, cfg.imageKey, cfg.startFrame);
    }
    obj.setScale(displayScale);
    return obj;
  }

  return scene.add.rectangle(x, y, bodyW, bodyH, cfg.color);
}

// Returns { bodyW, bodyH, renderScale } for a given config and arena.
// When sizeMode is 'ratio', the object is fitted to the arena fraction while
// preserving the texture's aspect ratio. Results are cached per arena size.
function _computeSize(scene, cfg, arena) {
  const scale    = cfg.scale ?? 1;
  const modeKey  = cfg.sizeMode ?? 'texture';
  const wRatio   = cfg.widthRatio  ?? 'na';
  const hRatio   = cfg.heightRatio ?? 'na';
  const imageKey = cfg.imageKey  ?? 'na';
  const frameKey = cfg.startFrame ?? 'base';
  const cacheKey = `${Math.round(arena.ARENA_W)}x${Math.round(arena.ARENA_H)}:${modeKey}:${scale}:${wRatio}:${hRatio}:${imageKey}:${frameKey}`;

  if (cfg._sizeCache?.key === cacheKey) return { ...cfg._sizeCache.size };

  const useRatioSize = cfg.sizeMode === 'ratio'
    && cfg.widthRatio  != null
    && cfg.heightRatio != null;

  if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
    const frame = cfg.startFrame
      ? scene.textures.getFrame(cfg.imageKey, cfg.startFrame)
      : scene.textures.getFrame(cfg.imageKey);
    const texW = frame?.realWidth  || frame?.width  || 32;
    const texH = frame?.realHeight || frame?.height || 32;

    if (useRatioSize) {
      const targetW    = arena.ARENA_W * cfg.widthRatio;
      const targetH    = arena.ARENA_H * cfg.heightRatio;
      const scaleW     = targetW / texW;
      const scaleH     = targetH / texH;
      const renderScale = Math.min(scaleW, scaleH) * scale;
      const size = { bodyW: texW * renderScale, bodyH: texH * renderScale, renderScale };
      cfg._sizeCache = { key: cacheKey, size };
      return { ...size };
    }

    const size = { bodyW: texW * scale, bodyH: texH * scale, renderScale: scale };
    cfg._sizeCache = { key: cacheKey, size };
    return { ...size };
  }

  const bodyW = arena.ARENA_W * cfg.widthRatio * scale;
  const bodyH = arena.ARENA_H * cfg.heightRatio * scale;
  const size  = { bodyW, bodyH, renderScale: scale };
  cfg._sizeCache = { key: cacheKey, size };
  return { ...size };
}

// Attaches a Matter.js physics body to obj using the options in cfg.physics.
// Supports rectangle and circle body shapes. Sets mass and collision filter
// if those fields are present in the config.
function _addPhysics(scene, obj, cfg, bodyW, bodyH) {
  const p = cfg.physics;
  let shape = { type: 'rectangle', width: Math.ceil(bodyW), height: Math.ceil(bodyH) };

  if (p?.shape?.type === 'circle') {
    const baseRadius = Math.max(2, Math.round(Math.min(bodyW, bodyH) * 0.5));
    let radius = baseRadius;
    if (typeof p.shape.radiusRatio === 'number') {
      radius = Math.max(2, Math.round(baseRadius * p.shape.radiusRatio));
    } else if (typeof p.shape.radius === 'number') {
      radius = Math.max(2, Math.round(p.shape.radius));
    }
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

// Fires a secondary blast centred on obj using the blast sub-config.
// Radius and force are resolved from arena ratios so they scale with the arena.
function _triggerBlast(obj, blastCfg) {
  if (!obj.scene || !obj.active) return;
  const arena  = window.GameLogic?.arena;
  const radius = arena
    ? Math.max(arena.ARENA_W, arena.ARENA_H) * blastCfg.radiusRatio
    : 120;
  const force = arena
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

  const { bodyW, bodyH, renderScale } = _computeSize(scene, cfg, arena);
  const obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH, renderScale);

  _addPhysics(scene, obj, cfg, bodyW, bodyH);
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

  const { bodyW, bodyH, renderScale } = _computeSize(scene, cfg, arena);
  const obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH, renderScale);

  if (cfg.physics)            _addPhysics(scene, obj, cfg, bodyW, bodyH);
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

  const { bodyW, bodyH, renderScale } = _computeSize(scene, cfg, arena);
  const obj = _buildVisual(scene, cfg, spawnX, spawnY, bodyW, bodyH, renderScale);

  if (cfg.physics)              _addPhysics(scene, obj, cfg, bodyW, bodyH);
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
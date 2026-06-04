// factories/objectFactory.js
// Creates all game objects (placeables, level objects, internal engine objects).
// Pure creation logic only — helper functions live in objectFactory.helpers.js.

window.ObjectFactory = {};


// ── Placeable buildings (player-placed) ───────────────────────────────────────

// Creates a building the player can drag and drop, registers it with GameLogic.
window.ObjectFactory.createPlaceable = function (scene, type, x, y, arena, options = {}) {
  const cfg = window.ObjectConfig.placeableTypes[type];
  if (!cfg) { console.error(`ObjectFactory.createPlaceable: unknown type "${type}"`); return null; }

  const dims = _computeSize(scene, cfg);
  if (!dims) return null;

  const { bodyW, bodyH, scaleX, scaleY } = dims;
  const obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH, scaleX, scaleY);
  obj._bodyW = bodyW;
  obj._bodyH = bodyH;

  _addPhysics(scene, obj, cfg, bodyW, bodyH, dims);
  _addHealth(obj, cfg);
  _attachPlaceableProps(obj, type, cfg, x, y, options);

  if (window.GameLogic?.addBuilding) window.GameLogic.addBuilding(obj);
  return obj;
};

// Stamps all drag-and-drop metadata onto a placeable object.
function _attachPlaceableProps(obj, type, cfg, x, y, options) {
  obj.setInteractive({ useHandCursor: true });
  obj.objectType = type;
  obj.buildingType = type;
  obj.buildingConfig = cfg;
  obj.isBuilding = true;
  obj.isDragging = false;
  obj.spawnedFromInventory = !!options.fromInventory;
  obj._dragOrigin = { x, y };
  obj._ghostRemoved = false;
}


// ── Level-placed objects (pre-placed by the level designer) ───────────────────

// Creates an object defined in levelTypes (e.g. bomb_crate), registers it with GameLogic.
window.ObjectFactory.createLevelObject = function (scene, type, x, y, arena) {
  const cfg = window.ObjectConfig.levelTypes[type];
  if (!cfg) { console.error(`ObjectFactory.createLevelObject: unknown type "${type}"`); return null; }

  const dims = _computeSize(scene, cfg);
  if (!dims) return null;

  const { bodyW, bodyH, scaleX, scaleY } = dims;
  const obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH, scaleX, scaleY);
  obj._bodyW = bodyW;
  obj._bodyH = bodyH;

  if (cfg.physics) _addPhysics(scene, obj, cfg, bodyW, bodyH, dims);
  if (cfg.health !== undefined) _addHealth(obj, cfg);

  obj.objectType = type;
  obj.buildingConfig = cfg;
  obj.isLevelObject = true;

  if (window.GameLogic?.addBuilding) window.GameLogic.addBuilding(obj);
  return obj;
};


// ── Internal engine objects (plane, bomb, player) ─────────────────────────────

// Creates an object defined in internalTypes.
// Accepts an optional spawnLocation override via options.
// For player, accepts skinKey to override the default player image.
window.ObjectFactory.createInternal = function (scene, type, x, y, arena, options = {}) {
  const cfg = window.ObjectConfig.internalTypes[type];
  if (!cfg) { console.error(`ObjectFactory.createInternal: unknown type "${type}"`); return null; }

  const spawnX = options.spawnLocation?.x ?? x;
  const spawnY = options.spawnLocation?.y ?? y;

  // For player, override the imageKey with the equipped skin if provided
  const originalImageKey = cfg.imageKey;
  if (type === 'player' && options.skinKey) {
    cfg.imageKey = options.skinKey;
  } else if (cfg.spriteKey && !cfg.imageKey) {
    cfg.imageKey = cfg.spriteKey;
  }

  const dims = _computeSize(scene, cfg);
  if (!dims) return null;

  const { bodyW, bodyH, scaleX, scaleY } = dims;
  const obj = _buildVisual(scene, cfg, spawnX, spawnY, bodyW, bodyH, scaleX, scaleY);
  obj._bodyW = bodyW;
  obj._bodyH = bodyH;

  // Restore original imageKey
  cfg.imageKey = originalImageKey;

  if (cfg.physics) _addPhysics(scene, obj, cfg, bodyW, bodyH, dims);
  if (cfg.health !== undefined) _addHealth(obj, cfg);

  obj.objectType = type;
  if (type === 'bomb' || type === 'smallBomb' || cfg.physics?.label === 'bomb') obj.isBomb = true;

  return obj;
};


// ── Destruction ───────────────────────────────────────────────────────────────

window.ObjectFactory.destroy = function (obj) {
  if (!obj?.active) return;
  window.ObjectFactory.destroyDebugLabel(obj);
  try { obj.destroy(); } catch (e) { }
};


// ── Debug label API ───────────────────────────────────────────────────────────

window.ObjectFactory.updateDebugLabels = function (objects) {
  for (const obj of objects) _updateHpLabel(obj);
};

window.ObjectFactory.destroyDebugLabel = function (obj) {
  if (obj?._hpLabel?.active) { obj._hpLabel.destroy(); obj._hpLabel = null; }
};
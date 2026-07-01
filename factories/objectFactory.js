// factories/objectFactory.js
// Creates all game objects (placeables, level objects, internal engine objects).
// Restructured using the Gang of Four (GoF) Factory Method & Template Method patterns.

class BaseObjectCreator {
  create(scene, type, x, y, arena, options = {}) {
    const cfg = this.getConfig(type, options);
    if (!cfg) {
      console.error(`ObjectCreator: unknown type "${type}"`);
      return null;
    }

    const { spawnX, spawnY } = this.resolveSpawnLocation(x, y, options);

    // Save configuration states that might be modified during visual building
    this.preVisualBuild(cfg, type, options);

    const dims = _computeSize(scene, cfg);
    if (!dims) return null;

    const { bodyW, bodyH, scaleX, scaleY } = dims;
    const obj = _buildVisual(scene, cfg, spawnX, spawnY, bodyW, bodyH, scaleX, scaleY, type);
    obj._bodyW = bodyW;
    obj._bodyH = bodyH;

    this.postVisualBuild(cfg, type, options);

    if (this.shouldAttachPhysics(cfg)) {
      _addPhysics(scene, obj, cfg, bodyW, bodyH, dims);
    }

    if (obj instanceof window.DestructibleEntity && cfg.health !== undefined) {
      obj.setHealth(cfg.health);
    }

    this.decorateProperties(obj, type, cfg, options);

    this.register(obj);

    return obj;
  }

  getConfig(type, options) {
    return null;
  }

  resolveSpawnLocation(x, y, options) {
    return { spawnX: x, spawnY: y };
  }

  preVisualBuild(cfg, type, options) {}
  postVisualBuild(cfg, type, options) {}

  shouldAttachPhysics(cfg) {
    return !!cfg.physics;
  }

  shouldAttachHealth(cfg) {
    return cfg.health !== undefined;
  }

  decorateProperties(obj, type, cfg, options) {
    obj.objectType = type;
  }

  register(obj) {
    if (window.EntityManager && (obj instanceof window.DestructibleEntity)) {
      window.EntityManager.registerEntity(obj);
    }
  }
}

class PlaceableCreator extends BaseObjectCreator {
  getConfig(type, options) {
    return window.ObjectConfig.placeableTypes[type];
  }

  decorateProperties(obj, type, cfg, options) {
    obj.setInteractive({ useHandCursor: true });
    obj.objectType = type;
    obj.buildingType = type;
    obj.buildingConfig = cfg;
    obj.isBuilding = true;
    obj.isDragging = false;
    obj.spawnedFromInventory = !!options.fromInventory;
    obj._dragOrigin = { x: obj.x, y: obj.y };
    obj._ghostRemoved = false;
  }
}

class LevelObjectCreator extends BaseObjectCreator {
  getConfig(type, options) {
    return window.ObjectConfig.levelTypes[type] || window.ObjectConfig.internalTypes[type];
  }

  decorateProperties(obj, type, cfg, options) {
    obj.objectType = type;
    obj.buildingConfig = cfg;
    obj.isLevelObject = true;
  }
}

class InternalObjectCreator extends BaseObjectCreator {
  getConfig(type, options) {
    return window.ObjectConfig.internalTypes[type];
  }

  resolveSpawnLocation(x, y, options) {
    const spawnX = options.spawnLocation?.x ?? x;
    const spawnY = options.spawnLocation?.y ?? y;
    return { spawnX, spawnY };
  }

  preVisualBuild(cfg, type, options) {
    this.originalImageKey = cfg.imageKey;
    if (type === 'player' && options.skinKey) {
      cfg.imageKey = options.skinKey;
    } else if (cfg.spriteKey && !cfg.imageKey) {
      cfg.imageKey = cfg.spriteKey;
    }
  }

  postVisualBuild(cfg, type, options) {
    if (this.originalImageKey !== undefined) {
      cfg.imageKey = this.originalImageKey;
    }
  }

  decorateProperties(obj, type, cfg, options) {
    obj.objectType = type;
    if (type === 'bomb' || type === 'smallBomb' || cfg.physics?.label === 'bomb') {
      obj.isBomb = true;
    }
  }

  register(obj) {
    super.register(obj);
  }
}

const placeableCreator = new PlaceableCreator();
const levelObjectCreator = new LevelObjectCreator();
const internalObjectCreator = new InternalObjectCreator();

window.ObjectFactory = {
  createPlaceable(scene, type, x, y, arena, options = {}) {
    return placeableCreator.create(scene, type, x, y, arena, options);
  },

  createLevelObject(scene, type, x, y, arena, options = {}) {
    return levelObjectCreator.create(scene, type, x, y, arena, options);
  },

  createInternal(scene, type, x, y, arena, options = {}) {
    return internalObjectCreator.create(scene, type, x, y, arena, options);
  },
}
// ── Destruction ───────────────────────────────────────────────────────────────

window.ObjectFactory.destroy = function (obj) {
  if (!obj?.active) return;
  try { obj.destroy(); } catch (e) { }
};


// ── Debug label API ───────────────────────────────────────────────────────────

window.ObjectFactory.updateDebugLabels = function (objects) {
  // Now handled automatically by EntityManager
};

window.ObjectFactory.destroyDebugLabel = function (obj) {
  if (obj && typeof obj.destroyHpLabel === 'function') {
    obj.destroyHpLabel();
  } else if (obj?._hpLabel?.active) {
    obj._hpLabel.destroy();
    obj._hpLabel = null;
  }
};
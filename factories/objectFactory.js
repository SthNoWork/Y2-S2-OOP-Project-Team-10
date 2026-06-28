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
    const obj = _buildVisual(scene, cfg, spawnX, spawnY, bodyW, bodyH, scaleX, scaleY);
    obj._bodyW = bodyW;
    obj._bodyH = bodyH;

    this.postVisualBuild(cfg, type, options);

    if (this.shouldAttachPhysics(cfg)) {
      _addPhysics(scene, obj, cfg, bodyW, bodyH, dims);
    }

    if (this.shouldAttachHealth(cfg)) {
      _addHealth(obj, cfg);
    }

    this.decorateProperties(obj, type, cfg, options);

    _addWeaponCapabilities(obj, cfg);
    if (type.includes('trampoline')) _setupTrampolineCapabilities(obj, cfg);

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
    if (window.GameLogic?.addBuilding) window.GameLogic.addBuilding(obj);
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
    if (type === 'plane') {
      _setupPlaneCapabilities(obj, cfg);
    }
  }

  register(obj) {
    // Internal engine objects (bombs, plane, player) are not managed directly under buildings list
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
  if (obj._weaponTimer) {
    try { obj._weaponTimer.destroy(); } catch (e) {}
    obj._weaponTimer = null;
  }
  if (obj.objectType === 'plane') {
    if (obj._updateHandler && obj.scene) {
      try { obj.scene.events.off('update', obj._updateHandler); } catch (e) {}
    }
    if (obj._bombTimerEvent) {
      try { obj._bombTimerEvent.destroy(); } catch (e) {}
      obj._bombTimerEvent = null;
    }
    if (obj._blade?.active) {
      try { obj._blade.destroy(); } catch (e) {}
      obj._blade = null;
    }
  }
  window.ObjectFactory.destroyDebugLabel(obj);

  // Clean up constraints attached to this body
  if (obj.body && obj.body._constraints) {
    for (const c of obj.body._constraints) {
      try {
        if (obj.scene && obj.scene.matter?.world) {
          obj.scene.matter.world.removeConstraint(c);
        }
      } catch (e) {}
      // Also clean references from the other body
      const other = c.bodyA === obj.body ? c.bodyB : c.bodyA;
      if (other && other._constraints) {
        other._constraints = other._constraints.filter(x => x !== c);
      }
    }
    obj.body._constraints = [];
  }

  try { obj.destroy(); } catch (e) { }
};


// ── Debug label API ───────────────────────────────────────────────────────────

window.ObjectFactory.updateDebugLabels = function (objects) {
  for (const obj of objects) _updateHpLabel(obj);
};

window.ObjectFactory.destroyDebugLabel = function (obj) {
  if (obj?._hpLabel?.active) { obj._hpLabel.destroy(); obj._hpLabel = null; }
};
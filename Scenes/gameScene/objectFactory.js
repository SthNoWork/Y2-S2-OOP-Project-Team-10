window.ObjectFactory = {};

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
      console.error(`[ObjectFactory._computeSize] frame "${cfg.startFrame ?? '(base)'}" not found in "${cfg.imageKey}"`);
      return null;
    }

    const texW = frame.realWidth  || frame.width;
    const texH = frame.realHeight || frame.height;

    if (!texW || !texH) {
      console.error(`[ObjectFactory._computeSize] frame has zero dimensions`);
      return null;
    }

    if (cfg.physics?.shape?.type === 'circle') {
      const inscribed   = Math.min(texW, texH) / 2;
      const radiusRatio = cfg.physics.shape.radiusRatio ?? 1;
      const radius      = Math.max(2, Math.round(inscribed * scale * radiusRatio));
      return { bodyW: radius * 2, bodyH: radius * 2, scaleX: scale, scaleY: scale, radius };
    }

    return { bodyW: texW * scale, bodyH: texH * scale, scaleX: scale, scaleY: scale };
  }

  if (cfg.width == null || cfg.height == null) {
    console.error('[ObjectFactory._computeSize] no useImage and no explicit width/height', cfg);
    return null;
  }
  return { bodyW: cfg.width, bodyH: cfg.height, scaleX: 1, scaleY: 1 };
}

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

function _addPhysics(scene, obj, cfg, bodyW, bodyH, dims) {
  const p     = cfg.physics;
  let   shape = { type: 'rectangle', width: Math.ceil(bodyW), height: Math.ceil(bodyH) };

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
      try { Phaser.Physics.Matter.Matter.Body.setMass(obj.body, p.mass); } catch (e) {}
    }
    if (p.collisionFilter && obj.body.collisionFilter) {
      obj.body.collisionFilter.category = p.collisionFilter.category;
      obj.body.collisionFilter.mask     = p.collisionFilter.mask;
    }
  }
}

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

    return this.health <= 0;
  }.bind(obj);
}

function _updateHpLabel(obj) {
  if (!obj?.active) return;

  if (!window.DEBUG) {
    if (obj._hpLabel?.active) { obj._hpLabel.destroy(); obj._hpLabel = null; }
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

window.ObjectFactory.updateDebugLabels = function (objects) {
  for (const obj of objects) _updateHpLabel(obj);
};

window.ObjectFactory.destroyDebugLabel = function (obj) {
  if (obj?._hpLabel?.active) { obj._hpLabel.destroy(); obj._hpLabel = null; }
};

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

window.ObjectFactory.createLevelObject = function (scene, type, x, y, arena) {
  const cfg = window.ObjectConfig.levelTypes[type];
  if (!cfg) { console.error(`ObjectFactory.createLevelObject: unknown type "${type}"`); return null; }

  const dims = _computeSize(scene, cfg);
  if (!dims) return null;

  const { bodyW, bodyH, scaleX, scaleY } = dims;
  const obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH, scaleX, scaleY);
  obj._bodyW = bodyW;
  obj._bodyH = bodyH;

  if (cfg.physics)              _addPhysics(scene, obj, cfg, bodyW, bodyH, dims);
  if (cfg.health !== undefined) _addHealth(obj, cfg);

  obj.objectType    = type;
  obj.buildingConfig = cfg;
  obj.isLevelObject = true;

  if (window.GameLogic?.addBuilding) window.GameLogic.addBuilding(obj);
  return obj;
};

window.ObjectFactory.createInternal = function (scene, type, x, y, arena, options = {}) {
  const cfg = window.ObjectConfig.internalTypes[type];
  if (!cfg) { console.error(`ObjectFactory.createInternal: unknown type "${type}"`); return null; }

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

window.ObjectFactory.destroy = function (obj) {
  if (!obj?.active) return;
  window.ObjectFactory.destroyDebugLabel(obj);
  try { obj.destroy(); } catch (e) {}
};
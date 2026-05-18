// ========================================
  // OBJECT FACTORY
  // ========================================
  // PUBLIC API:
  //   ObjectFactory.createPlaceable(scene, type, x, y, arena, options) → game object
  //   ObjectFactory.createLevelObject(scene, type, x, y, arena)        → game object
  //   ObjectFactory.createInternal(scene, type, x, y, arena, options)  → game object
  //   ObjectFactory.destroy(obj)                                        → void
  //
  window.ObjectFactory = {};
  // ========================================
  // HELPERS  (module-private)
  // ========================================

  function _buildVisual(scene, cfg, x, y, bodyW, bodyH) {
    const displayScale = cfg.scale ?? 1;
    let obj;
    if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
      if (cfg.animKey) {
        obj = scene.add.sprite(x, y, cfg.imageKey, cfg.startFrame);
        if (scene.anims?.exists?.(cfg.animKey)) {
          obj.play(cfg.animKey);
        }
      } else {
        obj = scene.add.image(x, y, cfg.imageKey, cfg.startFrame);
      }
      obj.setScale(displayScale);
      return obj;
    }
    // Rectangle: bodyW/bodyH already include scale, so draw at those dimensions.
    return scene.add.rectangle(x, y, bodyW, bodyH, cfg.color);
  }

  function _computeSize(scene, cfg, arena) {
    const cacheKey = `${Math.round(arena.ARENA_W)}x${Math.round(arena.ARENA_H)}`;
    if (cfg._sizeCache?.key === cacheKey) {
      return { ...cfg._sizeCache.size };
    }

    const scale = cfg.scale ?? 1;

    if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
      const frame = cfg.startFrame
        ? scene.textures.getFrame(cfg.imageKey, cfg.startFrame)
        : scene.textures.getFrame(cfg.imageKey);
      const texW  = frame?.realWidth  || frame?.width  || 32;
      const texH  = frame?.realHeight || frame?.height || 32;
      // Apply cfg.scale so the physics body matches the displayed size.
      const size = { bodyW: texW * scale, bodyH: texH * scale };
      cfg._sizeCache = { key: cacheKey, size };
      return { ...size };
    }

    const bodyW = arena.ARENA_W * cfg.widthRatio * scale;
    const bodyH = arena.ARENA_H * cfg.heightRatio * scale;
    const size = { bodyW, bodyH };
    cfg._sizeCache = { key: cacheKey, size };
    return { ...size };
  }

  function _addPhysics(scene, obj, cfg, bodyW, bodyH) {
    const p     = cfg.physics;
    let shape = { type: 'rectangle', width: Math.ceil(bodyW), height: Math.ceil(bodyH) };
    if (p?.shape?.type === 'circle') {
      const radius = Math.max(2, Math.round(Math.min(bodyW, bodyH) * 0.5));
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

  function _addHealth(obj, cfg) {
    obj.health    = cfg.health;
    obj.maxHealth = cfg.health;

    obj.takeDamage = function (amount) {
      if (!this.active) return false;
      this.health -= amount;
      if (this.health > 0) return false;
      if (cfg.onDeath === 'explode' && cfg.blast) {
        _triggerBlast(this, cfg.blast);
      }
      return true;
    }.bind(obj);
  }

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

  // ========================================
  // ObjectFactory.createPlaceable
  // ========================================
  // Spawns a player-draggable building.
  // Registers with BuildingManager count system and GameLogic blast queries.

  window.ObjectFactory.createPlaceable = function (scene, type, x, y, arena, options = {}) {
    const cfg = window.ObjectConfig.placeableTypes[type];
    if (!cfg) {
      console.warn(`ObjectFactory.createPlaceable: unknown placeable type "${type}"`);
      return null;
    }

    const { bodyW, bodyH } = _computeSize(scene, cfg, arena);
    const obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH);

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

    if (window.GameLogic?.addBuilding) {
      window.GameLogic.addBuilding(obj);
    }

    return obj;
  };

  // ========================================
  // ObjectFactory.createLevelObject
  // ========================================
  // Spawns a level-designer object (bomb_crate, scenery, etc.).
  // NEVER registered with BuildingManager.
  // IS registered with GameLogic so blasts can damage/destroy them.
  // isLevelObject=true tells BuildingManager.onPointerDown to skip it.

  window.ObjectFactory.createLevelObject = function (scene, type, x, y, arena) {
    const cfg = window.ObjectConfig.levelTypes[type];
    if (!cfg) {
      console.warn(`ObjectFactory.createLevelObject: unknown level type "${type}"`);
      return null;
    }

    const { bodyW, bodyH } = _computeSize(scene, cfg, arena);
    const obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH);

    if (cfg.physics) {
      _addPhysics(scene, obj, cfg, bodyW, bodyH);
    }
    if (cfg.health !== undefined) {
      _addHealth(obj, cfg);
    }

    obj.objectType    = type;
    obj.isLevelObject = true;

    if (window.GameLogic?.addBuilding) {
      window.GameLogic.addBuilding(obj);
    }

    return obj;
  };

  // ========================================
  // ObjectFactory.createInternal
  // ========================================
  // Spawns engine-internal objects: bomb, plane, player.

  window.ObjectFactory.createInternal = function (scene, type, x, y, arena, options = {}) {
    const cfg = window.ObjectConfig.internalTypes[type];
    if (!cfg) {
      console.warn(`ObjectFactory.createInternal: unknown internal type "${type}"`);
      return null;
    }

    const spawnX = options.spawnLocation ? options.spawnLocation.x : x;
    const spawnY = options.spawnLocation ? options.spawnLocation.y : y;

    const { bodyW, bodyH } = _computeSize(scene, cfg, arena);
    const obj = _buildVisual(scene, cfg, spawnX, spawnY, bodyW, bodyH);

    if (cfg.physics) {
      _addPhysics(scene, obj, cfg, bodyW, bodyH);
    }
    if (cfg.health !== undefined) {
      _addHealth(obj, cfg);
    }

    obj.objectType = type;

    if (type === 'bomb') obj.isBomb = true;

    return obj;
  };

  // ========================================
  // ObjectFactory.destroy
  // ========================================

  window.ObjectFactory.destroy = function (obj) {
    if (!obj?.active) return;
    try { obj.destroy(); } catch (e) {
      window.logDebug?.('[ObjectFactory.destroy] destroy failed', e);
    }
  };
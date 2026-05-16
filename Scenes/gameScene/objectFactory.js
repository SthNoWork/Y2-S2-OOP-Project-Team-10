  // ========================================
  // OBJECT FACTORY
  // ========================================
  // Two completely separate config sections:
  //
  //   ObjectConfig.placeableTypes  — player-draggable buildings (BuildingManager owns these)
  //   ObjectConfig.levelTypes      — level-only objects: pre-placed scenery, bomb_crate, etc.
  //                                  LevelManager spawns these directly; BuildingManager
  //                                  never sees them and they never count toward placement caps.
  //
  // Engine internals (bomb, plane, player) live in ObjectConfig.internalTypes.
  //
  // PUBLIC API:
  //   ObjectFactory.createPlaceable(scene, type, x, y, arena, options) → game object
  //   ObjectFactory.createLevelObject(scene, type, x, y, arena)        → game object
  //   ObjectFactory.createInternal(scene, type, x, y, arena, options)  → game object
  //   ObjectFactory.destroy(obj)                                        → void
  //

  window.ObjectConfig  = {};
  window.ObjectFactory = {};

  // ========================================
  // PLACEABLE TYPES
  // ========================================
  // Player-draggable buildings.
  // BuildingManager reads these for inventory controls and placement caps.

  window.ObjectConfig.placeableTypes = {

    shortPlank: {
      widthRatio:  0.15,
      heightRatio: 0.04,
      color:       0x8b4513,
      physics: {
        friction:    0.8,
        restitution: 0.2,
        frictionAir: 0.01,
        label:       'building',
        mass:        8,
      },
      health:   30,
      onDeath:  'remove',
      maxCount: 5,
    },

    thickPlank: {
      widthRatio:  0.1,
      heightRatio: 0.08,
      color:       0x654321,
      physics: {
        friction:    0.9,
        restitution: 0.1,
        frictionAir: 0.01,
        label:       'building',
        mass:        14,
      },
      health:   60,
      onDeath:  'remove',
      maxCount: 3,
    },

    wall: {
      widthRatio:  0.06,
      heightRatio: 0.2,
      color:       0x696969,
      physics: {
        friction:    0.8,
        restitution: 0.0,
        frictionAir: 0.01,
        label:       'building',
        mass:        30,
      },
      health:   80,
      onDeath:  'remove',
      maxCount: 2,
    },

  };

  // ========================================
  // LEVEL TYPES
  // ========================================
  // Objects placed by the level designer in levels.js.
  // LevelManager spawns these via ObjectFactory.createLevelObject().
  // They are NEVER registered with BuildingManager — no maxCount, no drag,
  // no placement caps. They DO register with GameLogic so blasts can damage them.

  window.ObjectConfig.levelTypes = {

    // Explodes when destroyed — chain reactions work automatically.
    bomb_crate: {
      widthRatio:  0.07,
      heightRatio: 0.07,
      color:       0xa0522d,
      useImage:    true,
      imageKey:    'bomb_crate',
      physics: {
        friction:    0.8,
        restitution: 0.15,
        frictionAir: 0.01,
        label:       'building',
        mass:        10,
      },
      health:  5,
      onDeath: 'explode',
      blast: {
        radiusRatio: 0.18,
        force:       4000,
        maxDamage:   60,
      },
    },

  };

  // ========================================
  // INTERNAL TYPES  (engine use only)
  // ========================================
  // bomb, plane, player — spawned by GameLogic / LevelManager.

  window.ObjectConfig.internalTypes = {

    bomb: {
      widthRatio:       0.025,
      heightRatio:      0.035,
      color:            0x333333,
      physics: {
        friction:       0.8,
        restitution:    0.1,
        frictionAir:    0.01,
        label:          'bomb',
        collisionFilter: {
          category: 0x0004,
          mask:     0x0001 | 0x0002 | 0x0008,
        },
      },
      blastRadiusRatio: 0.2,
      blastForce:       200,
      directHitDamage:  50,
      blastMaxDamage:   50,
    },

    plane: {
      widthRatio:               0.12,
      heightRatio:              0.05,
      color:                    0xffaa00,
      bombDropDelayRangeSec:    { min: 0.18, max: 0.45 },
      bombDropOffsetRatioRange: { min: -0.35, max: 0.35 },
      bombDropYOffsetRatio:     0.04,
    },

    player: {
      widthRatio:  0.08,
      heightRatio: 0.08,
      color:       0x00ff00,
      physics: {
        friction:    0.5,
        restitution: 0.1,
        frictionAir: 0.02,
        label:       'player',
        mass:        5,
      },
      health:  100,
      onDeath: 'remove',
    },

  };


  // ========================================
  // HELPERS  (module-private)
  // ========================================

  function _buildVisual(scene, cfg, x, y, bodyW, bodyH) {
    if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
      return scene.add.image(x, y, cfg.imageKey).setDisplaySize(bodyW, bodyH);
    }
    return scene.add.rectangle(x, y, bodyW, bodyH, cfg.color);
  }

  function _computeSize(scene, cfg, arena) {
    const cacheKey = `${Math.round(arena.ARENA_W)}x${Math.round(arena.ARENA_H)}`;
    if (cfg._sizeCache?.key === cacheKey) {
      return { ...cfg._sizeCache.size };
    }

    const bodyW = arena.ARENA_W * cfg.widthRatio;
    const bodyH = arena.ARENA_H * cfg.heightRatio;
    if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
      const frame = scene.textures.getFrame(cfg.imageKey);
      const texW  = frame?.realWidth  || frame?.width  || 32;
      const texH  = frame?.realHeight || frame?.height || 32;
      const size = { bodyW, bodyH: bodyW * (texH / texW) };
      cfg._sizeCache = { key: cacheKey, size };
      return { ...size };
    }
    const size = { bodyW, bodyH };
    cfg._sizeCache = { key: cacheKey, size };
    return { ...size };
  }

  function _addPhysics(scene, obj, cfg, bodyW, bodyH) {
    const p = cfg.physics;

    let shape = null;
    if (p.shape && typeof p.shape === 'object') {
      shape = { ...p.shape };
      if (shape.type === 'fromTexture' && !obj.texture) {
        shape = null;
      }
    }
    if (!shape) {
      shape = { type: 'rectangle', width: Math.ceil(bodyW), height: Math.ceil(bodyH) };
    }

    try {
      scene.matter.add.gameObject(obj, {
        friction:    p.friction,
        restitution: p.restitution,
        frictionAir: p.frictionAir,
        label:       p.label || 'object',
        shape,
      });
    } catch (e) {
      if (shape?.type === 'fromTexture') {
        const fallback = { type: 'rectangle', width: Math.ceil(bodyW), height: Math.ceil(bodyH) };
        console.warn('fromTexture shape failed; falling back to rectangle.', e);
        scene.matter.add.gameObject(obj, {
          friction:    p.friction,
          restitution: p.restitution,
          frictionAir: p.frictionAir,
          label:       p.label || 'object',
          shape:       fallback,
        });
      } else {
        throw e;
      }
    }

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
    try {
      window.GameLogic._createBlastRadius(obj.x, obj.y, radius, blastCfg.force, blastCfg.maxDamage);
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
    let obj = null;
    const wantsFromTexture = false;

    if (wantsFromTexture && scene.textures.exists(cfg.imageKey)) {
      try {
        const p = cfg.physics;
        obj = scene.matter.add.sprite(x, y, cfg.imageKey, null, {
          friction:    p.friction,
          restitution: p.restitution,
          frictionAir: p.frictionAir,
          label:       p.label || 'object',
          shape:       { type: 'fromTexture' },
        });
        obj.setDisplaySize(bodyW, bodyH);

        if (p.mass !== undefined) {
          try { Phaser.Physics.Matter.Matter.Body.setMass(obj.body, p.mass); } catch (e) {}
        }
        if (p.collisionFilter && obj.body?.collisionFilter) {
          obj.body.collisionFilter.category = p.collisionFilter.category;
          obj.body.collisionFilter.mask     = p.collisionFilter.mask;
        }
      } catch (e) {
        console.warn('fromTexture shape not supported; falling back to rectangle.', e);
        obj = null;
      }
    }

    if (!obj) {
      obj = _buildVisual(scene, cfg, x, y, bodyW, bodyH);

      if (cfg.physics) {
        _addPhysics(scene, obj, cfg, bodyW, bodyH);
      }
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
    try { obj.destroy(); } catch (e) {}
  };

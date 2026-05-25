// core/buildingManager.js
// Manages player-placed buildings: inventory UI, drag-and-drop placement,
// placement validation, and building destruction.

window.BuildingManager = {

  scene:              null,
  arena:              null,
  draggingBuilding:   null,
  placedBuildings:    [],
  buildingCounts:     {},   // alive placed count per type (decrements on destroy)
  _totalPlacedCounts: {},   // ever-placed count per type (never decrements, used for scoring)
  _inventoryButtons:  [],
  _inventoryButtonsByType: {},
  _handlers:          null,
  dragMoveThreshold:  1,

  init(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this.resetState();
    this._createInventoryButtons();
    this.setupInputHandlers();
  },

  resetState() {
    this.draggingBuilding  = null;
    this.placedBuildings   = [];
    this._inventoryButtons = [];
    this._inventoryButtonsByType = {};

    Object.keys(window.ObjectConfig.placeableTypes).forEach((type) => {
      this.buildingCounts[type]     = 0;
      this._totalPlacedCounts[type] = 0;
    });
  },

  setupInputHandlers() {
    this._removeExistingHandlers();

    this._handlers = {
      down: (p) => this.onPointerDown(p),
      move: (p) => this.onPointerMove(p),
      up:   (p) => this.onPointerUp(p),
    };

    this.scene.input.on('pointerdown', this._handlers.down);
    this.scene.input.on('pointermove', this._handlers.move);
    this.scene.input.on('pointerup',   this._handlers.up);
  },

  _removeExistingHandlers() {
    if (!this._handlers || !this.scene?.input) return;

    try {
      this.scene.input.off('pointerdown', this._handlers.down);
      this.scene.input.off('pointermove', this._handlers.move);
      this.scene.input.off('pointerup',   this._handlers.up);
    } catch (e) {
      window.logDebug?.('[BuildingManager] off handlers failed', e);
    }
  },

  lockPlacement() {
    if (this.draggingBuilding) {
      const building = this.draggingBuilding;

      this._setPhysicsGhost(building, false);

      if (building.spawnedFromInventory) {
        this.destroyBuilding(building);
      } else if (building._dragOrigin) {
        this._returnToOrigin(building);
      }

      this._finaliseDrop(building);
    }

    this._removeExistingHandlers();

    for (const btn of this._inventoryButtons) {
      if (btn?.active) {
        btn.disableInteractive();
        btn.setAlpha(0.35);
      }
    }

    for (const b of this.placedBuildings) {
      if (b?.active) b.disableInteractive();
    }
  },

  onPointerDown(pointer) {
    const hit = this._getPointerHits(pointer)
      .find((obj) => !obj.isLevelObject && (obj.isBuilding || obj.buildingConfig));

    if (hit) this._startDragging(hit, pointer);
  },

  _startDragging(obj, pointer) {
    this.draggingBuilding = obj;
    obj.isDragging = true;
    obj._lastDragPos = { x: pointer.x, y: pointer.y };
    obj._cachedBounds = obj.getBounds?.() ?? null;

    this._setPhysicsGhost(obj, true);
    obj.setDepth(1000);
  },

  onPointerMove(pointer) {
    if (!this.draggingBuilding?.isDragging) return;
    if (!this._hasMovedEnough(pointer)) return;

    this._moveObjectToPointer(this.draggingBuilding, pointer);

    this.draggingBuilding._lastDragPos = { x: pointer.x, y: pointer.y };
    this.draggingBuilding._cachedBounds = this.draggingBuilding.getBounds?.() ?? null;
  },

  _hasMovedEnough(pointer) {
    const last = this.draggingBuilding._lastDragPos;
    if (!last) return true;

    const dx = pointer.x - last.x;
    const dy = pointer.y - last.y;

    return dx * dx + dy * dy >= this.dragMoveThreshold * this.dragMoveThreshold;
  },

  _moveObjectToPointer(obj, pointer) {
    if (obj.body) {
      Phaser.Physics.Matter.Matter.Body.setPosition(obj.body, {
        x: pointer.x,
        y: pointer.y
      });
    } else {
      obj.x = pointer.x;
      obj.y = pointer.y;
    }
  },

  onPointerUp() {
    if (!this.draggingBuilding) return;

    const building = this.draggingBuilding;
    const valid = this.isPlacementValid(building);

    this._setPhysicsGhost(building, false);

    if (!valid) {
      this._handleInvalidDrop(building);
    } else {
      this._handleValidDrop(building);
    }
  },

  _handleInvalidDrop(building) {
    if (building.spawnedFromInventory) {
      this.destroyBuilding(building);
    } else if (building._dragOrigin) {
      this._returnToOrigin(building);
    }
    this._finaliseDrop(building);
  },

  _returnToOrigin(building) {
    const { x, y } = building._dragOrigin;

    if (building.body) {
      try {
        Phaser.Physics.Matter.Matter.Body.setPosition(building.body, { x, y });
        this._resetBody(building);
      } catch (e) {
        window.logDebug?.('[BuildingManager._returnToOrigin] reset body failed', e);
      }
    }

    building.x = x;
    building.y = y;
  },

  _handleValidDrop(building) {
    this._finaliseDrop(building);
  },

  _finaliseDrop(building) {
    building.isDragging = false;
    building._lastDragPos = null;
    building._cachedBounds = null;
    building.setDepth(0);

    if (building.body) {
      try {
        this._resetBody(building);
      } catch (e) {
        window.logDebug?.('[BuildingManager._finaliseDrop] stop body failed', e);
      }
    }

    this.draggingBuilding = null;
  },

  _resetBody(obj) {
    if (!obj?.body) return;

    Phaser.Physics.Matter.Matter.Body.setVelocity(obj.body, { x: 0, y: 0 });
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(obj.body, 0);
  },

  _setPhysicsGhost(building, enabled) {
    if (!building?.body) return;

    try {
      building.body.collisionFilter.mask = enabled ? 0 : -1;
      building.body.ignoreGravity = !!enabled;

      if (enabled) this._resetBody(building);
    } catch (e) {
      window.logDebug?.('[BuildingManager._setPhysicsGhost] update body failed', e);
    }
  },

  isPlacementValid(building) {
    if (!building?.body) return true;

    const bounds = building._cachedBounds ?? building.getBounds?.() ?? null;
    if (!bounds) return false;

    const bodies =
      this.scene.matter.intersectRect(bounds.x, bounds.y, bounds.width, bounds.height) || [];

    return bodies.every((body) => {
      const obj = body?.gameObject;
      return !obj || obj === building;
    });
  },

  _getPointerHits(pointer) {
    if (!this.placedBuildings?.length) return [];
    return this.scene.input.hitTestPointer(pointer, this.placedBuildings) || [];
  },

  _createInventoryButtons() {
    const { ARENA_X, ARENA_Y, ARENA_H } = this.arena;

    const buttonY = ARENA_Y + ARENA_H - 65;
    const buttonW = 220;
    const buttonH = 44;
    const gap = 18;
    const spacing = buttonW + gap;
    let x = ARENA_X + 38 + buttonW / 2;

    this._getAllowedBuildingTypes().forEach((type) => {
      this._createInventoryButton(x, buttonY, type, buttonW, buttonH);
      x += spacing;
    });
  },

  _getRemainingCount(type) {
    const cfg = window.ObjectConfig.placeableTypes[type];
    const max = Number(cfg?.maxCount) || 0;
    const placed = this.buildingCounts[type] || 0;
    return Math.max(0, max - placed);
  },

  _formatInventoryLabel(type) {
    return `${type} x${this._getRemainingCount(type)}`;
  },

  _refreshInventoryLabel(type) {
    const label = this._inventoryButtonsByType[type];
    if (!label) return;
    label.setText(this._formatInventoryLabel(type));
  },

  _getAllowedBuildingTypes() {
    const allowed = window.LevelManager?.levelCfg?.allowedBuildings ?? {};
    return Object.keys(allowed).filter(
      (t) => window.ObjectConfig.placeableTypes[t]
    );
  },

  _createInventoryButton(x, y, type, buttonW, buttonH) {
    const cfg = window.ObjectConfig.placeableTypes[type];
    if (!cfg) return null;

    const color = cfg.color ? cfg.color : 0x4a4a4a;
    const bg = this.scene.add.rectangle(x, y, buttonW, buttonH, color, 1);
    const label = this.scene.add.text(x, y, this._formatInventoryLabel(type), {
      fontSize: '27px',
      fill: '#fff',
    });

    bg.setInteractive({ useHandCursor: true });
    label.setInteractive({ useHandCursor: true });
    bg.setDepth(1999);
    label.setDepth(2000);
    label.setOrigin(0.5);

    const onSelect = () => {
      if (this._getRemainingCount(type) <= 0) return;
      const b = this._createBuilding(type, x, y, { fromInventory: true });

      if (b) {
        this.draggingBuilding = b;
        b.isDragging = true;
        this._setPhysicsGhost(b, true);
        b.setDepth(1000);
      }
    };

    bg.on('pointerdown', onSelect);
    label.on('pointerdown', onSelect);

    this._inventoryButtons.push(bg, label);
    this._inventoryButtonsByType[type] = label;
    return label;
  },

  _createBuilding(type, x, y, options = {}) {
    const cfg = window.ObjectConfig.placeableTypes[type];
    if (!cfg) return null;

    if ((this.buildingCounts[type] || 0) >= cfg.maxCount) return null;

    const building = window.ObjectFactory.createPlaceable(
      this.scene, type, x, y, this.arena, options
    );

    if (!building) return null;

    this.placedBuildings.push(building);
    this.buildingCounts[type] = (this.buildingCounts[type] || 0) + 1;
    this._totalPlacedCounts[type] =
      (this._totalPlacedCounts[type] || 0) + 1;

    this._refreshInventoryLabel(type);

    return building;
  },

  destroyBuilding(building) {
    if (!building?.active) return;

    const type = building.buildingType;
    if (type && this.buildingCounts[type] > 0) {
      this.buildingCounts[type]--;
    }

    if (type) this._refreshInventoryLabel(type);

    window.ObjectFactory.destroy(building);

    const i = this.placedBuildings.indexOf(building);
    if (i > -1) this.placedBuildings.splice(i, 1);
  },

  getPlacedBuildings() {
    return this.placedBuildings;
  },
};
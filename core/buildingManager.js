// core/buildingManager.js
// Manages player-placed buildings: inventory UI, drag-and-drop placement,
// placement validation, and building destruction.

window.BuildingManager = {

  scene:            null,
  arena:            null,
  draggingBuilding: null,
  placedBuildings:  [],
  buildingCounts:   {},
  _handlers:        null,
  dragMoveThreshold: 1,

  // ── Initialisation ────────────────────────────────────────────────────────

  init(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this.resetState();
    this._spawnAllInventoryControls();
    this.setupInputHandlers();
  },

  resetState() {
    this.draggingBuilding = null;
    this.placedBuildings  = [];
    Object.keys(window.ObjectConfig.placeableTypes).forEach((type) => {
      this.buildingCounts[type] = 0;
    });
  },

  // ── Input handler wiring ──────────────────────────────────────────────────

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
      window.logDebug?.('[BuildingManager.setupInputHandlers] off failed', e);
    }
  },

  // ── Pointer events ────────────────────────────────────────────────────────

  onPointerDown(pointer) {
    const gameObjects = this._getPointerHits(pointer);
    if (!gameObjects.length) return;

    for (const obj of gameObjects) {
      if (obj.isLevelObject) continue;
      if (obj.isBuilding || obj.buildingConfig) {
        this._startDragging(obj, pointer);
        break;
      }
    }
  },

  _startDragging(obj, pointer) {
    this.draggingBuilding = obj;
    obj.isDragging        = true;
    obj._lastDragPos      = { x: pointer.x, y: pointer.y };
    obj._cachedBounds     = obj.getBounds?.() ?? null;
    this.setGhostMode(obj, true);
    obj.setDepth(1000);
  },

  onPointerMove(pointer) {
    if (!this.draggingBuilding?.isDragging) return;
    if (!this._hasMovedEnough(pointer))     return;

    this._moveObjectToPointer(this.draggingBuilding, pointer);
    this.draggingBuilding._lastDragPos  = { x: pointer.x, y: pointer.y };
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
      Phaser.Physics.Matter.Matter.Body.setPosition(obj.body, { x: pointer.x, y: pointer.y });
    } else {
      obj.x = pointer.x;
      obj.y = pointer.y;
    }
  },

  onPointerUp() {
    if (!this.draggingBuilding) return;

    const building = this.draggingBuilding;
    const valid    = this.isPlacementValid(building);

    this.setGhostMode(building, false);

    if (!valid) {
      this._handleInvalidDrop(building);
    } else {
      this._handleValidDrop(building);
    }
  },

  // Returns a building to its spawn origin or destroys it if it came from inventory.
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

  // Valid drop: just clean up drag state.
  _handleValidDrop(building) {
    this._finaliseDrop(building);
  },

  _finaliseDrop(building) {
    building.isDragging    = false;
    building._lastDragPos  = null;
    building._cachedBounds = null;
    building.setDepth(0);

    if (building.body) {
      try { this._resetBody(building); } catch (e) {
        window.logDebug?.('[BuildingManager._finaliseDrop] stop body failed', e);
      }
    }

    this.draggingBuilding = null;
  },

  // ── Physics helpers ───────────────────────────────────────────────────────

  _resetBody(obj) {
    if (!obj?.body) return;
    Phaser.Physics.Matter.Matter.Body.setVelocity(obj.body, { x: 0, y: 0 });
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(obj.body, 0);
  },

  setGhostMode(building, enabled) {
    if (!building?.body) return;
    try {
      building.body.collisionFilter.mask = enabled ? 0 : -1;
      building.body.ignoreGravity        = !!enabled;
      if (enabled) this._resetBody(building);
    } catch (e) {
      window.logDebug?.('[BuildingManager.setGhostMode] update body failed', e);
    }
  },

  // ── Placement validation ──────────────────────────────────────────────────

  // Returns true if the building's footprint doesn't overlap any other body.
  isPlacementValid(building) {
    if (!building?.body) return true;

    const bounds = building._cachedBounds ?? building.getBounds?.() ?? null;
    if (!bounds) {
      window.logDebug?.('[BuildingManager.isPlacementValid] missing bounds');
      return false;
    }

    const bodies = this.scene.matter.intersectRect(bounds.x, bounds.y, bounds.width, bounds.height) || [];
    return bodies.every((body) => {
      const obj = body?.gameObject;
      return !obj || obj === building;
    });
  },

  // ── Hit testing ───────────────────────────────────────────────────────────

  _getPointerHits(pointer) {
    if (!this.placedBuildings?.length) return [];
    return this.scene.input.hitTestPointer(pointer, this.placedBuildings) || [];
  },

  // ── Inventory UI ─────────────────────────────────────────────────────────

  _spawnAllInventoryControls() {
    const { ARENA_X, ARENA_Y, ARENA_H } = this.arena;
    const controlY       = ARENA_Y + ARENA_H - 65;
    const controlSpacing = 230;
    let   controlX       = ARENA_X + 38;

    const types = this._getAllowedBuildingTypes();
    types.forEach((type) => {
      this._spawnInventoryButton(controlX, controlY, type);
      controlX += controlSpacing;
    });
  },

  // Returns the list of building types the current level allows.
  _getAllowedBuildingTypes() {
    const allowed = window.LevelManager?.levelCfg?.allowedBuildings ?? {};
    return Object.keys(allowed).filter((type) => window.ObjectConfig.placeableTypes[type]);
  },

  _spawnInventoryButton(x, y, buildingType) {
    const cfg = window.ObjectConfig.placeableTypes[buildingType];
    if (!cfg) return null;

    const bg    = '#' + cfg.color.toString(16).padStart(6, '0');
    const label = this.scene.add.text(x, y, buildingType, {
      fontSize:        '27px',
      fill:            '#ffffff',
      backgroundColor: bg,
      padding:         { x: 19, y: 9 },
    });

    label.setInteractive({ useHandCursor: true });
    label.setDepth(2000);

    label.on('pointerdown', () => {
      const b = this._spawnBuilding(buildingType, x, y, { fromInventory: true });
      if (b) {
        this.draggingBuilding = b;
        b.isDragging = true;
        this.setGhostMode(b, true);
        b.setDepth(1000);
      }
    });

    return label;
  },

  // ── Building spawn / destroy ──────────────────────────────────────────────

  _spawnBuilding(buildingType, x, y, options = {}) {
    const cfg = window.ObjectConfig.placeableTypes[buildingType];
    if (!cfg) return null;

    if ((this.buildingCounts[buildingType] || 0) >= cfg.maxCount) {
      window.logDebug?.(`Max count reached for ${buildingType}`);
      return null;
    }

    const building = window.ObjectFactory.createPlaceable(this.scene, buildingType, x, y, this.arena, options);
    if (!building) return null;

    this.placedBuildings.push(building);
    this.buildingCounts[buildingType] = (this.buildingCounts[buildingType] || 0) + 1;

    return building;
  },

  destroyBuilding(building) {
    if (!building?.active) return;

    const type = building.buildingType;
    if (type && this.buildingCounts[type] > 0) this.buildingCounts[type]--;

    window.ObjectFactory.destroy(building);

    const i = this.placedBuildings.indexOf(building);
    if (i > -1) this.placedBuildings.splice(i, 1);
  },

  // ── Accessors ─────────────────────────────────────────────────────────────

  getPlacedBuildings()      { return this.placedBuildings; },
  getBuildingCount(type)    { return this.buildingCounts[type] || 0; },
};
// ========================================
// BUILDING MANAGER
// ========================================
// Manages drag-and-drop placement of buildings inside the arena.
// Owns: input handling, ghost-mode dragging, placement validation,
//       count tracking, inventory UI controls, and building cleanup.
// Does NOT own: building config/data (objectFactory.js), blast/damage logic.
//
// Creation and destruction go straight to ObjectFactory.create / .destroy.
// This manager only tracks counts and the placed list.

window.BuildingManager = {

  // ========================================
  // STATE
  // ========================================

  scene:            null,
  arena:            null,
  draggingBuilding: null,
  placedBuildings:  [],
  buildingCounts:   {},
  _handlers:        null,
  dragMoveThreshold: 1,

  // ========================================
  // INITIALIZATION
  // ========================================

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

  // ========================================
  // INPUT HANDLERS
  // ========================================

  setupInputHandlers() {
    if (this._handlers && this.scene?.input) {
      try {
        this.scene.input.off('pointerdown', this._handlers.down);
        this.scene.input.off('pointermove', this._handlers.move);
        this.scene.input.off('pointerup',   this._handlers.up);
      } catch (e) {}
    }

    this._handlers = {
      down: (p) => this.onPointerDown(p),
      move: (p) => this.onPointerMove(p),
      up:   (p) => this.onPointerUp(p),
    };

    this.scene.input.on('pointerdown', this._handlers.down);
    this.scene.input.on('pointermove', this._handlers.move);
    this.scene.input.on('pointerup',   this._handlers.up);
  },

  onPointerDown(pointer) {
    const gameObjects = this._getPointerHits(pointer);
    if (!gameObjects.length) return;

    for (const obj of gameObjects) {
      if (obj.isLevelObject) continue;
      if (obj.isBuilding || obj.buildingConfig) {
        this.draggingBuilding = obj;
        obj.isDragging = true;
        obj._lastDragPos = { x: pointer.x, y: pointer.y };
        obj._cachedBounds = obj.getBounds?.() ?? null;
        this.setGhostMode(obj, true);
        obj.setDepth(1000);
        break;
      }
    }
  },

  onPointerMove(pointer) {
    if (!this.draggingBuilding?.isDragging) return;

    const last = this.draggingBuilding._lastDragPos;
    if (last) {
      const dx = pointer.x - last.x;
      const dy = pointer.y - last.y;
      if (dx * dx + dy * dy < this.dragMoveThreshold * this.dragMoveThreshold) return;
    }

    if (this.draggingBuilding.body) {
      Phaser.Physics.Matter.Matter.Body.setPosition(
        this.draggingBuilding.body, { x: pointer.x, y: pointer.y }
      );
    } else {
      this.draggingBuilding.x = pointer.x;
      this.draggingBuilding.y = pointer.y;
    }

    this.draggingBuilding._lastDragPos = { x: pointer.x, y: pointer.y };
    this.draggingBuilding._cachedBounds = this.draggingBuilding.getBounds?.() ?? null;
  },

  onPointerUp() {
    if (!this.draggingBuilding) return;

    const building = this.draggingBuilding;
    const valid    = this.isPlacementValid(building);

    this.setGhostMode(building, false);

    if (!valid) {
      if (building.spawnedFromInventory) {
        this.destroyBuilding(building);
      } else if (building._dragOrigin) {
        const { x, y } = building._dragOrigin;
        if (building.body) {
          try {
            Phaser.Physics.Matter.Matter.Body.setPosition(building.body, { x, y });
            Phaser.Physics.Matter.Matter.Body.setVelocity(building.body, { x: 0, y: 0 });
            Phaser.Physics.Matter.Matter.Body.setAngularVelocity(building.body, 0);
          } catch (e) {}
        }
        building.x = x;
        building.y = y;
      }
      this._finaliseDrop(building);
      return;
    }

    this._finaliseDrop(building);
  },

  _finaliseDrop(building) {
    building.isDragging = false;
    building.setDepth(0);

    building._lastDragPos = null;
    building._cachedBounds = null;

    if (building.body) {
      try {
        Phaser.Physics.Matter.Matter.Body.setVelocity(building.body, { x: 0, y: 0 });
        Phaser.Physics.Matter.Matter.Body.setAngularVelocity(building.body, 0);
      } catch (e) {}
    }

    this.draggingBuilding = null;
  },

  _getPointerHits(pointer) {
    if (!this.placedBuildings?.length) return [];
    return this.scene.input.hitTestPointer(pointer, this.placedBuildings) || [];
  },

  // ========================================
  // GHOST MODE
  // ========================================
  // Only toggles collision filter — never removes/re-adds the body from the world.
  // Removing with the deep flag corrupts compound body parts → NaN positions on collision.

  setGhostMode(building, enabled) {
    if (!building?.body) return;
    try {
      building.body.collisionFilter.mask = enabled ? 0 : -1;
      building.body.ignoreGravity = !!enabled;
      if (enabled) {
        Phaser.Physics.Matter.Matter.Body.setVelocity(building.body, { x: 0, y: 0 });
        Phaser.Physics.Matter.Matter.Body.setAngularVelocity(building.body, 0);
      }
    } catch (e) {}
  },

  // ========================================
  // PLACEMENT VALIDATION
  // ========================================

  isPlacementValid(building) {
    if (!building?.body) return true;

    const bounds = building._cachedBounds ?? building.getBounds?.() ?? null;
    if (!bounds) return true;

    const bodies = this.scene.matter.intersectRect(bounds.x, bounds.y, bounds.width, bounds.height) || [];
    return bodies.every((body) => {
      if (!body) return true;
      const obj = body.gameObject;
      return !obj || obj === building;
    });
  },

  // ========================================
  // INVENTORY CONTROLS
  // ========================================

  _spawnAllInventoryControls() {
    const { ARENA_X, ARENA_W, ARENA_Y, ARENA_H } = this.arena;
    let   controlX       = ARENA_X + ARENA_W * 0.02;
    const controlY       = ARENA_Y + ARENA_H * 0.94;
    const controlSpacing = ARENA_W * 0.12;

    Object.keys(window.ObjectConfig.placeableTypes).forEach((type) => {
      this._spawnInventoryButton(controlX, controlY, type);
      controlX += controlSpacing;
    });
  },

  _spawnInventoryButton(x, y, buildingType) {
    const cfg = window.ObjectConfig.placeableTypes[buildingType];
    if (!cfg) return null;

    const bg       = '#' + cfg.color.toString(16).padStart(6, '0');
    const fontSize = Math.round(this.scene.scale.height * 0.025);
    const padX     = Math.round(this.scene.scale.width  * 0.01);
    const padY     = Math.round(this.scene.scale.height * 0.008);

    const label = this.scene.add.text(x, y, buildingType, {
      fontSize:        `${fontSize}px`,
      fill:            '#ffffff',
      backgroundColor: bg,
      padding:         { x: padX, y: padY },
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

  // ========================================
  // BUILDING CREATION  (internal)
  // ========================================
  // Direct call to ObjectFactory.create — no extra wrapper layer.
  // BuildingManager only adds count tracking on top.

  _spawnBuilding(buildingType, x, y, options = {}) {
    const cfg = window.ObjectConfig.placeableTypes[buildingType];
    if (!cfg) return null;

    if ((this.buildingCounts[buildingType] || 0) >= cfg.maxCount) {
      window.logDebug?.(`Max count reached for ${buildingType}`);
      return null;
    }

    const building = window.ObjectFactory.createPlaceable(
      this.scene, buildingType, x, y, this.arena, options
    );
    if (!building) return null;

    this.placedBuildings.push(building);
    this.buildingCounts[buildingType] = (this.buildingCounts[buildingType] || 0) + 1;

    return building;
  },

  // ========================================
  // BUILDING DESTRUCTION
  // ========================================
  // Decrement count, remove from list, then delegate to ObjectFactory.destroy.

  destroyBuilding(building) {
    if (!building?.active) return;

    const type = building.buildingType;
    if (type && this.buildingCounts[type] > 0) this.buildingCounts[type]--;

    window.ObjectFactory.destroy(building);

    const i = this.placedBuildings.indexOf(building);
    if (i > -1) this.placedBuildings.splice(i, 1);
  },

  // ========================================
  // ACCESSORS
  // ========================================

  getPlacedBuildings() { return this.placedBuildings; },
  getBuildingCount(type) { return this.buildingCounts[type] || 0; },

};
// ========================================
// BUILDING MANAGER
// ========================================
// Manages drag-and-drop placement of buildings inside the arena.
// Owns: input handling, ghost-mode dragging, placement validation, count tracking,
//       inventory UI controls, and building cleanup.
// Does NOT own: building config/data (see objectFactory.js), blast/damage logic.

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

  // ========================================
  // INITIALIZATION
  // ========================================

  // Bind to a scene and arena, reset all state, spawn inventory controls, and attach input.
  init(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this.resetState();
    this._spawnAllInventoryControls();
    this.setupInputHandlers();
  },

  // Clear drag state, placed list, and per-type counts. Does not touch input handlers.
  resetState() {
    this.draggingBuilding = null;
    this.placedBuildings  = [];
    Object.keys(window.ObjectConfig.buildingTypes).forEach((type) => {
      this.buildingCounts[type] = 0;
    });
  },

  // ========================================
  // INPUT HANDLERS
  // ========================================

  // Attach pointer events to the current scene, removing any previous listeners first.
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

  // Hit-test the pointer and begin dragging a building if one is touched.
  onPointerDown(pointer) {
    const input = this.scene.input;
    let gameObjects = [];

    if (typeof input.hitTestPointer === 'function') {
      gameObjects = input.hitTestPointer(pointer) || [];
    } else if (input?.manager && typeof input.manager.hitTest === 'function') {
      const cameras = this.scene.cameras.getCamerasBelowPointer(pointer) || [this.scene.cameras.main];
      for (const cam of cameras) {
        gameObjects = input.manager.hitTest(pointer, this.scene.children.list, cam) || [];
        if (gameObjects.length) break;
      }
    }

    for (const obj of gameObjects) {
      if (obj.isBuilding || obj.buildingConfig) {
        this.draggingBuilding = obj;
        obj.isDragging = true;
        this.setGhostMode(obj, true);
        obj.setDepth(1000);
        break;
      }
    }
  },

  // Move the dragged building to follow the pointer.
  onPointerMove(pointer) {
    if (!this.draggingBuilding?.isDragging) return;

    if (this.draggingBuilding.body) {
      Phaser.Physics.Matter.Matter.Body.setPosition(
        this.draggingBuilding.body, { x: pointer.x, y: pointer.y }
      );
    } else {
      this.draggingBuilding.x = pointer.x;
      this.draggingBuilding.y = pointer.y;
    }
  },

  // Drop the building: keep it if placement is valid, otherwise return or destroy it.
  onPointerUp() {
    if (!this.draggingBuilding) return;

    const building = this.draggingBuilding;
    const valid    = this.isPlacementValid(building);

    this.setGhostMode(building, false);

    if (!valid) {
      // -- INVALID DROP --
      // If the building came from inventory, remove it entirely.
      // Otherwise snap it back to where it was before the drag.
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

      this._finaliseDrop(building, false);
      return;
    }

    // -- VALID DROP --
    this._finaliseDrop(building, true);
  },

  // Shared cleanup after a drop, valid or not.
  _finaliseDrop(building, makesDynamic) {
    building.isDragging = false;
    building.setDepth(0);

    if (building.body) {
      try {
        Phaser.Physics.Matter.Matter.Body.setStatic(building.body, !makesDynamic);
        Phaser.Physics.Matter.Matter.Body.setVelocity(building.body, { x: 0, y: 0 });
        Phaser.Physics.Matter.Matter.Body.setAngularVelocity(building.body, 0);
      } catch (e) {}
    }

    this.draggingBuilding = null;
  },

  // ========================================
  // GHOST MODE
  // ========================================

  // Toggle physics participation while dragging.
  // enabled=true  → remove from world so it doesn't collide while being dragged.
  // enabled=false → re-add to world so it collides after being placed.
  setGhostMode(building, enabled) {
    if (!building?.body) return;

    try {
      if (enabled) {
        if (!building._ghostRemoved) {
          this.scene.matter.world.remove(building.body, true);
          building._ghostRemoved = true;
        }
        if (building.body.collisionFilter) building.body.collisionFilter.mask = 0;
      } else {
        if (building._ghostRemoved) {
          this.scene.matter.world.add(building.body);
          building._ghostRemoved = false;
        }
        if (building.body.collisionFilter) building.body.collisionFilter.mask = -1;
      }
    } catch (e) {}
  },

  // ========================================
  // PLACEMENT VALIDATION
  // ========================================

  // Return true if the building's current position does not overlap any other body.
  isPlacementValid(building) {
    if (!building?.body) return true;

    const bounds = building.getBounds?.() ?? null;
    if (!bounds) return true;

    const bodies = this.scene.matter.intersectRect(bounds.x, bounds.y, bounds.width, bounds.height) || [];
    return bodies.every((body) => {
      if (!body) return true;
      const obj = body.gameObject;
      // Allow overlap only with the building being dragged itself.
      return !obj || obj === building;
    });
  },

  // ========================================
  // INVENTORY CONTROLS
  // ========================================

  // Spawn one inventory button per building type at the bottom of the arena.
  _spawnAllInventoryControls() {
    const { ARENA_X, ARENA_W, ARENA_Y, ARENA_H } = this.arena;
    let   controlX        = ARENA_X + ARENA_W * 0.02;
    const controlY        = ARENA_Y + ARENA_H * 0.94;
    const controlSpacing  = ARENA_W * 0.12;

    Object.keys(window.ObjectConfig.buildingTypes).forEach((type) => {
      this._spawnInventoryButton(controlX, controlY, type);
      controlX += controlSpacing;
    });
  },

  // Create one inventory button that spawns a building of the given type on click.
  _spawnInventoryButton(x, y, buildingType) {
    const cfg      = window.ObjectConfig.buildingTypes[buildingType];
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
      const b = this.createBuilding(buildingType, x, y, { fromInventory: true });
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
  // BUILDING CREATION
  // ========================================

  // Delegate creation to ObjectFactory and track the result in this manager.
  createBuilding(buildingType, x, y, options = {}) {
    const cfg = window.ObjectConfig.buildingTypes[buildingType];
    if (!cfg) return null;

    // Enforce per-type placement limit.
    if ((this.buildingCounts[buildingType] || 0) >= cfg.maxCount) {
      console.log(`Max count reached for ${buildingType}`);
      return null;
    }

    const building = window.ObjectFactory.createBuilding(
      this.scene, this.arena, buildingType, x, y, options
    );
    if (!building) return null;

    this.placedBuildings.push(building);
    this.buildingCounts[buildingType] = (this.buildingCounts[buildingType] || 0) + 1;

    return building;
  },

  // ========================================
  // CLEANUP
  // ========================================

  // Remove a building from the scene, decrement its type count, and unlist it.
  destroyBuilding(building) {
    if (!building?.active) return;

    const type = building.buildingType;
    if (type && this.buildingCounts[type] > 0) this.buildingCounts[type]--;

    window.ObjectFactory.destroyBuilding(building);

    const i = this.placedBuildings.indexOf(building);
    if (i > -1) this.placedBuildings.splice(i, 1);
  },

  // ========================================
  // ACCESSORS
  // ========================================

  // Return the live list of all placed buildings.
  getPlacedBuildings() { return this.placedBuildings; },

  // Return how many of a given type are currently placed.
  getBuildingCount(type) { return this.buildingCounts[type] || 0; },

};

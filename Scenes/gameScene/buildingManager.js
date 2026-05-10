// ========================================
// BUILDING_MANAGER: Drag, place, and manage destructible defenses
// ========================================
// Handles inventory spawning, ghost-mode dragging, placement validation, and health.

// ========================================
// CONFIGURATION
// ========================================

// Building type definitions: visual, physics, health, and blast properties.
window.GameSceneObjectConfig = window.GameSceneObjectConfig || {};

window.GameSceneObjectConfig.buildingTypes = {
  shortPlank: {
    label: 'shortPlank',
    widthRatio: 0.15,
    heightRatio: 0.04,
    color: 0x8b4513,
    physics: { friction: 0.8, restitution: 0.2, frictionAir: 0.01 },
    health: 30,
    blastResistance: 1.0,
    mass: 8,
    maxCount: 5,
  },
  thickPlank: {
    label: 'thickPlank',
    widthRatio: 0.1,
    heightRatio: 0.08,
    color: 0x654321,
    physics: { friction: 0.9, restitution: 0.1, frictionAir: 0.01 },
    health: 60,
    blastResistance: 1.4,
    mass: 14,
    maxCount: 3,
  },
  wall: {
    label: 'wall',
    widthRatio: 0.06,
    heightRatio: 0.2,
    color: 0x696969,
    physics: { friction: 0.8, restitution: 0.0, frictionAir: 0.01 },
    health: 80,
    blastResistance: 2.0,
    mass: 30,
    maxCount: 2,
  },
};

window.BuildingManager = {
  scene: null,
  arena: null,
  draggingBuilding: null,
  placedBuildings: [],
  buildingCounts: {},
  _handlers: null,

  // ========================================
  // MANAGER_INITIALIZATION
  // ========================================

  // Full init: attach scene, arena, reset state, and setup input handlers.
  init(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this.resetState();
    this.setupInputHandlers();
  },

  // Reset building counts and clear placement list (without removing input handlers).
  resetState() {
    this.draggingBuilding = null;
    this.placedBuildings = [];
    Object.keys(window.GameSceneObjectConfig.buildingTypes).forEach((type) => {
      this.buildingCounts[type] = 0;
    });
  },

  // Attach or reattach input event handlers (down, move, up) to the scene.
  setupInputHandlers() {
    // Clean up old handlers from previous scene if they exist
    if (this._handlers && this.scene && this.scene.input) {
      try {
        this.scene.input.off('pointerdown', this._handlers.down);
        this.scene.input.off('pointermove', this._handlers.move);
        this.scene.input.off('pointerup', this._handlers.up);
      } catch (e) {
        // Scene was destroyed, ignore error
      }
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

  // ========================================
  // BUILDING_CREATION
  // ========================================

  // Instantiate a building with physics body and register for damage tracking.
  createBuilding(buildingType, x, y, options = {}) {
    const cfg = window.GameSceneObjectConfig.buildingTypes[buildingType];
    if (!cfg) return null;

    if (this.buildingCounts[buildingType] >= cfg.maxCount) {
      console.log(`Max count reached for ${buildingType}`);
      return null;
    }

    const building = this.scene.add.rectangle(
      x, y,
      this.arena.W * cfg.widthRatio,
      this.arena.H * cfg.heightRatio,
      cfg.color
    );

    this.scene.matter.add.gameObject(building, {
      friction: cfg.physics.friction,
      restitution: cfg.physics.restitution,
      frictionAir: cfg.physics.frictionAir,
      label: 'building',
    });

    if (building.body) {
      Phaser.Physics.Matter.Matter.Body.setStatic(building.body, true);
      try { Phaser.Physics.Matter.Matter.Body.setMass(building.body, cfg.mass || 8); } catch (e) {}
    }

    building.buildingType = buildingType;
    building.buildingConfig = cfg;
    building.health = Infinity;
    building.maxHealth = Infinity;
    building.isDragging = false;
    building.blastResistance = cfg.blastResistance || 1.0;
    building.isBuilding = true;
    building.spawnedFromInventory = !!options.fromInventory;
    building._dragOrigin = { x, y };
    building._ghostRemoved = false;

    // No-op while debugging
    building.takeDamage = function () { return false; };

    building.setInteractive({ useHandCursor: true });

    if (window.GameLogic?.addBuilding) {
      window.GameLogic.addBuilding(building);
    }

    this.placedBuildings.push(building);
    this.buildingCounts[buildingType]++;

    return building;
  },

  // ========================================
  // DRAG_MECHANICS
  // ========================================

  // Remove/re-add physics body to the world (true=remove for ghost, false=add back).
  setGhostMode(building, enabled) {
    if (!building?.body) return;

    try {
      if (enabled) {
        if (!building._ghostRemoved) {
          this.scene.matter.world.remove(building.body, true);
          building._ghostRemoved = true;
        }
        if (building.body.collisionFilter) {
          building.body.collisionFilter.mask = 0;
        }
      } else {
        if (building._ghostRemoved) {
          this.scene.matter.world.add(building.body);
          building._ghostRemoved = false;
        }
        if (building.body.collisionFilter) {
          building.body.collisionFilter.mask = -1;
        }
      }
    } catch (e) {}
  },

  // ========================================
  // PLACEMENT_VALIDATION
  // ========================================

  // Check if drop location overlaps with other bodies; only self-collision allowed.
  isPlacementValid(building) {
    if (!building?.body) return true;

    const bounds = building.getBounds ? building.getBounds() : null;
    if (!bounds) return true;

    const bodies = this.scene.matter.intersectRect(bounds.x, bounds.y, bounds.width, bounds.height) || [];
    return bodies.every((body) => {
      if (!body || body.gameObject === building) return true;
      const obj = body.gameObject;
      if (!obj) return true;
      // allow overlap with the dragged object itself only
      return obj === building;
    });
  },

  // ========================================
  // INPUT_HANDLING
  // ========================================

  // Hit test pointer and start dragging a building if hit.
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

  // Move dragged building to follow pointer position.
  onPointerMove(pointer) {
    if (!this.draggingBuilding?.isDragging) return;
    if (this.draggingBuilding.body) {
      Phaser.Physics.Matter.Matter.Body.setPosition(this.draggingBuilding.body, { x: pointer.x, y: pointer.y });
    } else {
      this.draggingBuilding.x = pointer.x;
      this.draggingBuilding.y = pointer.y;
    }
  },

  // Finalize drop: keep building if valid, otherwise return to inventory or origin.
  onPointerUp() {
    if (!this.draggingBuilding) return;

    const building = this.draggingBuilding;
    const valid = this.isPlacementValid(building);

    this.setGhostMode(building, false);

    if (!valid) {
      // Invalid placement: return to inventory if it came from there,
      // otherwise snap back to original position.
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
      building.isDragging = false;
      building.setDepth(0);
      if (building.body) {
        try {
          Phaser.Physics.Matter.Matter.Body.setStatic(building.body, false);
          Phaser.Physics.Matter.Matter.Body.setVelocity(building.body, { x: 0, y: 0 });
          Phaser.Physics.Matter.Matter.Body.setAngularVelocity(building.body, 0);
        } catch (e) {}
      }
      this.draggingBuilding = null;
      return;
    }

    this.draggingBuilding.isDragging = false;
    building.setDepth(0);
    if (building.body) {
      Phaser.Physics.Matter.Matter.Body.setStatic(building.body, false);
      try {
        Phaser.Physics.Matter.Matter.Body.setVelocity(building.body, { x: 0, y: 0 });
        Phaser.Physics.Matter.Matter.Body.setAngularVelocity(building.body, 0);
      } catch (e) {}
    }
    this.draggingBuilding = null;
  },

  // ========================================
  // INVENTORY_CONTROLS
  // ========================================

  // Create an inventory UI button to spawn a building when clicked.
  spawnBuildingControl(x, y, buildingType) {
    const cfg = window.GameSceneObjectConfig.buildingTypes[buildingType];
    if (!cfg) return null;

    const bg = '#' + cfg.color.toString(16).padStart(6, '0');
    const fontSize = Math.round(this.scene.scale.height * 0.025);
    const paddingX = Math.round(this.scene.scale.width * 0.01);
    const paddingY = Math.round(this.scene.scale.height * 0.008);

    const label = this.scene.add.text(x, y, buildingType, {
      fontSize: `${fontSize}px`,
      fill: '#ffffff',
      backgroundColor: bg,
      padding: { x: paddingX, y: paddingY },
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
  // CLEANUP
  // ========================================

  // Remove a building from the scene and decrement its type count.
  destroyBuilding(building) {
    if (!building.active) return;
    const type = building.buildingType;
    if (type && this.buildingCounts[type] > 0) this.buildingCounts[type]--;
    building.destroy();
    const i = this.placedBuildings.indexOf(building);
    if (i > -1) this.placedBuildings.splice(i, 1);
  },

  // Return the list of all currently placed buildings.
  getPlacedBuildings() {
    return this.placedBuildings;
  },

  // Return the current inventory count for a building type.
  getBuildingCount(buildingType) {
    return this.buildingCounts[buildingType] || 0;
  },
};
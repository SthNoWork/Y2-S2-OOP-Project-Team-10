// ----------------------------
// Building Manager: Draggable blocks
// ----------------------------
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

  // Full init: called once when the scene is created.
  init(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this.resetState();
    this.setupInputHandlers();
  },

  // State-only reset: called on level reset without re-adding input handlers.
  resetState() {
    this.draggingBuilding = null;
    this.placedBuildings = [];
    Object.keys(window.GameSceneObjectConfig.buildingTypes).forEach((type) => {
      this.buildingCounts[type] = 0;
    });
  },

  // Stores handler refs so they can be removed cleanly if re-called.
  setupInputHandlers() {
    if (this._handlers && this.scene) {
      this.scene.input.off('pointerdown', this._handlers.down);
      this.scene.input.off('pointermove', this._handlers.move);
      this.scene.input.off('pointerup', this._handlers.up);
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

  createBuilding(buildingType, x, y) {
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
        obj.setDepth(1000);
        break;
      }
    }
  },

  onPointerMove(pointer) {
    if (!this.draggingBuilding?.isDragging) return;
    if (this.draggingBuilding.body) {
      Phaser.Physics.Matter.Matter.Body.setPosition(this.draggingBuilding.body, { x: pointer.x, y: pointer.y });
    } else {
      this.draggingBuilding.x = pointer.x;
      this.draggingBuilding.y = pointer.y;
    }
  },

  onPointerUp() {
    if (!this.draggingBuilding) return;
    this.draggingBuilding.isDragging = false;
    this.draggingBuilding.setDepth(0);
    if (this.draggingBuilding.body) {
      Phaser.Physics.Matter.Matter.Body.setStatic(this.draggingBuilding.body, false);
    }
    this.draggingBuilding = null;
  },

  spawnBuildingControl(x, y, buildingType) {
    const cfg = window.GameSceneObjectConfig.buildingTypes[buildingType];
    if (!cfg) return null;

    const bg = '#' + cfg.color.toString(16).padStart(6, '0');
    const label = this.scene.add.text(x, y, buildingType, {
      fontSize: '14px',
      fill: '#ffffff',
      backgroundColor: bg,
      padding: { x: 5, y: 3 },
    });

    label.setInteractive({ useHandCursor: true });
    label.setDepth(2000);
    label.on('pointerdown', () => {
      const b = this.createBuilding(buildingType, x, y);
      if (b) {
        this.draggingBuilding = b;
        b.isDragging = true;
        b.setDepth(1000);
      }
    });

    return label;
  },

  destroyBuilding(building) {
    if (!building.active) return;
    const type = building.buildingType;
    if (type && this.buildingCounts[type] > 0) this.buildingCounts[type]--;
    building.destroy();
    const i = this.placedBuildings.indexOf(building);
    if (i > -1) this.placedBuildings.splice(i, 1);
  },

  getPlacedBuildings() {
    return this.placedBuildings;
  },

  getBuildingCount(buildingType) {
    return this.buildingCounts[buildingType] || 0;
  },
};
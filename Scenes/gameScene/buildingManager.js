// buildingManager.js
// Manages drag-and-drop placement of buildings inside the arena.
// Owns: pointer input handling, ghost-mode dragging, placement validation,
//       per-type count tracking, inventory button UI, and building cleanup.
// Does not own: building config/data (objectConfig.js), blast or damage logic.
//
// Building creation delegates to ObjectFactory.createPlaceable.
// Building destruction delegates to ObjectFactory.destroy.
// This manager only adds count bookkeeping and the placed-object list on top.
//
// All sizes and positions are fixed 1920×1080 px — Phaser Scale.FIT handles display scaling.

window.BuildingManager = {

  scene:            null,
  arena:            null,
  draggingBuilding: null,
  placedBuildings:  [],
  buildingCounts:   {},
  _handlers:        null,
  dragMoveThreshold: 1,  // minimum px movement before a drag is registered

  // Stores references to the scene and arena, resets all state, spawns
  // inventory buttons, and wires up pointer event listeners.
  init(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this.resetState();
    this._spawnAllInventoryControls();
    this.setupInputHandlers();
  },

  // Clears all runtime state: the dragging reference, placed list, and per-type counts.
  resetState() {
    this.draggingBuilding = null;
    this.placedBuildings  = [];
    Object.keys(window.ObjectConfig.placeableTypes).forEach((type) => {
      this.buildingCounts[type] = 0;
    });
  },

  // Removes any previous pointer listeners and registers fresh ones for this session.
  setupInputHandlers() {
    if (this._handlers && this.scene?.input) {
      try {
        this.scene.input.off('pointerdown', this._handlers.down);
        this.scene.input.off('pointermove', this._handlers.move);
        this.scene.input.off('pointerup',   this._handlers.up);
      } catch (e) {
        window.logDebug?.('[BuildingManager.setupInputHandlers] off failed', e);
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

  // Zeroes the velocity and angular velocity of a physics body so it stays put after a drop.
  _resetBody(obj) {
    if (!obj?.body) return;
    Phaser.Physics.Matter.Matter.Body.setVelocity(obj.body, { x: 0, y: 0 });
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(obj.body, 0);
  },

  // Picks up the first building found under the pointer and begins dragging it.
  // Level objects (isLevelObject) are skipped — they are not player-draggable.
  onPointerDown(pointer) {
    const gameObjects = this._getPointerHits(pointer);
    if (!gameObjects.length) return;

    for (const obj of gameObjects) {
      if (obj.isLevelObject) continue;
      if (obj.isBuilding || obj.buildingConfig) {
        this.draggingBuilding      = obj;
        obj.isDragging             = true;
        obj._lastDragPos           = { x: pointer.x, y: pointer.y };
        obj._cachedBounds          = obj.getBounds?.() ?? null;
        this.setGhostMode(obj, true);
        obj.setDepth(1000);
        break;
      }
    }
  },

  // Moves the currently-dragged building to follow the pointer.
  // Bails out early if the pointer hasn't moved past the threshold to avoid jitter.
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

    this.draggingBuilding._lastDragPos   = { x: pointer.x, y: pointer.y };
    this.draggingBuilding._cachedBounds  = this.draggingBuilding.getBounds?.() ?? null;
  },

  // Finalises the drop: validates the placement, then either commits or reverts.
  // Buildings spawned from the inventory are destroyed on invalid placement.
  // Buildings moved from the arena are snapped back to their last valid position.
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
            this._resetBody(building);
          } catch (e) {
            window.logDebug?.('[BuildingManager.onPointerUp] reset body failed', e);
          }
        }
        building.x = x;
        building.y = y;
      }
      this._finaliseDrop(building);
      return;
    }

    this._finaliseDrop(building);
  },

  // Clears all drag-related state from a building after a drop (valid or reverted).
  _finaliseDrop(building) {
    building.isDragging    = false;
    building.setDepth(0);
    building._lastDragPos  = null;
    building._cachedBounds = null;

    if (building.body) {
      try { this._resetBody(building); } catch (e) {
        window.logDebug?.('[BuildingManager._finaliseDrop] stop body failed', e);
      }
    }

    this.draggingBuilding = null;
  },

  // Returns all placed buildings that overlap the pointer using Phaser's hit test.
  _getPointerHits(pointer) {
    if (!this.placedBuildings?.length) return [];
    return this.scene.input.hitTestPointer(pointer, this.placedBuildings) || [];
  },

  // Enables or disables ghost mode on a building.
  // Ghost mode disables collision (mask = 0) and gravity so the building floats
  // freely while being dragged, without disrupting other physics bodies.
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

  // Returns true if the building's current bounding rect does not overlap any
  // other physics body. Uses Matter's intersectRect query on the cached bounds.
  isPlacementValid(building) {
    if (!building?.body) return true;

    const bounds = building._cachedBounds ?? building.getBounds?.() ?? null;
    if (!bounds) {
      window.logDebug?.('[BuildingManager.isPlacementValid] missing bounds');
      return false;
    }

    const bodies = this.scene.matter.intersectRect(bounds.x, bounds.y, bounds.width, bounds.height) || [];
    return bodies.every((body) => {
      if (!body) return true;
      const obj = body.gameObject;
      return !obj || obj === building;
    });
  },

  // Creates inventory buttons for every placeable type, spaced evenly along the
  // bottom-left of the arena. Tapping a button spawns a building and begins dragging it.
  _spawnAllInventoryControls() {
    const { ARENA_X, ARENA_Y, ARENA_H } = this.arena;
    let   controlX       = ARENA_X + 38;         // left margin inside arena
    const controlY       = ARENA_Y + ARENA_H - 65; // near the bottom of the arena
    const controlSpacing = 230;                    // px between each inventory button

    Object.keys(window.ObjectConfig.placeableTypes).forEach((type) => {
      this._spawnInventoryButton(controlX, controlY, type);
      controlX += controlSpacing;
    });
  },

  // Creates a single labelled inventory button for buildingType at (x, y).
  // Tapping it calls _spawnBuilding and immediately starts dragging the new object.
  _spawnInventoryButton(x, y, buildingType) {
    const cfg = window.ObjectConfig.placeableTypes[buildingType];
    if (!cfg) return null;

    const bg = '#' + cfg.color.toString(16).padStart(6, '0');

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
        b.isDragging          = true;
        this.setGhostMode(b, true);
        b.setDepth(1000);
      }
    });

    return label;
  },

  // Creates a building via ObjectFactory, increments the type count, and adds it
  // to the placed list. Returns null if the per-type cap has been reached.
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

  // Decrements the type count, removes the building from the placed list,
  // then delegates destruction to ObjectFactory.
  destroyBuilding(building) {
    if (!building?.active) return;

    const type = building.buildingType;
    if (type && this.buildingCounts[type] > 0) this.buildingCounts[type]--;

    window.ObjectFactory.destroy(building);

    const i = this.placedBuildings.indexOf(building);
    if (i > -1) this.placedBuildings.splice(i, 1);
  },

  // Returns the full list of currently placed buildings.
  getPlacedBuildings() { return this.placedBuildings; },

  // Returns how many buildings of the given type have been placed.
  getBuildingCount(type) { return this.buildingCounts[type] || 0; },
};
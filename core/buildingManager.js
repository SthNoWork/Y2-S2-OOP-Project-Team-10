// core/buildingManager.js
// Manages player-placed buildings: inventory UI, drag-and-drop placement,
// placement validation, and building destruction. Implements the Singleton pattern.

class BuildingManager {
  #scene = null;
  #arena = null;
  #draggingBuilding = null;
  #placedBuildings = [];
  #buildingCounts = {};
  #totalPlacedCounts = {};
  #inventoryButtons = [];
  #inventoryButtonsByType = {};
  #handlers = null;
  #onKeyDown = null;

  static #instance = null;
  static getInstance() {
    if (!BuildingManager.#instance) {
      BuildingManager.#instance = new BuildingManager();
    }
    return BuildingManager.#instance;
  }

  get scene() { return this.#scene; }
  get arena() { return this.#arena; }
  get draggingBuilding() { return this.#draggingBuilding; }
  set draggingBuilding(val) { this.#draggingBuilding = val; }
  get placedBuildings() { return [...this.#placedBuildings]; }
  get buildingCounts() { return this.#buildingCounts; }
  get _totalPlacedCounts() { return this.#totalPlacedCounts; }
  get _inventoryButtons() { return [...this.#inventoryButtons]; }
  get _inventoryButtonsByType() { return this.#inventoryButtonsByType; }
  get _handlers() { return this.#handlers; }

  dragMoveThreshold = 1;

  init(scene, arena) {
    this.#scene = scene;
    this.#arena = arena;
    this.resetState();
    this._createInventoryButtons();
    this.setupInputHandlers();

    // Rotate dragging building: 'E' for clockwise, 'Q' for counter-clockwise
    this.#onKeyDown = (e) => {
      if (!this.#draggingBuilding) return;
      if (e.key === 'e' || e.key === 'E') {
        this.#draggingBuilding.angle += 15;
        this.#draggingBuilding._cachedBounds = this.#draggingBuilding.getBounds?.() ?? null;
      } else if (e.key === 'q' || e.key === 'Q') {
        this.#draggingBuilding.angle -= 15;
        this.#draggingBuilding._cachedBounds = this.#draggingBuilding.getBounds?.() ?? null;
      }
    };
    window.addEventListener('keydown', this.#onKeyDown);
  }

  resetState() {
    this.#draggingBuilding = null;
    this.#placedBuildings = [];
    this.#inventoryButtons = [];
    this.#inventoryButtonsByType = {};

    Object.keys(window.ObjectConfig.placeableTypes).forEach((type) => {
      this.#buildingCounts[type] = 0;
      this.#totalPlacedCounts[type] = 0;
    });
  }

  setupInputHandlers() {
    this._removeExistingHandlers();

    this.#handlers = {
      down: (p) => this.onPointerDown(p),
      move: (p) => this.onPointerMove(p),
      up:   (p) => this.onPointerUp(p),
    };

    this.#scene.input.on('pointerdown', this.#handlers.down);
    this.#scene.input.on('pointermove', this.#handlers.move);
    this.#scene.input.on('pointerup',   this.#handlers.up);
  }

  _removeExistingHandlers() {
    if (this.#onKeyDown) {
      window.removeEventListener('keydown', this.#onKeyDown);
      this.#onKeyDown = null;
    }
    if (!this.#handlers || !this.#scene?.input) return;

    try {
      this.#scene.input.off('pointerdown', this.#handlers.down);
      this.#scene.input.off('pointermove', this.#handlers.move);
      this.#scene.input.off('pointerup',   this.#handlers.up);
    } catch (e) {
      window.logDebug?.('[BuildingManager] off handlers failed', e);
    }
  }

  lockPlacement() {
    if (this.#draggingBuilding) {
      const building = this.#draggingBuilding;

      this._setPhysicsGhost(building, false);

      if (building.spawnedFromInventory) {
        this.destroyBuilding(building);
      } else if (building._dragOrigin) {
        this._returnToOrigin(building);
      }

      this._finaliseDrop(building);
    }

    this._removeExistingHandlers();

    for (const btn of this.#inventoryButtons) {
      if (btn?.active) {
        btn.disableInteractive();
        btn.setAlpha(0.35);
      }
    }

    for (const b of this.#placedBuildings) {
      if (b?.active) b.disableInteractive();
    }
  }

  onPointerDown(pointer) {
    // Prevent dragging placed objects if we clicked on the inventory UI
    const hits = this.#scene.input.hitTestPointer(pointer) || [];
    const hitUI = hits.some(h => this.#inventoryButtons.includes(h));
    if (hitUI) return;

    const hit = this._getPointerHits(pointer)
      .find((obj) => !obj.isLevelObject && (obj.isBuilding || obj.buildingConfig));

    if (hit) {
      this._startDragging(hit, pointer);
      this._moveObjectToPointer(hit, pointer); // Snap immediately with offset
    }
  }

  onPointerMove(pointer) {
    if (!this.#draggingBuilding?.isDragging) return;
    if (!this._hasMovedEnough(pointer)) return;

    this._moveObjectToPointer(this.#draggingBuilding, pointer);

    this.#draggingBuilding._lastDragPos = { x: pointer.x, y: pointer.y };
    this.#draggingBuilding._cachedBounds = this.#draggingBuilding.getBounds?.() ?? null;
  }

  onPointerUp() {
    if (!this.#draggingBuilding) return;

    const building = this.#draggingBuilding;
    let valid = this.isPlacementValid(building);

    if (!valid) {
      // Try to find the closest valid non-overlapping position
      const snapPos = this.findNearestValidPosition(building, building.x, building.y);
      if (snapPos) {
        valid = true;
        if (building.body) {
          Phaser.Physics.Matter.Matter.Body.setPosition(building.body, snapPos);
        } else {
          building.x = snapPos.x;
          building.y = snapPos.y;
        }
      }
    }

    this._setPhysicsGhost(building, false);

    if (!valid) {
      this._handleInvalidDrop(building);
    } else {
      this._handleValidDrop(building);
    }
  }

  findNearestValidPosition(building, startX, startY) {
    return window.GameLogicHelper.findNearestValidPosition(this.#scene, building, startX, startY);
  }

  _startDragging(obj, pointer) {
    this.#draggingBuilding = obj;
    obj.isDragging = true;
    obj._dragOrigin = { x: obj.x, y: obj.y }; // Store drag origin for returning if invalid
    obj._lastDragPos = { x: pointer.x, y: pointer.y };
    obj._cachedBounds = obj.getBounds?.() ?? null;

    // Detach all constraints connected to this object when picked up
    if (obj.body && obj.body._constraints) {
      for (const c of obj.body._constraints) {
        try {
          if (this.#scene.matter?.world) {
            this.#scene.matter.world.removeConstraint(c);
          }
        } catch (e) {}
        const other = c.bodyA === obj.body ? c.bodyB : c.bodyA;
        if (other && other._constraints) {
          other._constraints = other._constraints.filter(x => x !== c);
        }
      }
      obj.body._constraints = [];
    }

    this._setPhysicsGhost(obj, true);
    obj.setDepth(1000);
  }

  _hasMovedEnough(pointer) {
    const last = this.#draggingBuilding._lastDragPos;
    if (!last) return true;

    const dx = pointer.x - last.x;
    const dy = pointer.y - last.y;
    return dx * dx + dy * dy >= this.dragMoveThreshold * this.dragMoveThreshold;
  }

  _moveObjectToPointer(obj, pointer) {
    const isTouch = this.#scene.sys.game.device.input.touch;
    const offsetX = isTouch ? -90 : 0; // Floating offset to the left on touch screens
    const offsetY = isTouch ? -100 : 0; // Floating offset above finger on touch screens
    if (obj.body) {
      Phaser.Physics.Matter.Matter.Body.setPosition(obj.body, {
        x: pointer.x + offsetX,
        y: pointer.y + offsetY,
      });
    } else {
      obj.x = pointer.x + offsetX;
      obj.y = pointer.y + offsetY;
    }
  }

  _handleInvalidDrop(building) {
    if (building.spawnedFromInventory) {
      this.destroyBuilding(building);
    } else if (building._dragOrigin) {
      this._returnToOrigin(building);
    }
    this._finaliseDrop(building);
  }

  _handleValidDrop(building) {
    this._finaliseDrop(building);
  }

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
  }

  _finaliseDrop(building) {
    building.isDragging = false;
    building._lastDragPos = null;
    building._cachedBounds = null;
    building.setDepth(0);

    if (building.body) {
      try { this._resetBody(building); } catch (e) {
        window.logDebug?.('[BuildingManager._finaliseDrop] stop body failed', e);
      }
    }

    this.#draggingBuilding = null;
  }

  _resetBody(obj) {
    if (!obj?.body) return;
    Phaser.Physics.Matter.Matter.Body.setVelocity(obj.body, { x: 0, y: 0 });
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(obj.body, 0);
  }

  _setPhysicsGhost(building, enabled) {
    if (!building?.body) return;

    try {
      building.body.collisionFilter.mask = enabled ? 0 : -1;
      building.body.ignoreGravity = !!enabled;
      if (enabled) this._resetBody(building);
    } catch (e) {
      window.logDebug?.('[BuildingManager._setPhysicsGhost] update body failed', e);
    }
  }

  isPlacementValid(building) {
    return window.GameLogicHelper.isPlacementValid(this.#scene, building);
  }

  _getPointerHits(pointer) {
    if (!this.#placedBuildings?.length) return [];
    return this.#scene.input.hitTestPointer(pointer, this.#placedBuildings) || [];
  }

  _createInventoryButtons() {
    const { ARENA_X, ARENA_Y } = this.#arena;

    const buttonW = 110;
    const buttonH = 110;
    const gap = 18;
    const spacing = buttonH + gap;
    
    // Position on the left edge of the arena
    const x = ARENA_X + 24 + buttonW / 2;
    let y = ARENA_Y + 120 + buttonH / 2;

    this._getAllowedBuildingTypes().forEach((type) => {
      this._createInventoryButton(x, y, type, buttonW, buttonH);
      y += spacing;
    });
  }

  _createInventoryButton(x, y, type, buttonW, buttonH) {
    const cfg = window.ObjectConfig.placeableTypes[type];
    if (!cfg) return null;

    const count = this._getRemainingCount(type);
    const initialAlpha = count <= 0 ? 0.35 : 1.0;

    // Card background
    const bg = this.#scene.add.rectangle(x, y, buttonW, buttonH, 0x0a1825, 0.95)
      .setDepth(1999)
      .setStrokeStyle(2, 0x00aaff, 0.8)
      .setAlpha(initialAlpha);

    // Preview Sprite
    const previewSprite = this.#scene.add.sprite(x, y - 12, cfg.imageKey, cfg.startFrame)
      .setDepth(2000)
      .setAlpha(initialAlpha);

    const maxDim = 50;
    const scaleFactor = Math.min(maxDim / previewSprite.width, maxDim / previewSprite.height);
    previewSprite.setScale(scaleFactor);

    // Name label
    const nameLabel = this.#scene.add.text(x, y + 32, type, {
      fontSize: '13px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      fill: '#88aabb',
    }).setOrigin(0.5).setDepth(2000).setAlpha(initialAlpha);

    // Count badge/text
    const countText = this.#scene.add.text(x + buttonW / 2 - 8, y - buttonH / 2 + 8, `${count}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      fill: '#44ff88',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(2001).setAlpha(initialAlpha);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    previewSprite.setInteractive({ useHandCursor: true });
    nameLabel.setInteractive({ useHandCursor: true });
    countText.setInteractive({ useHandCursor: true });

    // Store references on countText so we can dim everything easily
    countText._buttonComponents = [bg, previewSprite, nameLabel, countText];

    const onSelect = (pointer) => {
      if (this._getRemainingCount(type) <= 0) return;
      const b = this._createBuilding(type, pointer.x, pointer.y, { fromInventory: true });
      if (b) {
        this.#draggingBuilding = b;
        b.isDragging = true;
        this._setPhysicsGhost(b, true);
        b.setDepth(1000);
        this._moveObjectToPointer(b, pointer);
      }
    };

    bg.on('pointerdown', onSelect);
    previewSprite.on('pointerdown', onSelect);
    nameLabel.on('pointerdown', onSelect);
    countText.on('pointerdown', onSelect);

    // Hover effects
    const onHover = (over) => {
      if (this._getRemainingCount(type) <= 0) return;
      bg.setStrokeStyle(2, over ? 0x44ff88 : 0x00aaff, 1);
      bg.setFillStyle(over ? 0x14283c : 0x0a1825, 0.95);
    };
    bg.on('pointerover', () => onHover(true));
    bg.on('pointerout', () => onHover(false));
    previewSprite.on('pointerover', () => onHover(true));
    previewSprite.on('pointerout', () => onHover(false));
    nameLabel.on('pointerover', () => onHover(true));
    nameLabel.on('pointerout', () => onHover(false));
    countText.on('pointerover', () => onHover(true));
    countText.on('pointerout', () => onHover(false));

    this.#inventoryButtons.push(bg, previewSprite, nameLabel, countText);
    this.#inventoryButtonsByType[type] = countText;
    return countText;
  }

  _getAllowedBuildingTypes() {
    const allowed = window.LevelManager?.levelCfg?.allowedBuildings ?? {};
    return Object.keys(allowed).filter(
      (t) => window.ObjectConfig.placeableTypes[t]
    );
  }

  _getRemainingCount(type) {
    const cfg = window.ObjectConfig.placeableTypes[type];
    const max = Number(cfg?.maxCount) || 0;
    const placed = this.#buildingCounts[type] || 0;
    return Math.max(0, max - placed);
  }

  _formatInventoryLabel(type) {
    return `${this._getRemainingCount(type)}`;
  }

  _refreshInventoryLabel(type) {
    const label = this.#inventoryButtonsByType[type];
    if (!label) return;
    const count = this._getRemainingCount(type);
    label.setText(`${count}`);

    const components = label._buttonComponents || [];
    const alpha = count <= 0 ? 0.35 : 1.0;
    components.forEach(c => {
      if (c?.active) c.setAlpha(alpha);
    });
  }

  _createBuilding(type, x, y, options = {}) {
    const cfg = window.ObjectConfig.placeableTypes[type];
    if (!cfg) return null;
    if ((this.#buildingCounts[type] || 0) >= cfg.maxCount) return null;

    const building = window.ObjectFactory.createPlaceable(
      this.#scene, type, x, y, this.#arena, options
    );
    if (!building) return null;

    this.#placedBuildings.push(building);
    this.#buildingCounts[type] = (this.#buildingCounts[type] || 0) + 1;
    this.#totalPlacedCounts[type] = (this.#totalPlacedCounts[type] || 0) + 1;

    this._refreshInventoryLabel(type);
    return building;
  }

  destroyBuilding(building) {
    if (!building?.active) return;

    const type = building.buildingType;
    if (type && this.#buildingCounts[type] > 0) this.#buildingCounts[type]--;
    if (type) this._refreshInventoryLabel(type);

    window.ObjectFactory.destroy(building);

    const i = this.#placedBuildings.indexOf(building);
    if (i > -1) this.#placedBuildings.splice(i, 1);
  }

  getPlacedBuildings() {
    return [...this.#placedBuildings];
  }
}

window.BuildingManager = BuildingManager.getInstance();
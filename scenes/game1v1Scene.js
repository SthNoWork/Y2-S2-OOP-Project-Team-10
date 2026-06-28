// scenes/game1v1Scene.js
// Dedicated local 2-player 1v1 mode scene.
// Left Player (P1) vs Right Player (P2) in a split arena.

class Game1v1Scene extends Phaser.Scene {
  constructor() {
    super('Game1v1Scene');
  }

  init() {
    this.arena = {
      ARENA_X: 96,
      ARENA_Y: 81,
      ARENA_W: 1728,
      ARENA_H: 972,
    };

    // States: 'P1_BUILD', 'P2_BUILD', 'ACTION', 'GAME_OVER'
    this.gameState = 'P1_BUILD';
    this.player1 = null;
    this.player2 = null;
    
    this.placedObjects = [];
    this.activeBombs = [];
    this.inventoryButtons = [];
    this.draggingObject = null;
    
    // Inventory definition for both players
    this.inventories = {
      p1: {
        shortPlank: 5,
        longPlank: 3,
        pillar: 3,
        cube: 4,
        trampoline1v1: 3,
        pillbox1v1: 2,
        mortar1v1: 2,
      },
      p2: {
        shortPlank: 5,
        longPlank: 3,
        pillar: 3,
        cube: 4,
        trampoline1v1: 3,
        pillbox1v1: 2,
        mortar1v1: 2,
      }
    };

    this.buildingCounts = {
      p1: {},
      p2: {}
    };

    // Central hazard spawn timer
    this.nextHazardTime = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');

    // Pre-create the textures so they are available for the inventory preview
    if (!this.textures.exists('__pillbox_tex')) {
      const g = this.add.graphics();
      g.fillStyle(0x333333, 1);
      g.fillRoundedRect(0, 0, 120, 80, 8);
      g.fillStyle(0x111111, 1);
      g.fillRect(24, 24, 72, 16);
      g.lineStyle(2, 0x111111, 1);
      g.strokeRoundedRect(0, 0, 120, 80, 8);
      g.generateTexture('__pillbox_tex', 120, 80);
      g.destroy();
    }
    if (!this.textures.exists('__mortar_tex')) {
      const g = this.add.graphics();
      g.fillStyle(0x404040, 1);
      g.fillRect(0, 0, 50, 100);
      g.fillStyle(0x202020, 1);
      g.fillRect(10, 0, 30, 20);
      g.fillStyle(0x555555, 1);
      g.fillRect(20, 20, 10, 80);
      g.generateTexture('__mortar_tex', 50, 100);
      g.destroy();
    }
    // Random background choice
    const bgChoices = ['asset/background/1.jpg', 'asset/background/3.jpg', 'asset/background/5.jpg'];
    const pick = bgChoices[Math.floor(Math.random() * bgChoices.length)];
    window.UIFactory.addBackground(this, pick);

    // Set up bounds
    this.matter.world.setBounds(-100, -1000, 2120, 2080, 32);

    // Create central visual divider
    const divider = this.add.graphics();
    divider.lineStyle(4, 0x00ffff, 0.4);
    // Draw dashed line down the center (x = 960)
    for (let y = this.arena.ARENA_Y; y < this.arena.ARENA_Y + this.arena.ARENA_H; y += 30) {
      divider.lineBetween(960, y, 960, y + 15);
    }

    // Create central physical barrier that ONLY blocks players
    // Player 1 category: 0x0002, Player 2 category: 0x0004
    // Divider category: 0x0080. Mask: 0x0002 | 0x0004
    const midWall = this.add.rectangle(960, 540, 8, 1080, 0x000000, 0);
    this.matter.add.gameObject(midWall, {
      isStatic: true,
      label: 'midWall',
      collisionFilter: {
        category: 0x0080,
        mask: 0x0002 | 0x0004
      }
    });

    // Create standard boundary ground and outer side walls
    const ground = this.add.rectangle(960, 956, 1920, 24, 0x888888);
    const frictionMult = window.ObjectConfig.globalFrictionMultiplier ?? 10.0;
    const staticFrictionMult = window.ObjectConfig.globalStaticFrictionMultiplier ?? 30.0;
    this.matter.add.gameObject(ground, {
      label: 'platform',
      isStatic: true,
      friction: 1.0 * frictionMult,
      frictionStatic: 10 * staticFrictionMult,
    });

    // Add back button support via global UI
    window.currentActiveScene = 'Game1v1Scene';
    if (window.htmlBackBtn) {
      window.htmlBackBtn.classList.add('active');
    }

    // Initialize players
    this.spawnPlayers();

    // Set up turn-based UI and menus
    this.createTurnUI();
    this.refreshInventoryUI();

    // Set up inputs
    this.setupInputHandlers();

    // Setup collision listener
    this.setupCollisionListener();

    // Track when the first bomb spawns during ACTION phase
    this.hasFiredOnce = false;
    this.events.on('bomb:spawn', () => {
      if (this.gameState === 'ACTION') {
        this.hasFiredOnce = true;
      }
    });
    this.events.once('shutdown', () => {
      this.events.off('bomb:spawn');
    });

    // Set initial state
    this.changeState(new window.P1BuildState(this));
  }

  changeState(newState) {
    if (this.currentState) {
      try { this.currentState.exit(); } catch (e) {}
    }
    this.currentState = newState;
    // Mirror state representation to gameState string for backwards compatibility
    if (newState instanceof window.P1BuildState) this.gameState = 'P1_BUILD';
    else if (newState instanceof window.P2BuildState) this.gameState = 'P2_BUILD';
    else if (newState instanceof window.ActionState) this.gameState = 'ACTION';
    else if (newState instanceof window.GameOverState) this.gameState = 'GAME_OVER';

    try { this.currentState.enter(); } catch (e) {}
  }

  spawnPlayers() {
    // Player 1 (Left)
    this.player1 = window.ObjectFactory.createInternal(this, 'player', 400, 800, this.arena, { skinKey: 'skin_1_happy' });
    this.player1.health = 100;
    this.player1.maxHealth = 100;
    // Set collision filter so P1 only collides with ground, walls, and P1 specific items, and central wall
    if (this.player1.body) {
      this.player1.body.collisionFilter.category = 0x0002;
      this.player1.body.collisionFilter.mask = 0x0001 | 0x0002 | 0x0008 | 0x0010 | 0x0020 | 0x0080;
    }

    // Player 2 (Right)
    this.player2 = window.ObjectFactory.createInternal(this, 'player', 1520, 800, this.arena, { skinKey: 'skin_3_happy' });
    this.player2.health = 100;
    this.player2.maxHealth = 100;
    if (this.player2.body) {
      this.player2.body.collisionFilter.category = 0x0004;
      this.player2.body.collisionFilter.mask = 0x0001 | 0x0004 | 0x0008 | 0x0010 | 0x0020 | 0x0080;
    }
  }

  createTurnUI() {
    // Visual indicators for players turns and health displays
    this.turnText = this.add.text(960, 45, "PLAYER 1: BUILD PHASE", {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '32px',
      fill: '#00ffff'
    }).setOrigin(0.5).setDepth(2000);

    // HP displays
    this.p1HpText = this.add.text(120, 45, "P1 HP: 100", {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      fill: '#ff4444'
    }).setDepth(2000);

    this.p2HpText = this.add.text(1640, 45, "P2 HP: 100", {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      fill: '#ff4444'
    }).setDepth(2000);

     // Turn control buttons (top center)
    this.readyBtn = this.add.text(960, 110, "Ready (Next Turn)", {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      fill: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(2000).setInteractive({ useHandCursor: true });

    this.readyBtn.on('pointerdown', () => this.nextTurn());

    this.resetBtn = this.add.text(960, 175, "Reset Side 🔄", {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      fill: '#ffffff',
      backgroundColor: '#cc5500',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(2000).setInteractive({ useHandCursor: true });

    this.resetBtn.on('pointerdown', () => this.resetActivePlayerSide());
  }

  nextTurn() {
    if (this.gameState === 'P1_BUILD') {
      this.changeState(new window.P2BuildState(this));
    } else if (this.gameState === 'P2_BUILD') {
      this.changeState(new window.ActionState(this));
    }
  }

  resetActivePlayerSide() {
    const activePlayer = this.gameState === 'P1_BUILD' ? 'p1' : 'p2';
    const isP1 = activePlayer === 'p1';

    // Destroy placed objects belonging to the active player's side
    this.placedObjects = this.placedObjects.filter(obj => {
      const onP1Side = obj.x < 960;
      if (isP1 === onP1Side) {
        window.ObjectFactory.destroy(obj);
        return false;
      }
      return true;
    });

    // Reset building counts for the active player
    this.buildingCounts[activePlayer] = {};

    // Refresh inventory UI
    this.refreshInventoryUI();
    window.SfxManager?.playDmgShield?.();
  }

  refreshInventoryUI() {
    // Destroy previous buttons
    this.inventoryButtons.forEach(btn => btn.destroy());
    this.inventoryButtons = [];

    const activePlayer = this.gameState === 'P1_BUILD' ? 'p1' : 'p2';
    const inv = this.inventories[activePlayer];
    
    // Position inventories on Left/Right edges depending on player
    const isP1 = activePlayer === 'p1';
    const x = isP1 ? 140 : 1780;
    let y = 180;
    const buttonW = 110;
    const buttonH = 110;
    const gap = 16;

    Object.keys(inv).forEach(type => {
      const maxCount = inv[type];
      const placedCount = this.buildingCounts[activePlayer][type] || 0;
      const remaining = Math.max(0, maxCount - placedCount);

      // Create button background panel
      const bg = this.add.rectangle(x, y, buttonW, buttonH, 0x0a1825, 0.95)
        .setStrokeStyle(2, 0x00aaff, 1)
        .setDepth(1500)
        .setInteractive({ useHandCursor: true });

      const cfg = window.ObjectConfig.placeableTypes[type] || window.ObjectConfig.internalTypes[type];
      
      let imageKey = cfg.imageKey;
      let startFrame = cfg.startFrame || 'bomb_1';
      
      if (type === 'pillbox1v1') {
        imageKey = '__pillbox_tex';
        startFrame = undefined;
      } else if (type === 'mortar1v1') {
        imageKey = '__mortar_tex';
        startFrame = undefined;
      }
      
      // Visual preview sprite inside button
      const preview = this.add.sprite(x, y - 12, imageKey, startFrame)
        .setDepth(1501);
      const maxDim = 50;
      const scaleFactor = Math.min(maxDim / preview.width, maxDim / preview.height);
      preview.setScale(scaleFactor);

      // Name label
      const name = this.add.text(x, y + 36, cfg.name || type, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fill: '#ffffff'
      }).setOrigin(0.5).setDepth(1501);

      // Count badge
      const count = this.add.text(x + 36, y - 36, `${remaining}`, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '14px',
        fill: remaining > 0 ? '#44ff88' : '#ff4444'
      }).setOrigin(0.5).setDepth(1501);

      if (remaining <= 0) {
        bg.setAlpha(0.4);
        preview.setAlpha(0.4);
        name.setAlpha(0.4);
      } else {
        bg.on('pointerdown', (pointer) => this.startDraggingPlacement(type, pointer));
      }

      this.inventoryButtons.push(bg, preview, name, count);
      y += buttonH + gap;
    });
  }

  startDraggingPlacement(type, pointer) {
    if (this.draggingObject) return;

    const activePlayer = this.gameState === 'P1_BUILD' ? 'p1' : 'p2';
    const obj = window.ObjectFactory.createPlaceable(this, type, pointer.x, pointer.y, this.arena, { fromInventory: true });

    if (obj) {
      this.draggingObject = obj;
      obj.isDragging = true;
      obj.setStatic(true);
      if (obj.body) obj.body.collisionFilter.mask = 0; // Disable physics during drag
      obj.setDepth(1000);
    }
  }

  setupInputHandlers() {
    this.input.on('pointermove', (pointer) => {
      if (!this.draggingObject) return;
      
      // Clamp placement coordinates to active player's screen half
      const isP1 = this.gameState === 'P1_BUILD';
      const minX = isP1 ? this.arena.ARENA_X : 964;
      const maxX = isP1 ? 956 : this.arena.ARENA_X + this.arena.ARENA_W;
      
      const targetX = Phaser.Math.Clamp(pointer.x, minX, maxX);
      const targetY = Phaser.Math.Clamp(pointer.y, this.arena.ARENA_Y, 930);

      if (this.draggingObject.body) {
        Phaser.Physics.Matter.Matter.Body.setPosition(this.draggingObject.body, { x: targetX, y: targetY });
      }
      this.draggingObject.x = targetX;
      this.draggingObject.y = targetY;
    });

    this.input.on('pointerup', () => {
      if (!this.draggingObject) return;

      const obj = this.draggingObject;
      this.draggingObject = null;
      obj.isDragging = false;

      // Validate placement and snap if overlapping
      let valid = this.isPlacementValid(obj);
      if (!valid) {
        const snapPos = this.findNearestValidPosition(obj, obj.x, obj.y);
        if (snapPos) {
          valid = true;
          if (obj.body) {
            Phaser.Physics.Matter.Matter.Body.setPosition(obj.body, snapPos);
          }
          obj.x = snapPos.x;
          obj.y = snapPos.y;
        }
      }

      if (valid) {
        // Only keep explosion items (bomb1v1/clusterBomb1v1) static during build phase; structures/trampolines drop instantly
        const isExplosive = obj.buildingType === 'bomb1v1' || obj.buildingType === 'clusterBomb1v1';
        if (isExplosive) {
          obj.setStatic(true);
        } else {
          obj.setStatic(false);
        }
        
        // Enable collision mask
        const activePlayer = this.gameState === 'P1_BUILD' ? 'p1' : 'p2';
        
        // Setup distinct collision filters for Player 1 / Player 2 TNTs & bombs so they ignore each other
        if (obj.body) {
          if (isExplosive) {
            obj.body.collisionFilter.category = (activePlayer === 'p1') ? 0x0010 : 0x0020;
            // Mask excludes 0x0010 and 0x0020 so bombs do not collide with other bombs!
            obj.body.collisionFilter.mask = 0x0001 | 0x0002 | 0x0004 | 0x0008;
            obj.isBomb = true; // Mark as bomb for collision triggers!
          } else {
            obj.body.collisionFilter.category = 0x0008; // Structures category
            obj.body.collisionFilter.mask = 0x0001 | 0x0002 | 0x0004 | 0x0008 | 0x0010 | 0x0020;
          }
        }

        // Enable re-dragging when clicked during the build phase
        obj.off('pointerdown'); // clean up previous listeners if any
        obj.on('pointerdown', (pointer) => {
          if (this.gameState === 'ACTION' || this.gameState === 'GAME_OVER') return;
          
          const isP1 = this.gameState === 'P1_BUILD';
          const onP1Side = obj.x < 960;
          if (isP1 !== onP1Side) return; // Can't drag opponent's block on your turn
          
          this.draggingObject = obj;
          obj.isDragging = true;
          obj.setStatic(true);
          if (obj.body) obj.body.collisionFilter.mask = 0; // Disable mask during drag
          obj.setDepth(1000);
          
          // Remove from list and counts so it doesn't double count
          this.placedObjects = this.placedObjects.filter(o => o !== obj);
          const type = obj.buildingType;
          const activePlayerStr = isP1 ? 'p1' : 'p2';
          if (this.buildingCounts[activePlayerStr][type] > 0) {
            this.buildingCounts[activePlayerStr][type]--;
          }
          this.refreshInventoryUI();
        });

        // Deduct inventory
        const type = obj.buildingType;
        this.buildingCounts[activePlayer][type] = (this.buildingCounts[activePlayer][type] || 0) + 1;
        this.placedObjects.push(obj);
        
        window.SfxManager?.playSpawn?.();
      } else {
        // Destroy if invalid drop
        window.ObjectFactory.destroy(obj);
        window.SfxManager?.playDmgShield?.();
      }

      this.refreshInventoryUI();
    });

    // Keyboard rotation for active builder
    this.input.keyboard.on('keydown', (e) => {
      if (!this.draggingObject) return;
      if (e.key === 'q' || e.key === 'Q' || e.key === 'k' || e.key === 'K') {
        this.draggingObject.angle -= 15;
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'l' || e.key === 'L') {
        this.draggingObject.angle += 15;
      }
    });

    // Movement keys configuration
    this.keys = {
      // Player 1 (Left): WASD
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      
      // Player 2 (Right): Arrows
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    };
  }

  isPlacementValid(building) {
    return window.GameLogicHelper.isPlacementValid(this, building);
  }

  findNearestValidPosition(building, startX, startY) {
    return window.GameLogicHelper.findNearestValidPosition(this, building, startX, startY);
  }

  setupCollisionListener() {
    const isBounceable = (body) => {
      if (!body) return false;
      const label = body.label || '';
      const go = body.gameObject;
      if (label === 'bomb' || label === 'tnt') return true;
      if (go) {
        const typeStr = (go.buildingType || go.objectType || '').toLowerCase();
        if (go.isBomb || typeStr.includes('bomb') || typeStr.includes('tnt')) return true;
      }
      return false;
    };

    this.matter.world.on('collisionstart', (event) => {
      event.pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        if (!bodyA || !bodyB) return;

        // Trampoline bouncing logic
        const trampoline = bodyA.label === 'trampoline' ? bodyA : bodyB.label === 'trampoline' ? bodyB : null;
        if (trampoline) {
          const other = trampoline === bodyA ? bodyB : bodyA;
          if (isBounceable(other)) {
            if (trampoline.gameObject && typeof trampoline.gameObject.bounce === 'function') {
              trampoline.gameObject.bounce(other);
            }
            return;
          }
        }
        // Detonation trigger on impact
        const bomb = (bodyA.gameObject?.isBomb || bodyA.label === 'bomb') ? bodyA : (bodyB.gameObject?.isBomb || bodyB.label === 'bomb') ? bodyB : null;
        if (bomb) {
          const other = bomb === bodyA ? bodyB : bodyA;
          // Ignore other bombs and sensors
          if (other.label !== 'bomb' && !other.isSensor && other.label !== 'midWall') {
            this.detonateBomb(bomb.gameObject);
          }
        }
      });
    });
  }

  detonateBomb(bomb) {
    if (!bomb || !bomb.active || bomb._dying) return;
    bomb._dying = true;

    const type = bomb.buildingType || bomb.objectType;
    const cfg = window.ObjectConfig.placeableTypes[type] || window.ObjectConfig.internalTypes[type] || window.ObjectConfig.levelTypes[type] || {};

    try {
      const cmd = new window.ExplosionCommand(this, {
        x: bomb.x,
        y: bomb.y,
        explosiveCfg: cfg,
        sourceBomb: bomb
      });
      cmd.execute();
    } catch (e) {
      console.error('Error executing ExplosionCommand in detonateBomb:', e);
    }

    try {
      this.activeBombs = this.activeBombs.filter(b => b !== bomb);
      this.placedObjects = this.placedObjects.filter(b => b !== bomb);
      window.ObjectFactory.destroy(bomb);
    } catch(e){}
  }

  update(time, delta) {
    if (this.currentState) {
      this.currentState.update(time, delta);
    }
  }

  handlePlayerMovement() {
    const SPEED = 5;
    const JUMP_FORCE = -11;

    // Player 1 (Left side) Movement
    if (this.player1?.active && this.player1.body) {
      let vx = 0;
      if (this.keys.a.isDown) vx = -SPEED;
      else if (this.keys.d.isDown) vx = SPEED;
      
      this.matter.body.setVelocity(this.player1.body, { x: vx, y: this.player1.body.velocity.y });

      // Jump when standing on ground/barrier with low vertical velocity
      const isGrounded = Math.abs(this.player1.body.velocity.y) < 0.05;
      if ((this.keys.w.isDown || this.keys.space.isDown) && isGrounded) {
        this.matter.body.setVelocity(this.player1.body, { x: vx, y: JUMP_FORCE });
      }
    }

    // Player 2 (Right side) Movement
    if (this.player2?.active && this.player2.body) {
      let vx = 0;
      if (this.keys.left.isDown) vx = -SPEED;
      else if (this.keys.right.isDown) vx = SPEED;

      this.matter.body.setVelocity(this.player2.body, { x: vx, y: this.player2.body.velocity.y });

      const isGrounded = Math.abs(this.player2.body.velocity.y) < 0.05;
      if (this.keys.up.isDown && isGrounded) {
        this.matter.body.setVelocity(this.player2.body, { x: vx, y: JUMP_FORCE });
      }
    }
  }

  checkWinCondition() {
    if (this.gameState !== 'ACTION') return;

    const p1Hp = this.player1 ? Math.max(0, this.player1.health) : 0;
    const p2Hp = this.player2 ? Math.max(0, this.player2.health) : 0;

    this.p1HpText.setText(`P1 HP: ${p1Hp}`);
    this.p2HpText.setText(`P2 HP: ${p2Hp}`);

    if (p1Hp <= 0 || p2Hp <= 0) {
      this.changeState(new window.GameOverState(this));
    }
  }

  shutdown() {
    this.inventoryButtons.forEach(btn => btn.destroy());
    this.inventoryButtons = [];
    if (this.turnText) this.turnText.destroy();
    if (this.p1HpText) this.p1HpText.destroy();
    if (this.p2HpText) this.p2HpText.destroy();
    if (this.readyBtn) this.readyBtn.destroy();
    if (this.resetBtn) this.resetBtn.destroy();
    
    this.placedObjects.forEach(obj => window.ObjectFactory.destroy(obj));
    this.placedObjects = [];

    this.activeBombs.forEach(b => window.ObjectFactory.destroy(b));
    this.activeBombs = [];
  }
}

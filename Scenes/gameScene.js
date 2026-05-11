// ========================================
// GAME SCENE
// ========================================
// Thin orchestrator for the main gameplay screen.
// Owns: arena setup, physics bounds, scene resize, and manager initialisation.
// All gameplay logic is delegated to GameLogic, BuildingManager, LevelManager, and UIFactory.

class GameScene extends Phaser.Scene {

  constructor() {
    super('GameScene');
    this.arena       = null;
    this.arenaBorder = null;
    this.player      = null;
  }

  // ========================================
  // SCENE SETUP
  // ========================================

  create() {
    this.cameras.main.setBackgroundColor('#808080');

    // -- Build arena dimensions from current screen size --
    this.arena = this._buildArena(this.scale.width, this.scale.height);

    // -- Physics world bounds extend one screen-width either side for plane travel --
    this.matter.world.setBounds(
      this.arena.PHYSICS_X, this.arena.PHYSICS_Y,
      this.arena.PHYSICS_W, this.arena.PHYSICS_H,
      32
    );

    this._drawArenaBorder();

    // -- Listen for screen resize --
    this.scale.off('resize', this._onResize, this);
    this.scale.on('resize',  this._onResize, this);

    // -- Create player at arena centre --
    this.player = window.ObjectFactory.createPlayer(
      this,
      this.arena.ARENA_X + this.arena.ARENA_W / 2,
      this.arena.ARENA_Y + this.arena.ARENA_H / 2,
      this.arena
    );

    // -- Initialise managers --
    window.GameLogic.init(this, this.player, this.arena);
    window.BuildingManager.init(this, this.arena);
    window.LevelManager.init(this, this.arena);

    // -- HUD --
    const healthText = window.UIFactory.addHealthText(this, this.arena);
    window.LevelManager.setHealthText(healthText);

    // -- Action buttons --
    this._createActionButtons();

    // -- Back button --
    window.UIFactory.addBackButton(this, () => window.startScene('LevelSelectScene'));
  }

  // ========================================
  // GAME LOOP
  // ========================================

  update(_time, delta) {
    window.GameLogic.update(delta);
    window.LevelManager.update();
  }

  // ========================================
  // ACTION BUTTONS
  // ========================================

  _createActionButtons() {
    const { ARENA_X, ARENA_W, ARENA_Y, ARENA_H } = this.arena;
    const btnX   = ARENA_X + ARENA_W * 0.99;
    const btnY   = ARENA_Y + ARENA_H * 0.02;
    const btnGap = ARENA_H * 0.055;

    // Start bombing run — plane always spawns left and flies right.
    window.UIFactory.createButton(this, btnX, btnY, 'Start', () => {
      window.GameLogic.startBombingRun(
        ARENA_W * 0.35,
        { x: -this.arena.W, y: ARENA_Y + ARENA_H * 0.04 },
        1
      );
    });

    // Reset level.
    window.UIFactory.createButton(this, btnX, btnY + btnGap, 'Reset', () => {
      this.player = window.LevelManager.reset(this.player);
    });
  }

  // ========================================
  // ARENA BORDER
  // ========================================

  // Draw (or redraw) the white outline around the physics play area.
  _drawArenaBorder() {
    if (this.arenaBorder) {
      this.arenaBorder.clear();
    } else {
      this.arenaBorder = this.add.graphics();
    }

    if (!this.arena) return;

    this.arenaBorder
      .lineStyle(2, 0xffffff, 1)
      .strokeRect(
        this.arena.PHYSICS_X, this.arena.PHYSICS_Y,
        this.arena.PHYSICS_W, this.arena.PHYSICS_H
      );
  }

  // ========================================
  // RESIZE
  // ========================================

  // Recalculate arena and physics bounds when the window size changes.
  _onResize(gameSize) {
    this.arena = this._buildArena(gameSize.width, gameSize.height);
    this.matter.world.setBounds(
      this.arena.PHYSICS_X, this.arena.PHYSICS_Y,
      this.arena.PHYSICS_W, this.arena.PHYSICS_H,
      32
    );
    this._drawArenaBorder();
  }

  // ========================================
  // HELPERS
  // ========================================

  // Compute all arena layout values from screen dimensions.
  _buildArena(W, H) {
    const ARENA_X   = W * 0.05;
    const ARENA_Y   = H * 0.075;
    const ARENA_W   = W * 0.9;
    const ARENA_H   = H * 0.9;
    const PHYSICS_X = -W;
    const PHYSICS_Y = ARENA_Y;
    const PHYSICS_W = 3 * W;
    const PHYSICS_H = ARENA_H;
    return { W, H, ARENA_X, ARENA_Y, ARENA_W, ARENA_H, PHYSICS_X, PHYSICS_Y, PHYSICS_W, PHYSICS_H };
  }
}

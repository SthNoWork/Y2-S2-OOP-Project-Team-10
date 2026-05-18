// ========================================
// GAME SCENE
// ========================================
// Thin orchestrator. All gameplay delegated to managers.
// GameScene only owns: arena setup, physics bounds, resize, button wiring.

class GameScene extends Phaser.Scene {

  constructor() {
    super('GameScene');
    this.arena       = null;
    this.arenaBorder = null;
    this.player      = null;
    this._levelNum   = 1;   // set by LevelSelectScene before starting
  }

  // ========================================
  // SCENE SETUP
  // ========================================

  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/1.jpg');

    this.arena = this._buildArena(this.scale.width, this.scale.height);

    this.matter.world.setBounds(
      this.arena.PHYSICS_X, this.arena.PHYSICS_Y,
      this.arena.PHYSICS_W, this.arena.PHYSICS_H,
      32
    );

    this._drawArenaBorder();

    this.scale.on('resize',  this._onResize, this);

    // Load level — creates player, platforms, pre-placed buildings, HUD.
    const levelNum  = window._currentLevel ?? 1;
    this.player     = window.LevelManager.load(this, this.arena, levelNum);

    // BuildingManager still needs init for drag/inventory.
    window.BuildingManager.init(this, this.arena);

    // Action buttons.
    this._createActionButtons();

    // Back button.
    window.UIFactory.addBackButton(this, () => window.startScene('LevelSelectScene'));
  }

  // ========================================
  // GAME LOOP
  // ========================================

  update(_time, delta) {
    window.GameLogic.update(delta);
    window.LevelManager.update(delta);   // delta needed for between-wave countdown
  }

  // ========================================
  // ACTION BUTTONS
  // ========================================

  _createActionButtons() {
    const { ARENA_X, ARENA_W, ARENA_Y } = this.arena;
    const btnX   = ARENA_X + ARENA_W - window.Scale.screenScaleW(this, window.Scale.baseW * 0.01);
    const btnY   = ARENA_Y + window.Scale.screenScaleH(this, window.Scale.baseH * 0.02);
    const btnGap = window.Scale.screenScaleH(this, window.Scale.baseH * 0.055);

    // Start — fires the first wave and begins the auto sequence.
    window.UIFactory.createButton(this, btnX, btnY, 'Start', () => {
      window.LevelManager.startWave();
    });

    // Reset — full scene reload, returns to placement phase.
    window.UIFactory.createButton(this, btnX, btnY + btnGap, 'Reset', () => {
      window.startScene('GameScene');
    });

    // Debug — log placed objects (only in debug mode).
    if (window.DEBUG) {
      window.UIFactory.createButton(this, btnX, btnY + btnGap * 2, 'Debug', () => {
        const placed = window.BuildingManager.getPlacedBuildings();
        console.log(`[Debug] placedBuildings count: ${placed.length}`);
        placed.forEach((b, i) => {
          const inWorld = this.matter?.world?.localWorld?.bodies?.includes(b.body) ?? '?';
          console.log(`  [${i}] type=${b.buildingType} active=${b.active} visible=${b.visible} x=${Math.round(b.x)} y=${Math.round(b.y)} health=${b.health} ghostRemoved=${b._ghostRemoved} inWorld=${inWorld}`);
        });
        console.log('[Debug] buildingCounts:', JSON.stringify(window.BuildingManager.buildingCounts));
        console.log('[Debug] GameLogic.buildings count:', window.GameLogic.buildings.length);
        window.GameLogic.buildings.forEach((b, i) => {
          console.log(`  [GL ${i}] type=${b.buildingType} active=${b.active} x=${Math.round(b.x)} y=${Math.round(b.y)} health=${b.health}`);
        });
      });
    }
  }

  // ========================================
  // ARENA BORDER
  // ========================================

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
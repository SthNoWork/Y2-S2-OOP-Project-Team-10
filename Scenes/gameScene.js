class GameScene extends Phaser.Scene {

  constructor() {
    super('GameScene');
    this.arena       = null;
    this.arenaBorder = null;
    this.player      = null;
  }

  
  
  

  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/1.jpg');

    this.arena = {
      ARENA_X: 96,
      ARENA_Y: 81,
      ARENA_W: 1728,
      ARENA_H: 972,
    };

    
    this.matter.world.setBounds(-1920, 0, 5760, 1080, 32);

    // this._drawArenaBorder();

    
    const levelNum = window._currentLevel;
    this.player    = window.LevelManager.load(this, this.arena, levelNum);

    
    window.BuildingManager.init(this, this.arena);

    
    this._createActionButtons();

    
    window.UIFactory.addBackButton(this, () => window.startScene('LevelSelectScene'));
  }

  
  
  

  update(_time, delta) {
    window.GameLogic.update(delta);
    window.LevelManager.update(delta);
    const placed    = window.BuildingManager.getPlacedBuildings();
    const prePlaced = window.LevelManager._prePlaced;
    window.ObjectFactory.updateDebugLabels([...placed, ...prePlaced]);
  }

  
  
  

  _createActionButtons() {
    const { ARENA_X, ARENA_W, ARENA_Y } = this.arena;
    const btnX   = ARENA_X + ARENA_W - 19;  
    const btnY   = ARENA_Y + 22;            
    const btnGap = 59;                       

    window.UIFactory.createButton(this, btnX, btnY, 'Start', () => {
      window.LevelManager.startWave();
    });

    window.UIFactory.createButton(this, btnX, btnY + btnGap, 'Reset', () => {
      window.startScene('GameScene');
    });

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

  
  
  

  _drawArenaBorder() {
    if (this.arenaBorder) {
      this.arenaBorder.clear();
    } else {
      this.arenaBorder = this.add.graphics();
    }
    if (!this.arena) return;
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;
    this.arenaBorder
      .lineStyle(2, 0xffffff, 1)
      .strokeRect(ARENA_X, ARENA_Y, ARENA_W, ARENA_H);
  }

}
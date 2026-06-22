// scenes/levelSelectScene.js
// Displays a grid of level buttons. Locked levels are greyed out.

class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    window.UIFactory.addBackground(this, 'asset/background/2.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());

    this.add.text(960, 270, 'Select Level', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '86px',
      color:      'black',
    }).setOrigin(0.5);

    this._buildLevelGrid();
  }

  _buildLevelGrid() {
    const cols        = 5;
    const btnW        = 211;
    const btnH        = 97;
    const padX        = 48;
    const padY        = 43;
    const totalW      = cols * btnW + (cols - 1) * padX;
    const startX      = (1920 - totalW) / 2;
    const startY      = 486;
    const totalLevels = Object.keys(window.Levels ?? {}).length || 10;

    for (let i = 0; i < totalLevels; i++) {
      const col   = i % cols;
      const row   = Math.floor(i / cols);
      const x     = startX + col * (btnW + padX);
      const y     = startY + row * (btnH + padY);
      const level = i + 1;

      this._buildLevelButton(x, y, btnW, btnH, level);
    }
  }

  _buildLevelButton(x, y, btnW, btnH, level) {
    // A level must exist in the config AND be unlocked (or debug is on).
    const exists     = !!(window.Levels?.[level]?.waves?.length);
    const unlocked   = exists && window.LevelManager.isLevelUnlocked(level);
    const color      = unlocked ? 0xffffff : 0xaaaaaa;
    const textColor  = unlocked ? '#000000' : '#555555';

    const box = this.add
      .rectangle(x + btnW / 2, y + btnH / 2, btnW, btnH, color)
      .setInteractive({ useHandCursor: unlocked });

    // Show a lock icon on locked-but-existing levels.
    const label = unlocked ? `Level ${level}` : `🔒 ${level}`;

    this.add.text(x + btnW / 2, y + btnH / 2, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '38px',
      color:      textColor,
    }).setOrigin(0.5);

    if (unlocked) {
      box.on('pointerdown', () => {
        window._currentLevel = level;
        window.startScene('GameScene');
      });
      if (!this.sys.game.device.input.touch) {
        box.on('pointerover',  () => box.setFillStyle(0xe8e8e8));
        box.on('pointerout',   () => box.setFillStyle(0xffffff));
      }
    }
  }
}
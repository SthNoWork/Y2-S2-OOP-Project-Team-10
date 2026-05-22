// levelSelectScene.js
// Displays a grid of level buttons.
// All sizes and positions are fixed 1920×1080 px — Phaser Scale.FIT handles display scaling.

class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  // Builds the title, level grid, and back button.
  // Unlocked levels get white buttons; locked levels get greyed-out, non-interactive buttons.
  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/2.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());

    this.add.text(960, 270, 'Select Level', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '86px',
      color:      '#000000',
    }).setOrigin(0.5);

    const cols        = 5;
    const btnW        = 211;   // button width
    const btnH        = 97;    // button height
    const padX        = 48;    // horizontal gap between buttons
    const padY        = 43;    // vertical gap between buttons
    const totalW      = cols * btnW + (cols - 1) * padX;
    const startX      = (1920 - totalW) / 2;
    const startY      = 486;   // 1080 × 0.45
    const totalLevels = Object.keys(window.Levels ?? {}).length || 10;

    for (let i = 0; i < totalLevels; i++) {
      const col        = i % cols;
      const row        = Math.floor(i / cols);
      const x          = startX + col * (btnW + padX);
      const y          = startY + row * (btnH + padY);
      const level      = i + 1;
      const isUnlocked = !!(window.Levels?.[level]?.waves?.length);

      const box = this.add
        .rectangle(x + btnW / 2, y + btnH / 2, btnW, btnH, isUnlocked ? 0xffffff : 0xaaaaaa)
        .setInteractive({ useHandCursor: isUnlocked });

      this.add.text(x + btnW / 2, y + btnH / 2, `Level ${level}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize:   '38px',
        color:      isUnlocked ? '#000000' : '#555555',
      }).setOrigin(0.5);

      if (isUnlocked) {
        box.on('pointerdown', () => {
          window._currentLevel = level;
          window.startScene('GameScene');
        });
      }
    }
  }
}
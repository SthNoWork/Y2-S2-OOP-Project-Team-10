// levelSelectScene.js
// Displays a grid of level buttons.
// A level is shown as active if it exists in window.Levels with at least one wave.
// Tapping an active button sets window._currentLevel and transitions to GameScene.

class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  // Builds the title, level grid, and back button.
  // Unlocked levels get white buttons; locked levels get greyed-out, non-interactive buttons.
  create() {
    const W     = this.scale.width;
    const H     = this.scale.height;
    const scale = window.Scale;

    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/2.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());

    const titleFontSize = scale.screenScaleH(this, scale.baseH * 0.08);
    this.add.text(W * 0.5, H * 0.25, 'Select Level', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   `${titleFontSize}px`,
      color:      '#000000',
    }).setOrigin(0.5);

    const cols        = 5;
    const btnW        = scale.screenScaleW(this, scale.baseW * 0.11);
    const btnH        = scale.screenScaleH(this, scale.baseH * 0.09);
    const padX        = scale.screenScaleW(this, scale.baseW * 0.025);
    const padY        = scale.screenScaleH(this, scale.baseH * 0.04);
    const totalW      = cols * btnW + (cols - 1) * padX;
    const startX      = (W - totalW) / 2;
    const startY      = H * 0.45;
    const btnFontSize = scale.screenScaleH(this, scale.baseH * 0.035);
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
        fontSize:   `${btnFontSize}px`,
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
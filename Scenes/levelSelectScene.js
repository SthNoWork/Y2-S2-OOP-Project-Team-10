// ========================================
// LEVEL SELECT SCENE
// ========================================

class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/2.jpg');
    window.UIFactory.addBackground(this);

    window.UIFactory.addBackButton(this, () => window.showHomeScreen());

    const titleFontSize = Math.round(H * 0.08);
    this.add.text(W * 0.5, H * 0.25, 'Select Level', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   `${titleFontSize}px`,
      color:      '#000000',
    }).setOrigin(0.5);

    const cols        = 5;
    const btnW        = W * 0.11;
    const btnH        = H * 0.09;
    const padX        = W * 0.025;
    const padY        = H * 0.04;
    const totalW      = cols * btnW + (cols - 1) * padX;
    const startX      = (W - totalW) / 2;
    const startY      = H * 0.45;
    const btnFontSize = Math.round(H * 0.035);

    const totalLevels = Object.keys(window.Levels ?? {}).length || 10;

    for (let i = 0; i < totalLevels; i++) {
      const col        = i % cols;
      const row        = Math.floor(i / cols);
      const x          = startX + col * (btnW + padX);
      const y          = startY + row * (btnH + padY);
      const level      = i + 1;
      // A level is playable if it exists in window.Levels with a waves array.
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
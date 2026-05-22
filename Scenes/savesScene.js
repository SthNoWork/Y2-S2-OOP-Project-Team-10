class SavesScene extends Phaser.Scene {
  constructor() { super('SavesScene'); }

  
  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/4.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());
  }
} 
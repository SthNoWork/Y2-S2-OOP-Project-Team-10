// ========================================
// SAVES SCENE
// ========================================

class SavesScene extends Phaser.Scene {
  constructor() { super('SavesScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());
  }
}

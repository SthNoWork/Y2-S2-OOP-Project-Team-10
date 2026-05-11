// ========================================
// PROFILE SCENE
// ========================================

class ProfileScene extends Phaser.Scene {
  constructor() { super('ProfileScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());
  }
}

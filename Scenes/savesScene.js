// savesScene.js
// Placeholder scene for the save-file management screen.
// Currently shows only a background and a back button.

class SavesScene extends Phaser.Scene {
  constructor() { super('SavesScene'); }

  // Sets up the background and back button.
  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/4.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());
  }
}
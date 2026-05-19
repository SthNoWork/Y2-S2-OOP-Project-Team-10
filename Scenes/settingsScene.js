// settingsScene.js
// Placeholder scene for the game settings screen.
// Currently shows only a background and a back button.

class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  // Sets up the background and back button.
  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/3.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());
  }
}
// scenes/settingsScene.js
class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/3.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());
  }
}
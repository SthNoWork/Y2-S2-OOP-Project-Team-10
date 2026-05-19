// profileScene.js
// Placeholder scene for the player profile screen.
// Currently shows only a background and a back button.

class ProfileScene extends Phaser.Scene {
  constructor() { super('ProfileScene'); }

  // Sets up the background and back button.
  create() {
    this.cameras.main.setBackgroundColor('#808080');
    window.UIFactory.addBackground(this, 'asset/background/5.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());
  }
}
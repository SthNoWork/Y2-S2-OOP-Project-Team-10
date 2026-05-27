// scenes/shopsScene.js
class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    window.UIFactory.addBackground(this, 'asset/background/4.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());
  }
}
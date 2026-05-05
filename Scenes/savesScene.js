class SavesScene extends Phaser.Scene {
  constructor() {
    super("SavesScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#808080");

    addBackButton(this, () => window.showHomeScreen());
  }
}

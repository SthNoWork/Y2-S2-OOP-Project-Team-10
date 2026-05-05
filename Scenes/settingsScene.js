class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#808080");

    addBackButton(this, () => window.showHomeScreen());
  }
}

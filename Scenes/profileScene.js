class ProfileScene extends Phaser.Scene {
  constructor() {
    super("ProfileScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#808080");

    addBackButton(this, () => window.showHomeScreen());
  }
}

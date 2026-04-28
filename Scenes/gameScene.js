class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#808080");

    const backButton = this.add
      .text(20, 20, "Back", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: "#000000",
      })
      .setInteractive({ useHandCursor: true });

    backButton.on("pointerdown", () => {
      window.startScene("LevelSelectScene");
    });
  }
}

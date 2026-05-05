class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelectScene");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#808080");

    addBackButton(this, () => window.showHomeScreen());

    this.add
      .text(W * 0.5, H * 0.25, "Select Level", {
        // was H/2 - 120
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: "#000000",
      })
      .setOrigin(0.5);

    const cols = 5;
    const btnW = W * 0.11;
    const btnH = H * 0.09;
    const padX = W * 0.025;
    const padY = H * 0.04;
    const totalW = cols * btnW + (cols - 1) * padX;
    const startX = (W - totalW) / 2;
    const startY = H * 0.45;

    for (let i = 0; i < 10; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + padX);
      const y = startY + row * (btnH + padY);
      const level = i + 1;
      const isUnlocked = level === 1;

      const box = this.add
        .rectangle(
          x + btnW / 2,
          y + btnH / 2,
          btnW,
          btnH,
          isUnlocked ? 0xffffff : 0xaaaaaa,
        )
        .setInteractive({ useHandCursor: isUnlocked });

      this.add
        .text(x + btnW / 2, y + btnH / 2, `Level ${level}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: isUnlocked ? "#000000" : "#555555",
        })
        .setOrigin(0.5);

      if (isUnlocked) {
        box.on("pointerdown", () => window.startScene("GameScene"));
      }
    }
  }
}

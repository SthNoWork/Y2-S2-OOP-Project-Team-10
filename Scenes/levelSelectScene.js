class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelectScene");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#808080");

    // Back button
    const backButton = this.add
      .text(20, 20, "Back", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: "#000000",
      })
      .setInteractive({ useHandCursor: true });

    backButton.on("pointerdown", () => {
      window.showHomeScreen();
    });

    // Title
    this.add
      .text(W / 2, H / 2 - 120, "Select Level", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: "#000000",
      })
      .setOrigin(0.5);

    // Level grid: 5 cols x 2 rows = 10 buttons
    const cols = 5;
    const btnW = 100;
    const btnH = 50;
    const padX = 20;
    const padY = 20;
    const totalW = cols * btnW + (cols - 1) * padX;
    const startX = (W - totalW) / 2;
    const startY = H / 2 - btnH;

    for (let i = 0; i < 10; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + padX);
      const y = startY + row * (btnH + padY);
      const level = i + 1;
      const isUnlocked = level === 1;

      const box = this.add
        .rectangle(x + btnW / 2, y + btnH / 2, btnW, btnH, isUnlocked ? 0xffffff : 0xaaaaaa)
        .setInteractive({ useHandCursor: isUnlocked });

      this.add
        .text(x + btnW / 2, y + btnH / 2, `Level ${level}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: isUnlocked ? "#000000" : "#555555",
        })
        .setOrigin(0.5);

      if (isUnlocked) {
        box.on("pointerdown", () => {
          this.scene.start("GameScene");
        });
      }
    }
  }
}

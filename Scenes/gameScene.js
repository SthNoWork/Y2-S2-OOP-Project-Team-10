class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#808080");

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.children.removeAll(true);
      if (this.matter?.world) {
        this.matter.world.destroy();
      }
    });

    // Visible arena border
    this.add
      .graphics()
      .lineStyle(2, 0xffffff, 1)
      .strokeRect(ARENA_X, ARENA_Y, ARENA_W, ARENA_H);

    // 1. Create the visible rectangle
    const visual = this.add.rectangle(
      ARENA_X + ARENA_W / 2,
      ARENA_Y + ARENA_H / 2,
      200,
      100,
      0x0000ff, // blue
    );

    // 2. Give it a Matter.js physics body
    const rectangle = this.matter.add.gameObject(visual, {
      restitution: 0.5,
    });

    // Back button
    addBackButton(this, () => window.startScene("LevelSelectScene"));
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    const ARENA_X = W * 0.05;
    const ARENA_Y = H * 0.075;
    const ARENA_W = W * 0.9;
    const ARENA_H = H * 0.9;

    this.cameras.main.setBackgroundColor("#808080");
    this.matter.world.setBounds(ARENA_X, ARENA_Y, ARENA_W, ARENA_H, 32);

    this.add
      .graphics()
      .lineStyle(2, 0xffffff, 1)
      .strokeRect(ARENA_X, ARENA_Y, ARENA_W, ARENA_H);

    const visual = this.add.rectangle(
      ARENA_X + ARENA_W / 2,
      ARENA_Y + ARENA_H / 2,
      W * 0.1,
      H * 0.1,
      0x0000ff,
    );
    this.matter.add.gameObject(visual, { restitution: 0.5 });

    addBackButton(this, () => window.startScene("LevelSelectScene"));
  }
}

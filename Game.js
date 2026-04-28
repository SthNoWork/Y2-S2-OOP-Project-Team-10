const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  backgroundColor: "#808080",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // BootScene goes first — it does nothing, just sits idle
  // so Phaser doesn't auto-run any real scene on boot
  scene: [BootScene, GameScene, LevelSelectScene, SettingsScene, SavesScene, ProfileScene],
};

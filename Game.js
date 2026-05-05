const GAME_WIDTH = window.innerWidth; // was 800
const GAME_HEIGHT = window.innerHeight; // was 600

// DELETE these 4 lines entirely:
// const ARENA_X = 50;
// const ARENA_Y = 50;
// const ARENA_W = GAME_WIDTH - 100;
// const ARENA_H = GAME_HEIGHT - 100;

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  backgroundColor: "#808080",
  scale: {
    mode: Phaser.Scale.EXPAND, // was Phaser.Scale.FIT
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 1 },
      debug: false,
      // DELETE the setBounds block entirely
    },
  },
  scene: [
    BootScene,
    GameScene,
    LevelSelectScene,
    SettingsScene,
    SavesScene,
    ProfileScene,
  ],
};

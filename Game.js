const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const ARENA_X = 50;
const ARENA_Y = 50;
const ARENA_W = GAME_WIDTH - 100;
const ARENA_H = GAME_HEIGHT - 100;

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
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 1 },
      debug: false,
      setBounds: {
        x: ARENA_X,
        y: ARENA_Y,
        width: ARENA_W,
        height: ARENA_H,
        thickness: 32,
      },
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

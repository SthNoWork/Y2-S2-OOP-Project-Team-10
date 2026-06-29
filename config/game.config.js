// config/game.config.js
// Phaser game configuration.
// Loaded LAST so all scene classes are already defined before this runs.

const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#000000',

  render: {
    pixelArt: true,
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
    orientation: Phaser.Scale.Orientation.LANDSCAPE,
    fullscreenTarget: 'parent',
    expandParent: false,
  },

  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 },
      debug: !!window.SHOW_HITBOXES,
    },
  },

  scene: [
    BootScene,
    GameScene,
    Game1v1Scene,
    LevelSelectScene,
    SettingsScene,
    ShopScene,
    LeaderboardScene,
    ProfileScene,
  ],
};
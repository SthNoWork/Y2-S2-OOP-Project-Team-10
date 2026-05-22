// Game.js
// Entry point for the Phaser game instance.
// Fixed at 1920×1080. Phaser Scale.FIT handles all display scaling.

window.DEBUG    = true;
window.logDebug = function (...args) {
  if (window.DEBUG) console.log(...args);
};

const config = {
  type: Phaser.AUTO,
  width:  1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#808080',
  render: {
    pixelArt: true,
  },
  scale: {
    mode:             Phaser.Scale.FIT,
    autoCenter:       Phaser.Scale.CENTER_BOTH,
    orientation:      Phaser.Scale.Orientation.LANDSCAPE,
    fullscreenTarget: 'parent',
    expandParent:     false,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 },
      debug:   true,
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
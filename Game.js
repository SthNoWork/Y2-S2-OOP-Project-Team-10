// Game.js
// Entry point for the Phaser game instance.
// Defines viewport dimensions, the Scale utility used by every scene,
// global debug helpers, and the Phaser config object.
// The game is instantiated by index.html via window.startScene().

const GAME_WIDTH  = window.innerWidth;
const GAME_HEIGHT = window.innerHeight;

window.DEBUG    = window.DEBUG ?? false;
// Logs to the console only when window.DEBUG is true.
window.logDebug = function (...args) {
  if (window.DEBUG) console.log(...args);
};

// Scale helpers that convert design-time values (authored at 1920×1080)
// into live pixel values for the current viewport or arena size.
window.Scale = {
  baseW: 1920,
  baseH: 1080,

  // Converts a value designed for a 1920-wide canvas to the current scene width.
  screenScaleW(scene, valueAtBase) {
    return Math.round((scene.scale.width / this.baseW) * valueAtBase);
  },

  // Converts a value designed for a 1080-tall canvas to the current scene height.
  screenScaleH(scene, valueAtBase) {
    return Math.round((scene.scale.height / this.baseH) * valueAtBase);
  },

  // Scales a horizontal value relative to the arena's width (not the full canvas).
  arenaScaleW(arena, valueAtBase) {
    return arena.ARENA_W * (valueAtBase / this.baseW);
  },

  // Scales a vertical value relative to the arena's height (not the full canvas).
  arenaScaleH(arena, valueAtBase) {
    return arena.ARENA_H * (valueAtBase / this.baseH);
  },
};

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#808080',
  render: {
    pixelArt: true,
  },
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    orientation: Phaser.Scale.Orientation.LANDSCAPE,
    fullscreenTarget: 'parent',
    expandParent: true,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 },
      debug: false,
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
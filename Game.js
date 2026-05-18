const GAME_WIDTH = window.innerWidth; // was 800
const GAME_HEIGHT = window.innerHeight; // was 600

window.DEBUG = window.DEBUG ?? false;
window.logDebug = function (...args) {
  if (window.DEBUG) console.log(...args);
};

window.Scale = {
  baseW: 1920,
  baseH: 1080,
  screenScaleW(scene, valueAtBase) {
    return Math.round((scene.scale.width / this.baseW) * valueAtBase);
  },
  screenScaleH(scene, valueAtBase) {
    return Math.round((scene.scale.height / this.baseH) * valueAtBase);
  },
  arenaScaleW(arena, valueAtBase) {
    return arena.ARENA_W * (valueAtBase / this.baseW);
  },
  arenaScaleH(arena, valueAtBase) {
    return arena.ARENA_H * (valueAtBase / this.baseH);
  },
};



const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  backgroundColor: "#808080",
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
    default: "matter",
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

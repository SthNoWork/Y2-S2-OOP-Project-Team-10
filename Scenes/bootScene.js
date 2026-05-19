// bootScene.js
// First scene Phaser always starts.
// Preloads all shared assets via SpriteFactory, builds atlases and animations,
// then hands off to the scene stored in window._bootTarget (set by index.html
// before creating the Phaser instance).

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  // Kicks off asset loading for every image, sheet, and text file in window.Assets.
  preload() {
    window.SpriteFactory.preloadAll(this);
  }

  // Assembles atlases and animations from the loaded data, reads the intended
  // target scene from window._bootTarget, then transitions to it.
  create(data) {
    window.SpriteFactory.buildAll(this);

    const nextScene    = window._bootTarget ?? 'GameScene';
    window._bootTarget = null;
    this.scene.start(nextScene);
  }
}
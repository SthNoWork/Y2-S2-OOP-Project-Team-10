// scenes/bootScene.js
// Loads all assets then routes to the target scene (default: GameScene).

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    window.SpriteFactory.preloadAll(this);
  }

  create() {
    window.SpriteFactory.buildAll(this);

    const nextScene    = window._bootTarget ?? 'GameScene';
    window._bootTarget = null;
    this.scene.start(nextScene);
  }
}
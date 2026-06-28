// scenes/bootScene.js
// Loads all assets then routes to the target scene (default: GameScene).

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    window.SpriteFactory.preloadAll(this);

    this.load.on('progress', (value) => {
      const bar = document.getElementById('startup-progress-bar');
      if (bar) {
        bar.style.width = `${Math.round(value * 100)}%`;
      }
    });
  }

  create() {
    window.SpriteFactory.buildAll(this);

    if (window._bootTarget) {
      const target = window._bootTarget;
      window._bootTarget = null;
      this.scene.start(target);
    } else if (window.finishStartup) {
      window.finishStartup();
    }
  }
}
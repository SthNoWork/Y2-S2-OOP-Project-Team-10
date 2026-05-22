class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  
  preload() {
    window.SpriteFactory.preloadAll(this);
  }

  
  
  create(data) {
    window.SpriteFactory.buildAll(this);

    const nextScene    = window._bootTarget ?? 'GameScene';
    window._bootTarget = null;
    this.scene.start(nextScene);
  }
}
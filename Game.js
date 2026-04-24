// Game configuration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false
    }
  },
  scene: [MenuScene, GameScene]
};

// Create the game instance
const game = new Phaser.Game(config);

// Scenes are defined in separate files: MenuScene.js and GameScene.js 
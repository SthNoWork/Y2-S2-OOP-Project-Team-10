// ============== GAME SCENE ==============
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }
  
  create() {
    console.log('Game scene created!');
    
    // Create player (a simple square)
    this.player = this.add.rectangle(400, 300, 40, 40, 0x00ff00);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setBounce(1);
    this.player.body.setDrag(900, 0);
    this.player.body.setMaxVelocity(320, 320);
    
    // Add controls text
    this.add.text(10, 10, 'Use ARROW KEYS or WASD to move | ESC to Menu', {
      fontSize: '14px',
      fill: '#ffffff'
    });
    
    // Create input keys
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      ESC: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    };
    
    // ESC to go back to menu
    this.keys.ESC.on('down', () => {
      this.scene.start('MenuScene');
    });
  }
  
  update() {
    const speed = 300;
    let velocityX = 0;
    let velocityY = this.player.body.velocity.y;

    // Check arrow keys
    if (this.cursors.up.isDown) velocityY = -speed;
    if (this.cursors.down.isDown) velocityY = speed;
    if (this.cursors.left.isDown) velocityX = -speed;
    if (this.cursors.right.isDown) velocityX = speed;

    // Check WASD keys
    if (this.keys.W.isDown) velocityY = -speed;
    if (this.keys.S.isDown) velocityY = speed;
    if (this.keys.A.isDown) velocityX = -speed;
    if (this.keys.D.isDown) velocityX = speed;

    // Preserve gravity effect by defaulting to current Y velocity.
    this.player.body.setVelocity(velocityX, velocityY);
  }
}

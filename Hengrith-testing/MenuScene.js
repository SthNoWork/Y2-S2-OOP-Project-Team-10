// ============== MENU SCENE ==============
class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }
  
  create() {
    console.log('Menu scene created!');
    
    // Add title
    this.add.text(400, 100, 'Main Menu', {
      fontSize: '48px',
      fill: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Create START button
    const startButton = this.add.rectangle(400, 250, 200, 60, 0x0066ff);
    startButton.setInteractive();
    startButton.on('pointerover', () => startButton.setFillStyle(0x0099ff));
    startButton.on('pointerout', () => startButton.setFillStyle(0x0066ff));
    startButton.on('pointerdown', () => {
      console.log('START button clicked!');
      this.scene.start('GameScene');
    });
    
    this.add.text(400, 250, 'START', {
      fontSize: '24px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Create SETTINGS button
    const settingsButton = this.add.rectangle(400, 350, 200, 60, 0xff6600);
    settingsButton.setInteractive();
    settingsButton.on('pointerover', () => settingsButton.setFillStyle(0xff8833));
    settingsButton.on('pointerout', () => settingsButton.setFillStyle(0xff6600));
    settingsButton.on('pointerdown', () => {
      console.log('SETTINGS button clicked!');
    });
    
    this.add.text(400, 350, 'SETTINGS', {
      fontSize: '24px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Create EXIT button
    const exitButton = this.add.rectangle(400, 450, 200, 60, 0xff0000);
    exitButton.setInteractive();
    exitButton.on('pointerover', () => exitButton.setFillStyle(0xff3333));
    exitButton.on('pointerout', () => exitButton.setFillStyle(0xff0000));
    exitButton.on('pointerdown', () => {
      console.log('EXIT button clicked!');
    });
    
    this.add.text(400, 450, 'EXIT', {
      fontSize: '24px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }
}

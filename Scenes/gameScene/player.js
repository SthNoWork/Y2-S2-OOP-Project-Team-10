// ========================================
// PLAYER: Configuration, state, and factory
// ========================================
// Tracks player health and game-over state; creates the player game object.

// ========================================
// CONFIGURATION
// ========================================

// Player visual and physics properties: size, mass, and blast resistance.
window.GameSceneObjectConfig = window.GameSceneObjectConfig || {};
window.GameSceneObjectConfig.player = {
  useImage: false,
  imageKey: "",
  widthRatio: 0.08,
  heightRatio: 0.08,
  color: 0x00ff00,
  maxHealth: 100,
  physics: {
    friction: 0.5,
    restitution: 0.1,
    frictionAir: 0.02,
  },
  // blast/mass properties
  blastResistance: 1.0, // higher => less affected by blast
  mass: 5,
};

// ========================================
// PLAYER_STATE
// ========================================

// Global player state: health, game-over flag, and state mutations.
window.PlayerState = {
  health: window.GameSceneObjectConfig.player.maxHealth,
  gameOver: false,
  
  // Initialize health and clear game-over flag.
  init(maxHealth) {
    this.health = maxHealth || window.GameSceneObjectConfig.player.maxHealth;
    this.gameOver = false;
  },

  // Apply damage and return true if player dies (no-op if already game-over).
  takeDamage(amount) {
    if (this.gameOver) {
      return true;
    }

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.setGameOver();
      return true;
    }

    return false;
  },

  // Restore health up to maximum.
  heal(amount) {
    const maxHealth = window.GameSceneObjectConfig.player.maxHealth;
    this.health = Math.min(this.health + amount, maxHealth);
  },

  // Return true if player is alive and game is not over.
  isAlive() {
    return this.health > 0 && !this.gameOver;
  },

  // Mark the game-over state (one-way: cannot be reverted).
  setGameOver() {
    this.gameOver = true;
  },
};

// ========================================
// FACTORY
// ========================================

// Instantiate the player game object with physics and blast properties.
window.GameSceneObjectFactory.createPlayer = function (scene, x, y, arena) {
  const config = window.GameSceneObjectConfig.player;
  let player;

  if (config.useImage && config.imageKey && scene.textures.exists(config.imageKey)) {
    player = scene.add.image(x, y, config.imageKey);
    player.setDisplaySize(arena.W * config.widthRatio, arena.H * config.heightRatio);
  } else {
    player = scene.add.rectangle(
      x,
      y,
      arena.W * config.widthRatio,
      arena.H * config.heightRatio,
      config.color
    );
  }

  scene.matter.add.gameObject(player, {
    friction: config.physics.friction,
    restitution: config.physics.restitution,
    frictionAir: config.physics.frictionAir,
    label: "player",
  });

  // Store config on the object for easy reference
  player.playerConfig = config;
  // Attach blast properties for GameLogic to read easily
  player.blastResistance = config.blastResistance || 1.0;
  // set mass on the physics body if possible
  if (player.body) {
    try {
      Phaser.Physics.Matter.Matter.Body.setMass(player.body, config.mass || 5);
    } catch (e) {}
  }

  return player;
};

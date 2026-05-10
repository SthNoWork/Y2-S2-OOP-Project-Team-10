// ========================================
// OBJECT FACTORY: Centralized config and creation for bombs, planes, and UI
// ========================================
// Configs drive behavior; factories instantiate and attach properties.

window.GameSceneObjectConfig = window.GameSceneObjectConfig || {};
window.GameSceneObjectFactory = {};

// ========================================
// BOMB_FACTORY
// ========================================

// Bomb config: visual size, physics, and damage/blast parameters.
window.GameSceneObjectConfig.bomb = {
  useImage: false,
  imageKey: '',
  widthRatio: 0.025,
  heightRatio: 0.035,
  color: 0x333333,
  physics: { friction: 0.8, restitution: 0.1, frictionAir: 0.01 },
  blastRadiusRatio: 0.2,
  // blastForce is in px/tick velocity units — no dampener applied.
  // Higher = more dramatic knockback. Tune here.
  blastForce: 500,
  directHitDamage: 50,
  blastMaxDamage: 50,
};

// Create and return a bomb game object with physics body.
window.GameSceneObjectFactory.createBomb = function (scene, x, y, arena) {
  const cfg = window.GameSceneObjectConfig.bomb;

  const bomb = (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey))
    ? scene.add.image(x, y, cfg.imageKey).setDisplaySize(arena.W * cfg.widthRatio, arena.H * cfg.heightRatio)
    : scene.add.rectangle(x, y, arena.W * cfg.widthRatio, arena.H * cfg.heightRatio, cfg.color);

  scene.matter.add.gameObject(bomb, {
    friction: cfg.physics.friction,
    restitution: cfg.physics.restitution,
    frictionAir: cfg.physics.frictionAir,
    label: 'bomb',
  });

  bomb.isBomb = true;

  // Disable bomb-bomb collisions: bombs only explode on ground/player/buildings.
  if (bomb.body && bomb.body.collisionFilter) {
    bomb.body.collisionFilter.category = 0x0004;  // bomb category
    bomb.body.collisionFilter.mask = 0x0001 | 0x0002 | 0x0008;  // ground | player | buildings
  }

  return bomb;
};

// ========================================
// PLANE_FACTORY
// ========================================

// Plane config: visual size, bomb count, and randomized drop parameters.
window.GameSceneObjectConfig.plane = {
  useImage: false,
  imageKey: '',
  widthRatio: 0.12,
  heightRatio: 0.05,
  color: 0xffaa00,
  bombCount: 10,
  // Time-based bomb dropping: bombs spawn on a randomized delay while the plane stays in the physics box.
  bombDropDelayRangeSec: { min: 0.18, max: 0.45 },
  bombDropOffsetRatioRange: { min: -0.35, max: 0.35 },
  bombDropYOffsetRatio: 0.04,
};

// Create and return a plane game object (no physics body).
window.GameSceneObjectFactory.createPlane = function (scene, spawnLocation, arena) {
  const cfg = window.GameSceneObjectConfig.plane;

  if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
    return scene.add.image(spawnLocation.x, spawnLocation.y, cfg.imageKey)
      .setDisplaySize(arena.W * cfg.widthRatio, arena.H * cfg.heightRatio);
  }

  return scene.add.rectangle(spawnLocation.x, spawnLocation.y, arena.W * cfg.widthRatio, arena.H * cfg.heightRatio, cfg.color);
};

// ========================================
// UI_FACTORY
// ========================================

// Button config: styling for text-based UI buttons.
window.GameSceneObjectConfig.ui = {
  button: {
    fontSizeRatio: 0.04,  // 4% of viewport height
    fill: '#ffffff',
    backgroundColor: '#333333',
    paddingXRatio: 0.02,  // 2% of viewport width
    paddingYRatio: 0.015, // 1.5% of viewport height
  },
};

// Create an interactive button text with callback.
window.GameSceneObjectFactory.createButton = function (scene, x, y, label, onClick) {
  const cfg = window.GameSceneObjectConfig.ui.button;
  const fontSize = Math.round(scene.scale.height * cfg.fontSizeRatio);
  const paddingX = Math.round(scene.scale.width * cfg.paddingXRatio);
  const paddingY = Math.round(scene.scale.height * cfg.paddingYRatio);

  return scene.add
    .text(x, y, label, {
      fontSize: `${fontSize}px`,
      fill: cfg.fill,
      backgroundColor: cfg.backgroundColor,
      padding: { x: paddingX, y: paddingY },
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(1000)
    .on('pointerdown', onClick);
};
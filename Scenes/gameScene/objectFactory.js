// Initialize config object
window.GameSceneObjectConfig = window.GameSceneObjectConfig || {};
window.GameSceneObjectFactory = {};

// ----------------------------
// Bomb: config + factory
// ----------------------------
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
  blastForce: 50,
  directHitDamage: 50,
  blastMaxDamage: 50,
};

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

  return bomb;
};

// ----------------------------
// Plane: config + factory
// ----------------------------
window.GameSceneObjectConfig.plane = {
  useImage: false,
  imageKey: '',
  widthRatio: 0.12,
  heightRatio: 0.05,
  color: 0xffaa00,
};

window.GameSceneObjectFactory.createPlane = function (scene, spawnLocation, arena) {
  const cfg = window.GameSceneObjectConfig.plane;

  if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
    return scene.add.image(spawnLocation.x, spawnLocation.y, cfg.imageKey)
      .setDisplaySize(arena.W * cfg.widthRatio, arena.H * cfg.heightRatio);
  }

  return scene.add.rectangle(spawnLocation.x, spawnLocation.y, arena.W * cfg.widthRatio, arena.H * cfg.heightRatio, cfg.color);
};

// ----------------------------
// UI buttons: take explicit x, y — scene decides positions
// ----------------------------
window.GameSceneObjectConfig.ui = {
  button: {
    fontSize: '20px',
    fill: '#ffffff',
    backgroundColor: '#333333',
    padding: { x: 10, y: 8 },
  },
};

window.GameSceneObjectFactory.createButton = function (scene, x, y, label, onClick) {
  const cfg = window.GameSceneObjectConfig.ui.button;

  return scene.add
    .text(x, y, label, {
      fontSize: cfg.fontSize,
      fill: cfg.fill,
      backgroundColor: cfg.backgroundColor,
      padding: cfg.padding,
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(1000)
    .on('pointerdown', onClick);
};
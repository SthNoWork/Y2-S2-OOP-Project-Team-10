// uiFactory.js
// Shared UI construction helpers used by all scenes.
// All values are fixed px authored at 1920×1080 — Phaser Scale.FIT handles display scaling.

window.UIFactory = {};

// Creates a styled text button at (x, y) that fires onClick on tap or click.
// Origin is top-right so buttons anchor naturally from the right edge of the arena.
window.UIFactory.createButton = function (scene, x, y, label, onClick) {
  return scene.add
    .text(x, y, label, {
      fontSize:        '43px',
      fill:            '#ffffff',
      backgroundColor: '#333333',
      padding:         { x: 38, y: 16 },
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(1000)
    .on('pointerdown', onClick);
};

// Adds a Back button at the top-left corner of the scene.
window.UIFactory.addBackButton = function (scene, onClick) {
  return scene.add
    .text(38, 22, 'Back', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '43px',
      color:      '#000000',
    })
    .setInteractive()
    .setOrigin(0, 0)
    .setDepth(1000)
    .on('pointerdown', onClick);
};

// Creates an HP text label anchored to the top-left corner of the arena.
// Returns the text object so the caller can call setText() each frame.
window.UIFactory.addHealthText = function (scene, arena) {
  return scene.add.text(
    arena.ARENA_X + 19,
    arena.ARENA_Y + 11,
    '',
    { fontSize: '32px', fill: '#ffffff' }
  );
};

// Adds a full-cover background image to the scene using a file path.
// Scales the image to fill the 1920×1080 viewport and pins it at depth -1000.
window.UIFactory.addBackground = function (scene, path) {
  if (!path) return null;

  const key = `bg_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
  if (!scene.textures.exists(key)) {
    window.logDebug?.(`[UIFactory.addBackground] Missing texture: ${key}`);
    return null;
  }

  const img = scene.add.image(960, 540, key).setOrigin(0.5, 0.5);

  const src   = scene.textures.get(key)?.getSourceImage?.();
  const texW  = src?.width  || 1;
  const texH  = src?.height || 1;
  const scale = Math.max(1920 / texW, 1080 / texH);

  img.setScale(scale);
  img.setDepth(-1000);
  img.setScrollFactor(0);
  return img;
};
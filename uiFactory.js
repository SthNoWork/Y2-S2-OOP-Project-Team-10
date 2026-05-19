// uiFactory.js
// Shared UI construction helpers used by all scenes.
// Owns button creation, the back button, HP text, and background images.
// Does not own game logic, scene transitions, or game state.

window.UIFactory = {};

// Centralised style ratios for all UI elements.
// Values are fractions of the viewport so they scale across resolutions.
window.UIFactory.config = {
  button: {
    fontSizeRatio:   0.04,
    fill:            '#ffffff',
    backgroundColor: '#333333',
    paddingXRatio:   0.02,
    paddingYRatio:   0.015,
  },
  backButton: {
    fontSizeRatio: 0.04,
    color:         '#000000',
  },
  healthText: {
    fontSizeRatio: 0.03,
    fill:          '#ffffff',
  },
};

// Creates a styled text button at (x, y) that fires onClick on tap or click.
// Origin is top-right so buttons anchor naturally from the right edge of the arena.
window.UIFactory.createButton = function (scene, x, y, label, onClick) {
  const cfg      = window.UIFactory.config.button;
  const fontSize = window.Scale.screenScaleH(scene, window.Scale.baseH * cfg.fontSizeRatio);
  const padX     = window.Scale.screenScaleW(scene, window.Scale.baseW * cfg.paddingXRatio);
  const padY     = window.Scale.screenScaleH(scene, window.Scale.baseH * cfg.paddingYRatio);

  return scene.add
    .text(x, y, label, {
      fontSize:        `${fontSize}px`,
      fill:            cfg.fill,
      backgroundColor: cfg.backgroundColor,
      padding:         { x: padX, y: padY },
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(1000)
    .on('pointerdown', onClick);
};

// Adds a Back button at the top-left corner of the scene.
// onClick should be a scene-transition callback (no arguments expected).
window.UIFactory.addBackButton = function (scene, onClick) {
  const cfg      = window.UIFactory.config.backButton;
  const fontSize = window.Scale.screenScaleH(scene, window.Scale.baseH * cfg.fontSizeRatio);
  const x        = window.Scale.screenScaleW(scene, window.Scale.baseW * 0.02);
  const y        = window.Scale.screenScaleH(scene, window.Scale.baseH * 0.02);

  return scene.add
    .text(x, y, 'Back', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   `${fontSize}px`,
      color:      cfg.color,
    })
    .setInteractive()
    .setOrigin(0, 0)
    .setDepth(1000)
    .on('pointerdown', onClick);
};

// Creates an HP text label anchored to the top-left corner of the arena.
// Returns the text object so the caller can call setText() each frame.
window.UIFactory.addHealthText = function (scene, arena) {
  const cfg      = window.UIFactory.config.healthText;
  const fontSize = window.Scale.screenScaleH(scene, window.Scale.baseH * cfg.fontSizeRatio);
  const offX     = window.Scale.screenScaleW(scene, window.Scale.baseW * 0.01);
  const offY     = window.Scale.screenScaleH(scene, window.Scale.baseH * 0.01);

  return scene.add.text(
    arena.ARENA_X + offX,
    arena.ARENA_Y + offY,
    '',
    { fontSize: `${fontSize}px`, fill: cfg.fill }
  );
};

// Adds a full-cover background image to the scene using a file path.
// Derives the texture key from the path, scales the image to fill the viewport,
// and pins it behind everything else at depth -1000.
window.UIFactory.addBackground = function (scene, path) {
  if (!path) return null;

  const key = `bg_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
  if (!scene.textures.exists(key)) {
    window.logDebug?.(`[UIFactory.addBackground] Missing texture: ${key}`);
    return null;
  }

  const W   = scene.scale.width;
  const H   = scene.scale.height;
  const img = scene.add.image(W * 0.5, H * 0.5, key).setOrigin(0.5, 0.5);

  const src  = scene.textures.get(key)?.getSourceImage?.();
  const texW = src?.width  || 1;
  const texH = src?.height || 1;
  const scale = Math.max(W / texW, H / texH);

  img.setScale(scale);
  img.setDepth(-1000);
  img.setScrollFactor(0);
  return img;
};
// ========================================
// UI FACTORY
// ========================================
// Creates and binds all UI elements to a given scene.
// Owns: button styling config, createButton(), addBackButton(), addHealthText().
// Does NOT own: game logic, scene transitions, state.

window.UIFactory = {};

// ========================================
// CONFIG
// ========================================

// Styling ratios for all text-based buttons.
window.UIFactory.config = {
  button: {
    fontSizeRatio:  0.04,   // fraction of viewport height
    fill:           '#ffffff',
    backgroundColor:'#333333',
    paddingXRatio:  0.02,   // fraction of viewport width
    paddingYRatio:  0.015,  // fraction of viewport height
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

// ========================================
// BUTTONS
// ========================================

// Create a styled interactive button at (x, y) and fire onClick on tap/click.
// Origin is top-right so buttons anchor from the right edge of the arena.
window.UIFactory.createButton = function (scene, x, y, label, onClick) {
  const cfg      = window.UIFactory.config.button;
  const fontSize = Math.round(scene.scale.height * cfg.fontSizeRatio);
  const padX     = Math.round(scene.scale.width  * cfg.paddingXRatio);
  const padY     = Math.round(scene.scale.height * cfg.paddingYRatio);

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

// Create a Back button anchored to the top-left of the scene.
// onClick receives no arguments — pass a scene-transition callback.
window.UIFactory.addBackButton = function (scene, onClick) {
  const cfg      = window.UIFactory.config.backButton;
  const fontSize = Math.round(scene.scale.height * cfg.fontSizeRatio);
  const x        = Math.round(scene.scale.width  * 0.02);
  const y        = Math.round(scene.scale.height * 0.02);

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

// ========================================
// HUD
// ========================================

// Create a health text label anchored to the top-left of the arena.
// Returns the text object so the caller can update it each frame.
window.UIFactory.addHealthText = function (scene, arena) {
  const cfg      = window.UIFactory.config.healthText;
  const fontSize = Math.round(scene.scale.height * cfg.fontSizeRatio);

  return scene.add.text(
    arena.ARENA_X + arena.ARENA_W * 0.01,
    arena.ARENA_Y + arena.ARENA_H * 0.01,
    '',
    {
      fontSize: `${fontSize}px`,
      fill:     cfg.fill,
    }
  );
};

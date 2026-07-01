// factories/uiFactory.js
// Generic reusable UI controls (buttons, back button).
// HUD-specific elements (health text, backgrounds) live in hudFactory.js.

window.UIFactory = {};


// ── Controls ──────────────────────────────────────────────────────────────────

// Creates a right-aligned action button (e.g. Start, Reset).
window.UIFactory.createButton = function (scene, x, y, label, onClick) {
  const btn = scene.add
    .text(x, y, label, {
      fontSize: '43px',
      fill: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 38, y: 16 },
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(1000)
    .on('pointerdown', onClick);

  const bounds = btn.getBounds();
  const border = scene.add.graphics().setDepth(btn.depth - 1);
  border.lineStyle(2, 0xffffff, 0.9);
  border.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

  return btn;
};

// Adds a "Back" button in the top-left corner of the current scene (managed via HTML overlay now).
window.UIFactory.addBackButton = function (scene, onClick) {
  // Return a dummy hidden text object to maintain backward compatibility with existing scenes
  return scene.add.text(0, 0, '', {}).setVisible(false);
};


// ── HUDFactory delegates (backwards compatibility) ────────────────────────────

window.UIFactory.addHealthText = function (scene, arena) {
  return window.HUDFactory.addHealthText(scene, arena);
};

window.UIFactory.addBackground = function (scene, path) {
  return window.HUDFactory.addBackground(scene, path);
};

// Creates a card-like button (background rectangle + text label) with click handling on both.
window.UIFactory.createCardButton = function (scene, opts) {
  const {
    x,
    y,
    width,
    height,
    label,
    fontSize = '22px',
    fillColor = '#ffffff',
    backgroundColor = 0x0a1825,
    backgroundAlpha = 0.95,
    strokeColor,
    strokeWidth = 3,
    strokeAlpha = 0.8,
    depth = 2100,
    onClick
  } = opts;

  const bg = scene.add.rectangle(x, y, width, height, backgroundColor, backgroundAlpha)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });

  if (strokeColor !== undefined) {
    bg.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
  }

  const txt = scene.add.text(x, y, label, {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: fontSize,
    fill: fillColor
  })
    .setOrigin(0.5)
    .setDepth(depth + 1)
    .setInteractive({ useHandCursor: true });

  if (onClick) {
    bg.on('pointerdown', onClick);
    txt.on('pointerdown', onClick);
  }

  return { background: bg, text: txt };
};

// Creates a plain text button with a background color.
window.UIFactory.createLabelButton = function (scene, opts) {
  const {
    x,
    y,
    label,
    fontSize = '32px',
    fillColor = '#ffffff',
    backgroundColor = '#555555',
    padding = { x: 30, y: 15 },
    depth = 2100,
    onClick
  } = opts;

  return scene.add.text(x, y, label, {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: fontSize,
    fill: fillColor,
    backgroundColor: backgroundColor,
    padding: padding
  })
    .setOrigin(0.5)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', onClick);
};
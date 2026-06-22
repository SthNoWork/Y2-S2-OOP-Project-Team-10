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
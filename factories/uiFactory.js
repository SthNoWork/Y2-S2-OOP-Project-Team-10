// factories/uiFactory.js
// Generic reusable UI controls (buttons, back button).
// HUD-specific elements (health text, backgrounds) live in hudFactory.js.

window.UIFactory = {};

// Creates a right-aligned action button (e.g. Start, Reset).
window.UIFactory.createButton = function (scene, x, y, label, onClick) {
  const btn = scene.add
    .text(x, y, label, {
      fontSize:        '43px',
      fill:            '#ffffff',
      backgroundColor: '#000000',
      padding:         { x: 38, y: 16 },
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

// Adds a "Back" link in the top-left corner of the current scene.
window.UIFactory.addBackButton = function (scene, onClick) {
  return scene.add
    .text(38, 22, 'Back', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '43px',
      color:      '#ffffff',
    })
    .setInteractive()
    .setOrigin(0, 0)
    .setDepth(1000)
    .on('pointerdown', onClick);
};

// Keep addHealthText and addBackground accessible via UIFactory for backwards
// compatibility — they now delegate to HUDFactory.
window.UIFactory.addHealthText = function (scene, arena) {
  return window.HUDFactory.addHealthText(scene, arena);
};

window.UIFactory.addBackground = function (scene, path) {
  return window.HUDFactory.addBackground(scene, path);
};
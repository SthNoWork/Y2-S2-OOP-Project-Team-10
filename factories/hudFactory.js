// factories/hudFactory.js
// Handles in-game HUD elements and scene backgrounds.
// Split from uiFactory to keep HUD concerns separate from generic button helpers.

window.HUDFactory = {};

// Creates the HP display text anchored to the top-left of the arena.
window.HUDFactory.addHealthText = function (scene, arena) {
  return scene.add.text(
    arena.ARENA_X + 19,
    arena.ARENA_Y + 11,
    '',
    { fontSize: '32px', fill: '#ffffff' }
  );
};

// Adds a background image scaled to cover the full 1920×1080 canvas.
// The key is derived from the asset path so it matches what BootScene loaded.
window.HUDFactory.addBackground = function (scene, path) {
  if (!path) return null;

  const key = `bg_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;

  if (!scene.textures.exists(key)) {
    window.logDebug?.(`[HUDFactory.addBackground] Missing texture: ${key}`);
    return null;
  }

  const img  = scene.add.image(960, 540, key).setOrigin(0.5, 0.5);
  const src  = scene.textures.get(key)?.getSourceImage?.();
  const texW = src?.width  || 1;
  const texH = src?.height || 1;

  // Scale up so the image fully covers the 1920×1080 canvas without letterboxing.
  img.setScale(Math.max(1920 / texW, 1080 / texH));
  img.setDepth(-1000);
  img.setScrollFactor(0);

  return img;
};
// ========================================
// SPRITE DEFINITIONS
// ========================================
// One record per named animation.
//
// HOW TO FIND x, y, w, h:
//   Open the PNG in Photopea.com
//   Hover over first frame → bottom bar shows x, y
//   Drag across one frame  → shows w, h
//
// sheet     → key from SHEETS below
// frames    → array of { x, y, w, h } pixel rects
// frameRate → fps
// repeat    → -1 loops forever, 0 plays once

window.SpriteDefinitions = {

  // ========================================
  // SHEETS
  // Phaser texture key → file path
  // ========================================
  SHEETS: {
    items: 'assets/metal_slug_items.png',
  },

  // ========================================
  // ANIMATIONS
  // ========================================
  ANIMATIONS: {

    // ---- BOMB ----
    // TODO: measure exact coords in Photopea
    'bomb_crate': {
      sheet:     'items',
      frames: [
        { x: 0,   y: 0, w: 30, h: 36 },
        { x: 30,  y: 0, w: 30, h: 36 },
        { x: 60,  y: 0, w: 30, h: 36 },
        { x: 90,  y: 0, w: 30, h: 36 },
        { x: 120, y: 0, w: 30, h: 36 },
      ],
      frameRate: 12,
      repeat:    -1,
    },

    // ---- PLANE ----
    // Single frame — acts as a static image
      // (Removed other animations for minimal testing — only `bomb_idle` is needed)

    // ---- TEMPLATE — copy and fill in for new sprites ----
    // 'my_sprite': {
    //   sheet:     'items',
    //   frames: [
    //     { x: 0, y: 0, w: 32, h: 32 },
    //   ],
    //   frameRate: 12,
    //   repeat:    -1,
    // },

  },
};
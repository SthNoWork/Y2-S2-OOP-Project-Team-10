window.Levels = {

  // ── Level 1 ── Tutorial ───────────────────────────────────────────────────
  1: {
    playerSpawn:      { x: 960, y: 810 },
    waveDelayMs:      6000,
    platforms: [
      { x: 960,  y: 936, w: 1382, h: 29 },
      { x: 407,  y: 713, w: 346,  h: 24 },
      { x: 1513, y: 713, w: 346,  h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 614,  y: 897 },
      { type: 'bomb_crate', x: 1306, y: 897 },
    ],
    allowedBuildings: { shortPlank: 4, whitePlank: 3, leaf: 4, trampoline: 2 },
    waves: [
      { speed: 314, direction:  1, x: -163, y: 120 },  // flies high, safe
    ],
  },

  // ── Level 2 ──────────────────────────────────────────────────────────────
  2: {
    playerSpawn:      { x: 960, y: 810 },
    waveDelayMs:      5000,
    platforms:        [],
    prePlaced:        [],
    allowedBuildings: { shortPlank: 3, thickPlank: 2, dirt: 3, grass: 3, trampoline: 2 },
    waves: [
      { speed: 360, direction:  1, x: -163, y: 120 },
      { speed: 378, direction: -1, x: 2083, y: 120 },  // removed 3rd wave
    ],
  },

  // ── Level 3 ──────────────────────────────────────────────────────────────
  3: {
    playerSpawn:      { x: 960, y: 810 },
    waveDelayMs:      5000,
    platforms:        [],
    prePlaced:        [],
    allowedBuildings: { thickPlank: 3, plank: 3, sand: 3, gravel: 2, trampoline: 2 },
    waves: [
      { speed: 404, direction:  1, x: -163, y: 120 },
      { speed: 423, direction: -1, x: 2083, y: 120 },  // cut from 3 → 2
    ],
  },

  // ── Level 4 ──────────────────────────────────────────────────────────────
  4: {
    playerSpawn:  { x: 960, y: 781 },
    waveDelayMs:  4500,
    platforms: [
      { x: 960,  y: 956, w: 1555, h: 24 },
      { x: 442,  y: 781, w: 380,  h: 24 },
      { x: 960,  y: 645, w: 380,  h: 24 },
      { x: 1478, y: 509, w: 380,  h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 442,  y: 742 },
      { type: 'bomb_crate', x: 960,  y: 606 },
      { type: 'bomb_crate', x: 1478, y: 470 },
    ],
    allowedBuildings: { thickPlank: 2, wall: 2, stone: 3, sandstone: 2, trampoline: 2 },
    waves: [
      { speed: 432, direction:  1, x: -163, y: 120 },
      { speed: 449, direction: -1, x: 2083, y: 120 },
      { speed: 468, direction:  1, x: -163, y: 120 },  // cut from 4 → 3, keep y safe
    ],
  },

  // ── Level 5 ──────────────────────────────────────────────────────────────
  5: {
    playerSpawn:  { x: 960, y: 810 },
    waveDelayMs:  4500,
    platforms: [
      { x: 960, y: 956, w: 1555, h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 442,  y: 918 },
      { type: 'bomb_crate', x: 960,  y: 918 },
      { type: 'bomb_crate', x: 1444, y: 918 },
    ],
    allowedBuildings: { snow: 4, ice: 3, thickIce: 2, stone: 2, trampoline: 2 },
    waves: [
      { speed: 468, direction:  1, x: -163, y: 120 },
      { speed: 486, direction: -1, x: 2083, y: 120 },
      { speed: 505, direction:  1, x: -163, y: 120 },  // cut from 4 → 3
    ],
  },

  // ── Level 6 ── TNT level, planes fly HIGH so they don't hit player ────────
  6: {
    playerSpawn:  { x: 960, y: 742 },
    waveDelayMs:  4500,                                 // more breathing room
    platforms: [
      { x: 960,  y: 781, w: 605, h: 24 },
      { x: 303,  y: 956, w: 500, h: 24 },
      { x: 1617, y: 956, w: 500, h: 24 },
      { x: 960,  y: 586, w: 380, h: 24 },              // upper refuge
      { x: 407,  y: 878, w: 260, h: 24 },              // left mid-step
      { x: 1513, y: 878, w: 260, h: 24 },              // right mid-step
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 753,  y: 742 },
      { type: 'bomb_crate', x: 1167, y: 742 },
      { type: 'bomb_crate', x: 303,  y: 918 },
      { type: 'bomb_crate', x: 1617, y: 918 },
    ],
    allowedBuildings: { wall: 3, stone: 3, sandstone: 2, tnt: 2 },
    waves: [
      { speed: 494, direction:  1, x: -163, y: 120 },  // all y:120 = flies above player
      { speed: 513, direction: -1, x: 2083, y: 120 },
      { speed: 531, direction:  1, x: -163, y: 120 },  // cut from 5 → 3
    ],
  },

  // ── Level 7 ──────────────────────────────────────────────────────────────
  7: {
    playerSpawn:  { x: 960, y: 878 },
    waveDelayMs:  4000,
    platforms: [
      { x: 355,  y: 567, w: 311, h: 24 },
      { x: 355,  y: 761, w: 311, h: 24 },
      { x: 1565, y: 567, w: 311, h: 24 },
      { x: 1565, y: 761, w: 311, h: 24 },
      { x: 960,  y: 956, w: 691, h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 355,  y: 528 },
      { type: 'bomb_crate', x: 1565, y: 528 },
      { type: 'bomb_crate', x: 701,  y: 918 },
      { type: 'bomb_crate', x: 1219, y: 918 },
    ],
    allowedBuildings: { stone: 3, coal: 3, iron: 2, tnt: 2 },
    waves: [
      { speed: 522, direction:  1, x: -163, y: 120 },
      { speed: 541, direction: -1, x: 2083, y: 120 },
      { speed: 558, direction:  1, x: -163, y: 120 },  // cut from 5 → 3, all high
    ],
  },

  // ── Level 8 ──────────────────────────────────────────────────────────────
  8: {
    playerSpawn:  { x: 960, y: 761 },
    waveDelayMs:  3500,
    platforms: [
      { x: 960,  y: 956, w: 1469, h: 24 },
      { x: 528,  y: 742, w: 346,  h: 24 },
      { x: 1392, y: 742, w: 346,  h: 24 },
      { x: 960,  y: 548, w: 346,  h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 355,  y: 918 },
      { type: 'bomb_crate', x: 701,  y: 918 },
      { type: 'bomb_crate', x: 1219, y: 918 },
      { type: 'bomb_crate', x: 1565, y: 918 },
      { type: 'bomb_crate', x: 960,  y: 509 },
    ],
    allowedBuildings: { iron: 3, gold: 2, diamond: 2, tnt: 2 },
    waves: [
      { speed: 541, direction:  1, x: -163, y: 120 },
      { speed: 558, direction: -1, x: 2083, y: 120 },
      { speed: 576, direction:  1, x: -163, y: 120 },
      { speed: 595, direction: -1, x: 2083, y: 120 },  // cut from 6 → 4
    ],
  },

  // ── Level 9 ──────────────────────────────────────────────────────────────
  9: {
    playerSpawn:  { x: 960, y: 664 },
    waveDelayMs:  3500,
    platforms: [
      { x: 960,  y: 713, w: 518, h: 24 },
      { x: 407,  y: 586, w: 277, h: 24 },
      { x: 1513, y: 586, w: 277, h: 24 },
      { x: 960,  y: 450, w: 277, h: 24 },
      { x: 407,  y: 878, w: 380, h: 24 },
      { x: 1513, y: 878, w: 380, h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 407,  y: 548 },
      { type: 'bomb_crate', x: 1513, y: 548 },
      { type: 'bomb_crate', x: 960,  y: 412 },
      { type: 'bomb_crate', x: 701,  y: 674 },
      { type: 'bomb_crate', x: 1219, y: 674 },
      { type: 'bomb_crate', x: 407,  y: 839 },
      { type: 'bomb_crate', x: 1513, y: 839 },
    ],
    allowedBuildings: { diamond: 2, obsidian: 2, iron: 2, tnt: 2 },
    waves: [
      { speed: 558, direction:  1, x: -163, y: 120 },
      { speed: 576, direction: -1, x: 2083, y: 120 },
      { speed: 595, direction:  1, x: -163, y: 120 },
      { speed: 612, direction: -1, x: 2083, y: 120 },  // cut from 7 → 4
    ],
  },

  // ── Level 10 ── Final boss ────────────────────────────────────────────────
  10: {
    playerSpawn:  { x: 960, y: 616 },
    waveDelayMs:  3000,
    platforms: [
      { x: 960,  y: 664, w: 415, h: 24 },
      { x: 442,  y: 528, w: 311, h: 24 },
      { x: 1478, y: 528, w: 311, h: 24 },
      { x: 960,  y: 392, w: 242, h: 24 },
      { x: 303,  y: 801, w: 242, h: 24 },
      { x: 1617, y: 801, w: 242, h: 24 },
      { x: 701,  y: 918, w: 207, h: 24 },
      { x: 1219, y: 918, w: 207, h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 442,  y: 489 },
      { type: 'bomb_crate', x: 1478, y: 489 },
      { type: 'bomb_crate', x: 960,  y: 353 },
      { type: 'bomb_crate', x: 753,  y: 625 },
      { type: 'bomb_crate', x: 1167, y: 625 },
      { type: 'bomb_crate', x: 303,  y: 761 },
      { type: 'bomb_crate', x: 1617, y: 761 },
      { type: 'bomb_crate', x: 960,  y: 781 },
    ],
    allowedBuildings: { obsidian: 2, diamond: 2, tnt: 2, ice: 2 },
    waves: [
      { speed: 586, direction:  1, x: -163, y: 120 },
      { speed: 603, direction: -1, x: 2083, y: 120 },
      { speed: 621, direction:  1, x: -163, y: 120 },
      { speed: 640, direction: -1, x: 2083, y: 120 },
      { speed: 657, direction:  1, x: -163, y: 120 },  // cut from 8 → 5
    ],
  },
};
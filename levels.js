// levels.js
// Blueprint for every playable level.
// LevelManager reads this at load time to configure platforms, pre-placed objects,
// building allowances, and wave sequences.
//
// All positions and sizes are absolute pixels in the fixed 1920×1080 space.
// Arena reference: X=96  Y=81  W=1728  H=972
//
// Per-level schema:
//   playerSpawn      { x, y }
//   platforms        [{ x, y, w, h }]
//   prePlaced        [{ type, x, y }]   — locked, not player-draggable
//   allowedBuildings { type: maxCount } — overrides global maxCount per type
//   waveDelayMs      ms gap between consecutive wave spawns
//   waves            [{ speed, direction, x, y }]
//                      speed     = px per second
//                      direction = 1 (left→right) or -1 (right→left)

window.Levels = {

  // Level 1 — Tutorial
  // Single slow wave, two side platforms for elevated placement practice.
  // Two pre-placed bomb crates teach the player about chain explosions.
  1: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 6000,
    platforms: [
      { x: 960,  y: 936, w: 1382, h: 29 },
      { x: 407,  y: 713, w: 346,  h: 24 },
      { x: 1513, y: 713, w: 346,  h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 614,  y: 897 },
      { type: 'bomb_crate', x: 1306, y: 897 },
    ],
    allowedBuildings: { shortPlank: 3, thickPlank: 2, wall: 2 },
    waves: [
      { speed: 314, direction:  1, x: -163, y: 120 },
    ],
  },

  // Level 2 — Double pass
  // Two waves from opposite directions on an open field.
  2: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 5000,
    platforms: [],
    prePlaced:  [],
    allowedBuildings: { shortPlank: 4, thickPlank: 2, wall: 2 },
    waves: [
      { speed: 360, direction:  1, x: -163, y: 120 },
      { speed: 378, direction: -1, x: 2083, y: 120 },
    ],
  },

  // Level 3 — Triple threat
  // Three waves with escalating speed.
  3: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 5000,
    platforms: [],
    prePlaced:  [],
    allowedBuildings: { shortPlank: 5, thickPlank: 3, wall: 3 },
    waves: [
      { speed: 404, direction:  1, x: -163, y: 120 },
      { speed: 423, direction: -1, x: 2083, y: 120 },
      { speed: 449, direction:  1, x: -163, y: 120 },
    ],
  },

  // Level 4 — Staircase platforms
  4: {
    playerSpawn: { x: 960, y: 781 },
    waveDelayMs: 4500,
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
    allowedBuildings: { shortPlank: 4, thickPlank: 3, wall: 3 },
    waves: [
      { speed: 432, direction:  1, x: -163, y: 120 },
      { speed: 449, direction: -1, x: 2083, y: 120 },
      { speed: 468, direction:  1, x: -163, y: 198 },
      { speed: 486, direction: -1, x: 2083, y: 120 },
    ],
  },

  // Level 5 — Gauntlet
  5: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4500,
    platforms: [
      { x: 960, y: 956, w: 1555, h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 442,  y: 918 },
      { type: 'bomb_crate', x: 960,  y: 918 },
      { type: 'bomb_crate', x: 1444, y: 918 },
    ],
    allowedBuildings: { shortPlank: 5, thickPlank: 3, wall: 3 },
    waves: [
      { speed: 468, direction:  1, x: -163, y: 120 },
      { speed: 486, direction: -1, x: 2083, y: 120 },
      { speed: 505, direction:  1, x: -163, y: 120 },
      { speed: 522, direction: -1, x: 2083, y: 120 },
    ],
  },

  // Level 6 — The Bridge
  6: {
    playerSpawn: { x: 960, y: 742 },
    waveDelayMs: 4000,
    platforms: [
      { x: 960,  y: 781, w: 605, h: 24 },
      { x: 303,  y: 956, w: 311, h: 24 },
      { x: 1617, y: 956, w: 311, h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 753,  y: 742 },
      { type: 'bomb_crate', x: 1167, y: 742 },
      { type: 'bomb_crate', x: 303,  y: 918 },
      { type: 'bomb_crate', x: 1617, y: 918 },
    ],
    allowedBuildings: { shortPlank: 4, thickPlank: 4, wall: 4 },
    waves: [
      { speed: 494, direction:  1, x: -163, y: 120 },
      { speed: 513, direction: -1, x: 2083, y: 120 },
      { speed: 531, direction:  1, x: -163, y: 256 },
      { speed: 549, direction: -1, x: 2083, y: 256 },
      { speed: 567, direction:  1, x: -163, y: 120 },
    ],
  },

  // Level 7 — Tower Defense
  7: {
    playerSpawn: { x: 960, y: 878 },
    waveDelayMs: 4000,
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
    allowedBuildings: { shortPlank: 5, thickPlank: 4, wall: 4 },
    waves: [
      { speed: 522, direction:  1, x: -163, y: 120 },
      { speed: 541, direction: -1, x: 2083, y: 120 },
      { speed: 558, direction:  1, x: -163, y: 275 },
      { speed: 576, direction: -1, x: 2083, y: 120 },
      { speed: 595, direction:  1, x: -163, y: 275 },
    ],
  },

  // Level 8 — Crossfire
  8: {
    playerSpawn: { x: 960, y: 761 },
    waveDelayMs: 3500,
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
    allowedBuildings: { shortPlank: 5, thickPlank: 4, wall: 5 },
    waves: [
      { speed: 541, direction:  1, x: -163, y: 120 },
      { speed: 558, direction: -1, x: 2083, y: 295 },
      { speed: 576, direction:  1, x: -163, y: 120 },
      { speed: 595, direction: -1, x: 2083, y: 295 },
      { speed: 612, direction:  1, x: -163, y: 120 },
      { speed: 631, direction: -1, x: 2083, y: 120 },
    ],
  },

  // Level 9 — Siege
  9: {
    playerSpawn: { x: 960, y: 664 },
    waveDelayMs: 3500,
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
    allowedBuildings: { shortPlank: 5, thickPlank: 5, wall: 5 },
    waves: [
      { speed: 558, direction:  1, x: -163, y: 120 },
      { speed: 576, direction: -1, x: 2083, y: 120 },
      { speed: 595, direction:  1, x: -163, y: 275 },
      { speed: 612, direction: -1, x: 2083, y: 120 },
      { speed: 811, direction:  1, x: -163, y: 120 },
      { speed: 631, direction: -1, x: 2083, y: 275 },
      { speed: 648, direction:  1, x: -163, y: 120 },
    ],
  },

  // Level 10 — Apocalypse
  10: {
    playerSpawn: { x: 960, y: 616 },
    waveDelayMs: 3000,
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
    allowedBuildings: { shortPlank: 5, thickPlank: 5, wall: 5 },
    waves: [
      { speed: 586, direction:  1, x: -163, y: 120 },
      { speed: 603, direction: -1, x: 2083, y: 120 },
      { speed: 621, direction:  1, x: -163, y: 295 },
      { speed: 640, direction: -1, x: 2083, y: 120 },
      { speed: 657, direction:  1, x: -163, y: 295 },
      { speed: 856, direction: -1, x: 2083, y: 120 },
      { speed: 676, direction:  1, x: -163, y: 120 },
      { speed: 882, direction: -1, x: 2083, y: 120 },
    ],
  },
};
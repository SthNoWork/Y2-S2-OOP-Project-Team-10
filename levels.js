// ========================================
// LEVELS
// ========================================
// Each level is a self-contained blueprint.
// LevelManager reads this to set up the scene.
//
// Coordinates are fractions of arena dimensions (0–1) unless noted.
// LevelManager converts them to pixels at load time using the live arena.
//
// Schema per level:
//   playerSpawn      { xRatio, yRatio }
//   platforms        [{ xRatio, yRatio, wRatio, hRatio }]
//   prePlaced        [{ type, xRatio, yRatio }]   — locked, not draggable
//   allowedBuildings { type: maxCount, … }         — overrides global maxCount
//   waveDelayMs      number (ms between wave spawns, e.g. 3000 = 3 s)
//   waves            [{ speedRatio, direction, xRatio, yRatio }]
//                    speedRatio is a fraction of ARENA_W per second (e.g. 0.3 = 30% arena width/sec).
//                    direction: 1 = left→right, -1 = right→left
//   scoring          (global via window.ScoreConfig)

// Global scoring config (applies to all levels)
window.ScoreConfig = {
  playerHpWeight:    500,
  buildingWeight:    80,
  placementPenalty:  10,
  runMultiplierStep: 0.5,
};

window.Levels = {

  // ----------------------------------------
  // LEVEL 1 — Tutorial
  // Single slow wave, raised side platforms, 2 bomb crates.
  // Player learns to place buildings and survive one pass.
  // ----------------------------------------
  1: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.75 },
    music: 'asset/music/Shield the Sky.mp3',
    waveDelayMs: 6000,

    platforms: [
      { xRatio: 0.5,  yRatio: 0.88, wRatio: 0.8,  hRatio: 0.03  },
      { xRatio: 0.18, yRatio: 0.65, wRatio: 0.2,  hRatio: 0.025 },
      { xRatio: 0.82, yRatio: 0.65, wRatio: 0.2,  hRatio: 0.025 },
    ],

    prePlaced: [
      { type: 'bomb_crate', xRatio: 0.3, yRatio: 0.84 },
      { type: 'bomb_crate', xRatio: 0.7, yRatio: 0.84 },
    ],

    allowedBuildings: {
      shortPlank: 3,
      thickPlank: 2,
      wall:       2,
    },

    waves: [
      { speedRatio: 0.182, direction: 1, xRatio: -0.15, yRatio: 0.04 },
    ],
  },

  // ----------------------------------------
  // LEVEL 2 — Double pass
  // Two waves from opposite directions, no platforms, open field.
  // Player must protect both flanks.
  // ----------------------------------------
  2: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.75 },
    music: 'asset/music/Forest Drift (1).mp3',
    waveDelayMs: 5000,

    platforms:   [],
    prePlaced:   [],

    allowedBuildings: { shortPlank: 4, thickPlank: 2, wall: 2 },

    waves: [
      { speedRatio: 0.208, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.219, direction: -1, xRatio:  1.15, yRatio: 0.04 },
    ],
  },

  // ----------------------------------------
  // LEVEL 3 — Triple threat
  // Three waves, escalating speed.
  // ----------------------------------------
  3: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.75 },
    music: 'asset/music/Forest Drift.mp3',
    waveDelayMs: 5000,

    platforms:   [],
    prePlaced:   [],

    allowedBuildings: { shortPlank: 5, thickPlank: 3, wall: 3 },

    waves: [
      { speedRatio: 0.234, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.245, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.260, direction:  1, xRatio: -0.15, yRatio: 0.04 },
    ],
  },

  // ----------------------------------------
  // LEVEL 4 — Staircase platforms
  // Platforms step down left-to-right, forcing the player to think
  // vertically. Four waves with a mid-level low pass.
  // ----------------------------------------
  4: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.72 },
    music: 'asset/music/Shield the Sky.mp3',
    waveDelayMs: 4500,

    platforms: [
      { xRatio: 0.5,  yRatio: 0.90, wRatio: 0.9,  hRatio: 0.025 }, // ground
      { xRatio: 0.2,  yRatio: 0.72, wRatio: 0.22, hRatio: 0.025 }, // left step
      { xRatio: 0.5,  yRatio: 0.58, wRatio: 0.22, hRatio: 0.025 }, // mid step
      { xRatio: 0.8,  yRatio: 0.44, wRatio: 0.22, hRatio: 0.025 }, // right step (high)
    ],

    prePlaced: [
      { type: 'bomb_crate', xRatio: 0.2,  yRatio: 0.68 },
      { type: 'bomb_crate', xRatio: 0.5,  yRatio: 0.54 },
      { type: 'bomb_crate', xRatio: 0.8,  yRatio: 0.40 },
    ],

    allowedBuildings: { shortPlank: 4, thickPlank: 3, wall: 3 },

    waves: [
      { speedRatio: 0.250, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.260, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.271, direction:  1, xRatio: -0.15, yRatio: 0.12 }, // lower pass
      { speedRatio: 0.281, direction: -1, xRatio:  1.15, yRatio: 0.04 },
    ],
  },

  // ----------------------------------------
  // LEVEL 5 — Gauntlet
  // No platforms, four fast waves alternating direction.
  // Three bomb crates scattered across the floor.
  // ----------------------------------------
  5: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.75 },
    music: 'asset/music/Forest Drift (1).mp3',
    waveDelayMs: 4500,

    platforms: [
      { xRatio: 0.5, yRatio: 0.90, wRatio: 0.9, hRatio: 0.025 }, // ground
    ],

    prePlaced: [
      { type: 'bomb_crate', xRatio: 0.2,  yRatio: 0.86 },
      { type: 'bomb_crate', xRatio: 0.5,  yRatio: 0.86 },
      { type: 'bomb_crate', xRatio: 0.78, yRatio: 0.86 },
    ],

    allowedBuildings: { shortPlank: 5, thickPlank: 3, wall: 3 },

    waves: [
      { speedRatio: 0.271, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.281, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.292, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.302, direction: -1, xRatio:  1.15, yRatio: 0.04 },
    ],
  },

  // ----------------------------------------
  // LEVEL 6 — The Bridge
  // A narrow central bridge platform, drops to either side.
  // Two low-altitude passes try to clip the bridge directly.
  // ----------------------------------------
  6: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.68 },
    music: 'asset/music/Forest Drift.mp3',
    waveDelayMs: 4000,

    platforms: [
      { xRatio: 0.5,  yRatio: 0.72, wRatio: 0.35, hRatio: 0.025 }, // central bridge
      { xRatio: 0.12, yRatio: 0.90, wRatio: 0.18, hRatio: 0.025 }, // left pit floor
      { xRatio: 0.88, yRatio: 0.90, wRatio: 0.18, hRatio: 0.025 }, // right pit floor
    ],

    prePlaced: [
      { type: 'bomb_crate', xRatio: 0.38, yRatio: 0.68 },
      { type: 'bomb_crate', xRatio: 0.62, yRatio: 0.68 },
      { type: 'bomb_crate', xRatio: 0.12, yRatio: 0.86 },
      { type: 'bomb_crate', xRatio: 0.88, yRatio: 0.86 },
    ],

    allowedBuildings: { shortPlank: 4, thickPlank: 4, wall: 4 },

    waves: [
      { speedRatio: 0.286, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.297, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.307, direction:  1, xRatio: -0.15, yRatio: 0.18 }, // low pass
      { speedRatio: 0.318, direction: -1, xRatio:  1.15, yRatio: 0.18 }, // low pass
      { speedRatio: 0.328, direction:  1, xRatio: -0.15, yRatio: 0.04 },
    ],
  },

  // ----------------------------------------
  // LEVEL 7 — Tower Defense
  // Two tall side platforms, a sunken center trench.
  // Player must defend from above and below simultaneously.
  // ----------------------------------------
  7: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.82 },
    music: 'asset/music/Shield the Sky.mp3',
    waveDelayMs: 4000,

    platforms: [
      { xRatio: 0.15, yRatio: 0.50, wRatio: 0.18, hRatio: 0.025 }, // left tower top
      { xRatio: 0.15, yRatio: 0.70, wRatio: 0.18, hRatio: 0.025 }, // left tower mid
      { xRatio: 0.85, yRatio: 0.50, wRatio: 0.18, hRatio: 0.025 }, // right tower top
      { xRatio: 0.85, yRatio: 0.70, wRatio: 0.18, hRatio: 0.025 }, // right tower mid
      { xRatio: 0.5,  yRatio: 0.90, wRatio: 0.40, hRatio: 0.025 }, // center trench floor
    ],

    prePlaced: [
      { type: 'bomb_crate', xRatio: 0.15, yRatio: 0.46 },
      { type: 'bomb_crate', xRatio: 0.85, yRatio: 0.46 },
      { type: 'bomb_crate', xRatio: 0.35, yRatio: 0.86 },
      { type: 'bomb_crate', xRatio: 0.65, yRatio: 0.86 },
    ],

    allowedBuildings: { shortPlank: 5, thickPlank: 4, wall: 4 },

    waves: [
      { speedRatio: 0.302, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.313, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.323, direction:  1, xRatio: -0.15, yRatio: 0.20 },
      { speedRatio: 0.333, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.344, direction:  1, xRatio: -0.15, yRatio: 0.20 },
    ],
  },

  // ----------------------------------------
  // LEVEL 8 — Crossfire
  // Six waves, alternating altitude — high and low passes interleaved.
  // Symmetrical platform layout with dense bomb crate field.
  // ----------------------------------------
  8: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.70 },
    music: 'asset/music/Forest Drift (1).mp3',
    waveDelayMs: 3500,

    platforms: [
      { xRatio: 0.5,  yRatio: 0.90, wRatio: 0.85, hRatio: 0.025 }, // ground
      { xRatio: 0.25, yRatio: 0.68, wRatio: 0.20, hRatio: 0.025 }, // left mid
      { xRatio: 0.75, yRatio: 0.68, wRatio: 0.20, hRatio: 0.025 }, // right mid
      { xRatio: 0.5,  yRatio: 0.48, wRatio: 0.20, hRatio: 0.025 }, // center high
    ],

    prePlaced: [
      { type: 'bomb_crate', xRatio: 0.15, yRatio: 0.86 },
      { type: 'bomb_crate', xRatio: 0.35, yRatio: 0.86 },
      { type: 'bomb_crate', xRatio: 0.65, yRatio: 0.86 },
      { type: 'bomb_crate', xRatio: 0.85, yRatio: 0.86 },
      { type: 'bomb_crate', xRatio: 0.5,  yRatio: 0.44 },
    ],

    allowedBuildings: { shortPlank: 5, thickPlank: 4, wall: 5 },

    waves: [
      { speedRatio: 0.313, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.323, direction: -1, xRatio:  1.15, yRatio: 0.22 }, // low
      { speedRatio: 0.333, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.344, direction: -1, xRatio:  1.15, yRatio: 0.22 }, // low
      { speedRatio: 0.354, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.365, direction: -1, xRatio:  1.15, yRatio: 0.04 },
    ],
  },

  // ----------------------------------------
  // LEVEL 9 — Siege
  // Seven waves. Mixed altitudes, one very fast surprise wave.
  // Complex platform layout with no safe ground tile at edges.
  // ----------------------------------------
  9: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.60 },
    music: 'asset/music/Forest Drift.mp3',
    waveDelayMs: 3500,

    platforms: [
      { xRatio: 0.5,  yRatio: 0.65, wRatio: 0.30, hRatio: 0.025 }, // center main
      { xRatio: 0.18, yRatio: 0.52, wRatio: 0.16, hRatio: 0.025 }, // left high
      { xRatio: 0.82, yRatio: 0.52, wRatio: 0.16, hRatio: 0.025 }, // right high
      { xRatio: 0.5,  yRatio: 0.38, wRatio: 0.16, hRatio: 0.025 }, // top island
      { xRatio: 0.18, yRatio: 0.82, wRatio: 0.22, hRatio: 0.025 }, // left low shelf
      { xRatio: 0.82, yRatio: 0.82, wRatio: 0.22, hRatio: 0.025 }, // right low shelf
    ],

    prePlaced: [
      { type: 'bomb_crate', xRatio: 0.18, yRatio: 0.48 },
      { type: 'bomb_crate', xRatio: 0.82, yRatio: 0.48 },
      { type: 'bomb_crate', xRatio: 0.5,  yRatio: 0.34 },
      { type: 'bomb_crate', xRatio: 0.35, yRatio: 0.61 },
      { type: 'bomb_crate', xRatio: 0.65, yRatio: 0.61 },
      { type: 'bomb_crate', xRatio: 0.18, yRatio: 0.78 },
      { type: 'bomb_crate', xRatio: 0.82, yRatio: 0.78 },
    ],

    allowedBuildings: { shortPlank: 5, thickPlank: 5, wall: 5 },

    waves: [
      { speedRatio: 0.323, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.333, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.344, direction:  1, xRatio: -0.15, yRatio: 0.20 },
      { speedRatio: 0.354, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.469, direction:  1, xRatio: -0.15, yRatio: 0.04 }, // fast surprise
      { speedRatio: 0.365, direction: -1, xRatio:  1.15, yRatio: 0.20 },
      { speedRatio: 0.375, direction:  1, xRatio: -0.15, yRatio: 0.04 },
    ],
  },

  // ----------------------------------------
  // LEVEL 10 — Apocalypse
  // Eight waves. Maximum difficulty. Platforms form a fragmented
  // multi-tier maze. Eight bomb crates create chain-reaction risk.
  // Final wave is extremely fast from both ends simultaneously
  // (two wave entries close together, opposite directions).
  // ----------------------------------------
  10: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.55 },
    music: 'asset/music/Shield the Sky.mp3',
    waveDelayMs: 3000,

    platforms: [
      { xRatio: 0.5,  yRatio: 0.60, wRatio: 0.24, hRatio: 0.025 }, // center main
      { xRatio: 0.2,  yRatio: 0.46, wRatio: 0.18, hRatio: 0.025 }, // left upper
      { xRatio: 0.8,  yRatio: 0.46, wRatio: 0.18, hRatio: 0.025 }, // right upper
      { xRatio: 0.5,  yRatio: 0.32, wRatio: 0.14, hRatio: 0.025 }, // top island
      { xRatio: 0.12, yRatio: 0.74, wRatio: 0.14, hRatio: 0.025 }, // left lower
      { xRatio: 0.88, yRatio: 0.74, wRatio: 0.14, hRatio: 0.025 }, // right lower
      { xRatio: 0.35, yRatio: 0.86, wRatio: 0.12, hRatio: 0.025 }, // left floor shelf
      { xRatio: 0.65, yRatio: 0.86, wRatio: 0.12, hRatio: 0.025 }, // right floor shelf
    ],

    prePlaced: [
      { type: 'bomb_crate', xRatio: 0.2,  yRatio: 0.42 },
      { type: 'bomb_crate', xRatio: 0.8,  yRatio: 0.42 },
      { type: 'bomb_crate', xRatio: 0.5,  yRatio: 0.28 },
      { type: 'bomb_crate', xRatio: 0.38, yRatio: 0.56 },
      { type: 'bomb_crate', xRatio: 0.62, yRatio: 0.56 },
      { type: 'bomb_crate', xRatio: 0.12, yRatio: 0.70 },
      { type: 'bomb_crate', xRatio: 0.88, yRatio: 0.70 },
      { type: 'bomb_crate', xRatio: 0.5,  yRatio: 0.72 },
    ],

    allowedBuildings: { shortPlank: 5, thickPlank: 5, wall: 5 },

    waves: [
      { speedRatio: 0.339, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.349, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.359, direction:  1, xRatio: -0.15, yRatio: 0.22 },
      { speedRatio: 0.370, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedRatio: 0.380, direction:  1, xRatio: -0.15, yRatio: 0.22 },
      { speedRatio: 0.495, direction: -1, xRatio:  1.15, yRatio: 0.04 }, // fast pass
      { speedRatio: 0.391, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.510, direction: -1, xRatio:  1.15, yRatio: 0.04 }, // final blitz
    ],
  },

};
// levels.js
// Self-contained blueprint for every playable level.
// LevelManager reads this at load time to configure platforms, pre-placed objects,
// building allowances, and wave sequences.
//
// All position/size values are fractions of ARENA_W or ARENA_H (0–1).
// LevelManager converts them to pixels using the live arena dimensions.
//
// Per-level schema:
//   playerSpawn      { xRatio, yRatio }
//   music            path string
//   platforms        [{ xRatio, yRatio, wRatio, hRatio }]
//   prePlaced        [{ type, xRatio, yRatio }]  — locked, not player-draggable
//   allowedBuildings { type: maxCount }           — overrides global maxCount per type
//   waveDelayMs      ms gap between consecutive wave spawns
//   waves            [{ speedRatio, direction, xRatio, yRatio }]
//                      speedRatio = fraction of ARENA_W per second
//                      direction  = 1 (left→right) or -1 (right→left)

window.ScoreConfig = {
  playerHpWeight:    500,
  buildingWeight:    80,
  placementPenalty:  10,
  runMultiplierStep: 0.5,
};

window.Levels = {

  // Level 1 — Tutorial
  // Single slow wave, two side platforms for elevated placement practice.
  // Two pre-placed bomb crates teach the player about chain explosions.
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
    allowedBuildings: { shortPlank: 3, thickPlank: 2, wall: 2 },
    waves: [
      { speedRatio: 0.182, direction: 1, xRatio: -0.15, yRatio: 0.04 },
    ],
  },

  // Level 2 — Double pass
  // Two waves from opposite directions on an open field.
  // Player must protect both flanks simultaneously.
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

  // Level 3 — Triple threat
  // Three waves with escalating speed; no platforms or pre-placed objects.
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

  // Level 4 — Staircase platforms
  // Platforms descend left-to-right, forcing the player to think vertically.
  // A low-altitude mid-level pass clips the staircase itself.
  4: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.72 },
    music: 'asset/music/Shield the Sky.mp3',
    waveDelayMs: 4500,
    platforms: [
      { xRatio: 0.5,  yRatio: 0.90, wRatio: 0.9,  hRatio: 0.025 },
      { xRatio: 0.2,  yRatio: 0.72, wRatio: 0.22, hRatio: 0.025 },
      { xRatio: 0.5,  yRatio: 0.58, wRatio: 0.22, hRatio: 0.025 },
      { xRatio: 0.8,  yRatio: 0.44, wRatio: 0.22, hRatio: 0.025 },
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
      { speedRatio: 0.271, direction:  1, xRatio: -0.15, yRatio: 0.12 },
      { speedRatio: 0.281, direction: -1, xRatio:  1.15, yRatio: 0.04 },
    ],
  },

  // Level 5 — Gauntlet
  // No platforms; four fast alternating waves. Three bomb crates on the ground
  // create chain-reaction risk across the arena.
  5: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.75 },
    music: 'asset/music/Forest Drift (1).mp3',
    waveDelayMs: 4500,
    platforms: [
      { xRatio: 0.5, yRatio: 0.90, wRatio: 0.9, hRatio: 0.025 },
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

  // Level 6 — The Bridge
  // A narrow central bridge with pit floors on either side.
  // Two low-altitude passes target the bridge directly.
  6: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.68 },
    music: 'asset/music/Forest Drift.mp3',
    waveDelayMs: 4000,
    platforms: [
      { xRatio: 0.5,  yRatio: 0.72, wRatio: 0.35, hRatio: 0.025 },
      { xRatio: 0.12, yRatio: 0.90, wRatio: 0.18, hRatio: 0.025 },
      { xRatio: 0.88, yRatio: 0.90, wRatio: 0.18, hRatio: 0.025 },
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
      { speedRatio: 0.307, direction:  1, xRatio: -0.15, yRatio: 0.18 },
      { speedRatio: 0.318, direction: -1, xRatio:  1.15, yRatio: 0.18 },
      { speedRatio: 0.328, direction:  1, xRatio: -0.15, yRatio: 0.04 },
    ],
  },

  // Level 7 — Tower Defense
  // Two tall tower platforms flank a sunken centre trench.
  // Player must defend from high and low altitude passes simultaneously.
  7: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.82 },
    music: 'asset/music/Shield the Sky.mp3',
    waveDelayMs: 4000,
    platforms: [
      { xRatio: 0.15, yRatio: 0.50, wRatio: 0.18, hRatio: 0.025 },
      { xRatio: 0.15, yRatio: 0.70, wRatio: 0.18, hRatio: 0.025 },
      { xRatio: 0.85, yRatio: 0.50, wRatio: 0.18, hRatio: 0.025 },
      { xRatio: 0.85, yRatio: 0.70, wRatio: 0.18, hRatio: 0.025 },
      { xRatio: 0.5,  yRatio: 0.90, wRatio: 0.40, hRatio: 0.025 },
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

  // Level 8 — Crossfire
  // Six waves with alternating high and low passes.
  // Symmetrical platform layout; dense bomb crate field on the ground.
  8: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.70 },
    music: 'asset/music/Forest Drift (1).mp3',
    waveDelayMs: 3500,
    platforms: [
      { xRatio: 0.5,  yRatio: 0.90, wRatio: 0.85, hRatio: 0.025 },
      { xRatio: 0.25, yRatio: 0.68, wRatio: 0.20, hRatio: 0.025 },
      { xRatio: 0.75, yRatio: 0.68, wRatio: 0.20, hRatio: 0.025 },
      { xRatio: 0.5,  yRatio: 0.48, wRatio: 0.20, hRatio: 0.025 },
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
      { speedRatio: 0.323, direction: -1, xRatio:  1.15, yRatio: 0.22 },
      { speedRatio: 0.333, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.344, direction: -1, xRatio:  1.15, yRatio: 0.22 },
      { speedRatio: 0.354, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedRatio: 0.365, direction: -1, xRatio:  1.15, yRatio: 0.04 },
    ],
  },

  // Level 9 — Siege
  // Seven waves with mixed altitudes and one very fast surprise wave.
  // Multi-tier platform layout with no safe ground at the edges.
  9: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.60 },
    music: 'asset/music/Forest Drift.mp3',
    waveDelayMs: 3500,
    platforms: [
      { xRatio: 0.5,  yRatio: 0.65, wRatio: 0.30, hRatio: 0.025 },
      { xRatio: 0.18, yRatio: 0.52, wRatio: 0.16, hRatio: 0.025 },
      { xRatio: 0.82, yRatio: 0.52, wRatio: 0.16, hRatio: 0.025 },
      { xRatio: 0.5,  yRatio: 0.38, wRatio: 0.16, hRatio: 0.025 },
      { xRatio: 0.18, yRatio: 0.82, wRatio: 0.22, hRatio: 0.025 },
      { xRatio: 0.82, yRatio: 0.82, wRatio: 0.22, hRatio: 0.025 },
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

  // Level 10 — Apocalypse
  // Eight waves at maximum difficulty. Fragmented multi-tier platform maze.
  // Eight bomb crates create chain-reaction risk across the whole arena.
  // The final two entries fire in quick succession from opposite ends.
  10: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.55 },
    music: 'asset/music/Shield the Sky.mp3',
    waveDelayMs: 3000,
    platforms: [
      { xRatio: 0.5,  yRatio: 0.60, wRatio: 0.24, hRatio: 0.025 },
      { xRatio: 0.2,  yRatio: 0.46, wRatio: 0.18, hRatio: 0.025 },
      { xRatio: 0.8,  yRatio: 0.46, wRatio: 0.18, hRatio: 0.025 },
      { xRatio: 0.5,  yRatio: 0.32, wRatio: 0.14, hRatio: 0.025 },
      { xRatio: 0.12, yRatio: 0.74, wRatio: 0.14, hRatio: 0.025 },
      { xRatio: 0.88, yRatio: 0.74, wRatio: 0.14, hRatio: 0.025 },
      { xRatio: 0.35, yRatio: 0.86, wRatio: 0.12, hRatio: 0.025 },
      { xRatio: 0.65, yRatio: 0.86, wRatio: 0.12, hRatio: 0.025 },
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
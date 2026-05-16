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
//   waves            [{ speedPxPerSec, direction, xRatio, yRatio }]
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

  1: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.75 },

    platforms: [
      { xRatio: 0.5, yRatio: 0.88, wRatio: 0.8, hRatio: 0.03 },
      { xRatio: 0.18, yRatio: 0.65, wRatio: 0.2, hRatio: 0.025 },
      { xRatio: 0.82, yRatio: 0.65, wRatio: 0.2, hRatio: 0.025 },
    ],

    // prePlaced only uses levelTypes (bomb_crate, future scenery).
    // Walls and planks are placeableTypes — give them to the player via allowedBuildings.
    prePlaced: [
      { type: 'bomb_crate', xRatio: 0.3, yRatio: 0.84 },
      { type: 'bomb_crate', xRatio: 0.7, yRatio: 0.84 },
    ],

    // Only placeableTypes here.
    allowedBuildings: {
      shortPlank: 3,
      thickPlank: 2,
      wall:       2,
    },

    waves: [
      { speedPxPerSec: 350, direction: 1, xRatio: -0.15, yRatio: 0.04 },
    ],

    // scoring: uses window.ScoreConfig
  },

  2: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.75 },
    platforms:   [],
    prePlaced:   [],
    allowedBuildings: { shortPlank: 4, thickPlank: 2, wall: 2 },
    waves: [
      { speedPxPerSec: 400, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedPxPerSec: 420, direction: -1, xRatio:  1.15, yRatio: 0.04 },
    ],
    // scoring: uses window.ScoreConfig
  },

  3: {
    playerSpawn: { xRatio: 0.5, yRatio: 0.75 },
    platforms:   [],
    prePlaced:   [],
    allowedBuildings: { shortPlank: 5, thickPlank: 3, wall: 3 },
    waves: [
      { speedPxPerSec: 450, direction:  1, xRatio: -0.15, yRatio: 0.04 },
      { speedPxPerSec: 470, direction: -1, xRatio:  1.15, yRatio: 0.04 },
      { speedPxPerSec: 500, direction:  1, xRatio: -0.15, yRatio: 0.04 },
    ],
    // scoring: uses window.ScoreConfig
  },

};
window.Levels = {

  // ── Level 1 ── Tutorial ───────────────────────────────────────────────────
  // A gentle introduction. One slow airplane high in the sky.
  // Pre-placed bomb crates are far to the left and right, safe from the player.
  1: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 6000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 }, // Flat open ground
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 300, y: 918 }, // Far left
      { type: 'bomb_crate', x: 1620, y: 918 }, // Far right
    ],
    allowedBuildings: { shortPlank: 4, whitePlank: 4, leaf: 4, trampoline: 2 },
    waves: [
      { speed: 250, direction: 1, x: -163, y: 150, bomb: 'bomb' }, // High and slow plane
    ],
  },

  // ── Level 2 ── Bouncing Back ─────────────────────────────────────────────
  // Introduce trampolines. Low planes fly across the screen,
  // making it easy to bounce their bombs back to destroy them.
  2: {
    playerSpawn: { x: 400, y: 810 },
    waveDelayMs: 5000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 }, // Flat open ground
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 1500, y: 918 }, // Far right
    ],
    allowedBuildings: { shortPlank: 5, thickPlank: 3, dirt: 4, trampoline: 4 },
    waves: [
      { speed: 300, direction: 1, x: -163, y: 280, bomb: 'bomb' }, // Lower plane
      { speed: 320, direction: -1, x: 2083, y: 280, bomb: 'bomb' },
    ],
  },

  // ── Level 3 ── Pillbox Threat ─────────────────────────────────────────────
  // A static Pillbox enemy on the far right shoots small bombs towards the player.
  // Build a wall to protect yourself!
  3: {
    playerSpawn: { x: 600, y: 810 },
    waveDelayMs: 5000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'pillbox', x: 1600, y: 918, bomb: 'smallBomb' }, // Pillbox far right
    ],
    allowedBuildings: { thickPlank: 4, plank: 4, grass: 4, gravel: 3, trampoline: 3 },
    waves: [
      { speed: 320, direction: 1, x: -163, y: 350, bomb: 'bomb' },
      { speed: 340, direction: -1, x: 2083, y: 350, bomb: 'bomb' },
    ],
  },

  // ── Level 4 ── Crossfire ──────────────────────────────────────────────────
  // Pillboxes on both sides! The player is in the middle and must shield both flanks.
  4: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'pillbox', x: 200, y: 918, bomb: 'smallBomb' }, // Pillbox left
      { type: 'pillbox', x: 1720, y: 918, bomb: 'smallBomb' }, // Pillbox right
    ],
    allowedBuildings: { wall: 3, stone: 3, sand: 4, trampoline: 3 },
    waves: [
      { speed: 360, direction: 1, x: -163, y: 250, bomb: 'bomb' },
      { speed: 380, direction: -1, x: 2083, y: 250, bomb: 'bomb' },
      { speed: 400, direction: 1, x: -163, y: 250, bomb: 'bomb' },
    ],
  },

  // ── Level 5 ── Explosive Barriers ────────────────────────────────────────
  // Introduction of TNT. TNT explodes when destroyed.
  // Use it carefully to blow up incoming planes, but keep it away from yourself!
  5: {
    playerSpawn: { x: 1200, y: 810 },
    waveDelayMs: 4500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 300, y: 918 }, // Far left crate
      { type: 'pillbox', x: 750, y: 918, bomb: 'smallBomb' }, // Center-left pillbox
    ],
    allowedBuildings: { shortPlank: 5, wall: 3, tnt: 2, trampoline: 3 },
    waves: [
      { speed: 380, direction: 1, x: -163, y: 300, bomb: 'bomb' },
      { speed: 400, direction: -1, x: 2083, y: 300, bomb: 'bomb' },
    ],
  },

  // ── Level 6 ── Mortar Battery ─────────────────────────────────────────────
  // A mortar battery appears on the far right. It shoots high-arc bomb barrages.
  // Build a strong roof to withstand the vertical impact!
  6: {
    playerSpawn: { x: 450, y: 810 },
    waveDelayMs: 4500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'mortar', x: 1650, y: 918 }, // Mortar far right
    ],
    allowedBuildings: { stone: 3, sandstone: 3, iron: 2, trampoline: 4 },
    waves: [
      { speed: 420, direction: 1, x: -163, y: 350, bomb: 'bomb' },
      { speed: 440, direction: -1, x: 2083, y: 350, bomb: 'bomb' },
    ],
  },

  // ── Level 7 ── Slippery Ores ──────────────────────────────────────────────
  // Progression introduces ice physics, heavy ores, and mixed threats.
  7: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'pillbox', x: 200, y: 918, bomb: 'smallBomb' }, // Left Pillbox
      { type: 'mortar', x: 1720, y: 918 },                  // Right Mortar
    ],
    allowedBuildings: { ice: 3, thickIce: 2, coal: 3, iron: 3, gold: 2, trampoline: 2 },
    waves: [
      { speed: 450, direction: 1, x: -163, y: 300, bomb: 'bomb' },
      { speed: 480, direction: -1, x: 2083, y: 300, bomb: 'bomb' },
    ],
  },

  // ── Level 8 ── Cluster Bomb Introduction ─────────────────────────────────
  // The planes start dropping Cluster Bombs!
  // These split into 5 small cluster bomblets on impact, causing wide area damage.
  8: {
    playerSpawn: { x: 1300, y: 810 },
    waveDelayMs: 3500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'pillbox', x: 200, y: 918, bomb: 'smallBomb' }, // Pillbox far left
    ],
    allowedBuildings: { diamond: 2, obsidian: 2, iron: 3, trampoline: 4 },
    waves: [
      { speed: 420, direction: 1, x: -163, y: 300, bomb: 'clusterBomb' },
      { speed: 450, direction: -1, x: 2083, y: 300, bomb: 'clusterBomb' },
    ],
  },

  // ── Level 9 ── Cluster Storm ──────────────────────────────────────────────
  // The pillbox now fires cluster bombs too! Planes drop clusters. Mortars fire.
  9: {
    playerSpawn: { x: 960, y: 878 },
    waveDelayMs: 3500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'mortar', x: 100, y: 918 },                    // Left mortar
      { type: 'pillbox', x: 1720, y: 918, bomb: 'clusterBomb' }, // Right cluster pillbox
      { type: 'bomb_crate', x: 300, y: 918 },                    // Far left crate
      { type: 'bomb_crate', x: 1500, y: 918 },                    // Far right crate
    ],
    allowedBuildings: { diamond: 3, obsidian: 3, tnt: 2, trampoline: 5 },
    waves: [
      { speed: 460, direction: 1, x: -163, y: 350, bomb: 'bomb' },
      { speed: 480, direction: -1, x: 2083, y: 350, bomb: 'clusterBomb' },
      { speed: 500, direction: 1, x: -163, y: 350, bomb: 'clusterBomb' },
    ],
  },

  // ── Level 10 ── Final Stand (Crossfire Boss) ─────────────────────────────
  // A complete combination of dual mortars, dual pillboxes, and cluster planes.
  10: {
    playerSpawn: { x: 960, y: 878 },
    waveDelayMs: 3000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'mortar', x: 80, y: 918 },
      { type: 'mortar', x: 1840, y: 918 },
      { type: 'pillbox', x: 400, y: 918, bomb: 'smallBomb' },
      { type: 'pillbox', x: 1520, y: 918, bomb: 'clusterBomb' },
    ],
    allowedBuildings: { obsidian: 4, diamond: 3, iron: 4, tnt: 2, trampoline: 6 },
    waves: [
      { speed: 520, direction: 1, x: -163, y: 400, bomb: 'bomb' },
      { speed: 540, direction: -1, x: 2083, y: 400, bomb: 'clusterBomb' },
      { speed: 560, direction: 1, x: -163, y: 400, bomb: 'clusterBomb' },
      { speed: 580, direction: -1, x: 2083, y: 400, bomb: 'clusterBomb' },
    ],
  },

  // ── Level 11 ── Mortar Rain (Barrage Level) ────────────────────────────────
  // No airplanes! Dual offscreen mortars rain cluster bomb barrages.
  // Mortar barrage is fully customizable.
  11: {
    levelType: 'mortar_barrage',
    playerSpawn: { x: 960, y: 878 },
    waveDelayMs: 5000,
    mortarBarrage: {
      fireRateMs: 25,                         // extremely fast fire rate (25ms)
      durationMs: 2000,                       // fires for 2.0 seconds -> 80 bombs
      bombType: 'bomb',
      spread: 15,
    },
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'mortar', x: -80, y: 918 },    // Left off-screen mortar
      { type: 'mortar', x: 2000, y: 918 },    // Right off-screen mortar
      { type: 'bomb_crate', x: 300, y: 918 },    // Far left
      { type: 'bomb_crate', x: 1620, y: 918 },    // Far right
    ],
    allowedBuildings: { obsidian: 4, diamond: 3, iron: 4, tnt: 2, trampoline: 6 },
    waves: [
      { speed: 0, direction: 1, x: 0, y: 0 },
      { speed: 0, direction: 1, x: 0, y: 0 },
    ],
  },
};
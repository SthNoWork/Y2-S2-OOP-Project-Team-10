window.Levels = {

  // ── Level 1 ── Tutorial ───────────────────────────────────────────────────
  // A gentle introduction. One slow airplane high in the sky.
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
    allowedBuildings: { shortPlank: 4, longPlank: 2, pillar: 2, cube: 3, whitePlank: 4, leaf: 4, trampoline: 2 },
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
    allowedBuildings: { shortPlank: 5, longPlank: 3, pillar: 3, cube: 3, thickPlank: 3, dirt: 4, trampoline: 4 },
    waves: [
      { speed: 300, direction: 1, x: -163, y: 350, bomb: 'bomb' }, // Lower plane
      { speed: 320, direction: -1, x: 2083, y: 350, bomb: 'bomb' },
    ],
  },

  // ── Level 3 ── Perch Defense ─────────────────────────────────────────────
  // A mortar battery is pre-placed on top of a floating platform on the right side.
  // The player must use a trampoline to bounce its high-arc bombs back up to destroy it!
  3: {
    playerSpawn: { x: 500, y: 810 },
    waveDelayMs: 5000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 1500, y: 550, w: 220, h: 24 }, // High perch platform
    ],
    prePlaced: [
      { type: 'mortar', x: 1500, y: 500 }, // Mortar on high platform
    ],
    allowedBuildings: { thickPlank: 4, plank: 4, longPlank: 3, pillar: 3, cube: 3, grass: 4, gravel: 3, trampoline: 3 },
    waves: [
      { speed: 320, direction: 1, x: -163, y: 350, bomb: 'bomb' },
    ],
  },

  // ── Level 4 ── Crossfire Heights ──────────────────────────────────────────
  // Pillboxes on high platforms on both sides shooting down at the player!
  // Deflect their bombs back onto the platforms to destroy them for bonus points.
  4: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 300, y: 550, w: 200, h: 24 },  // Left perch platform
      { x: 1620, y: 550, w: 200, h: 24 }, // Right perch platform
    ],
    prePlaced: [
      { type: 'pillbox', x: 300, y: 510 },
      { type: 'pillbox', x: 1620, y: 510 },
    ],
    allowedBuildings: { wall: 3, stone: 3, sand: 4, trampoline: 3 },
    waves: [
      { speed: 360, direction: 1, x: -163, y: 250, bomb: 'bomb' },
      { speed: 380, direction: -1, x: 2083, y: 250, bomb: 'bomb' },
    ],
  },

  // ── Level 5 ── TNT Detonation Puzzle ──────────────────────────────────────
  // Elevated fortresses with pillboxes flanking a floating central platform
  // that holds TNT crates. Bouncing a bomb onto the TNT triggers a chain explosion!
  5: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 450, y: 650, w: 200, h: 24 },  // Left perch platform
      { x: 960, y: 600, w: 300, h: 24 },  // Floating central platform
      { x: 1470, y: 650, w: 200, h: 24 }, // Right perch platform
    ],
    prePlaced: [
      { type: 'pillbox', x: 450, y: 610 },
      { type: 'bomb_crate', x: 900, y: 562 },
      { type: 'bomb_crate', x: 960, y: 562 },
      { type: 'bomb_crate', x: 1020, y: 562 },
      { type: 'pillbox', x: 1470, y: 610 },
    ],
    allowedBuildings: { shortPlank: 5, longPlank: 3, pillar: 3, cube: 3, wall: 3, trampoline: 4 },
    waves: [
      { speed: 380, direction: 1, x: -163, y: 300, bomb: 'bomb' },
    ],
  },

  // ── Level 6 ── The Tower Shield ───────────────────────────────────────────
  // A mortar battery is directly above the player's head on a high floating platform.
  // The player must construct a protective canopy or use trampolines to deflect the vertical bombs!
  6: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 960, y: 550, w: 500, h: 24 }, // High central shield platform
    ],
    prePlaced: [
      { type: 'mortar', x: 960, y: 500 },
    ],
    allowedBuildings: { stone: 3, sandstone: 3, iron: 2, trampoline: 4 },
    waves: [
      { speed: 400, direction: 1, x: -163, y: 300, bomb: 'bomb' },
    ],
  },

  // ── Level 7 ── Slippery Bastions ──────────────────────────────────────────
  // Ground is covered in slippery ice. High platforms left and right have pillboxes.
  // Move carefully and use trampolines to deflect incoming shots!
  7: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 350, y: 600, w: 200, h: 24 },  // Left perch platform
      { x: 1570, y: 600, w: 200, h: 24 }, // Right perch platform
    ],
    prePlaced: [
      { type: 'pillbox', x: 350, y: 560 },
      { type: 'pillbox', x: 1570, y: 560 },
    ],
    allowedBuildings: { ice: 5, thickIce: 4, coal: 3, iron: 3, gold: 2, trampoline: 3 },
    waves: [
      { speed: 420, direction: 1, x: -163, y: 300, bomb: 'bomb' },
    ],
  },

  // ── Level 8 ── Stepped Cluster Core ───────────────────────────────────────
  // Multiple platforms form a flight of steps. Planes drop cluster bombs.
  // Detonate pre-placed TNT crates to take down the installations.
  8: {
    playerSpawn: { x: 1300, y: 810 },
    waveDelayMs: 3500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 400, y: 750, w: 220, h: 24 },
      { x: 700, y: 600, w: 220, h: 24 },
    ],
    prePlaced: [
      { type: 'pillbox', x: 400, y: 710 },
      { type: 'bomb_crate', x: 700, y: 562 },
    ],
    allowedBuildings: { diamond: 3, obsidian: 2, iron: 3, trampoline: 4 },
    waves: [
      { speed: 420, direction: 1, x: -163, y: 300, bomb: 'clusterBomb' },
    ],
  },

  // ── Level 9 ── Volcano Caldera ────────────────────────────────────────────
  // Elevated flanking platforms form a caldera valley in the center.
  // Elevators/mortars rain high-arc bombs down on the valley.
  9: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 3500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 250, y: 550, w: 300, h: 24 },  // High left rim
      { x: 1670, y: 550, w: 300, h: 24 }, // High right rim
    ],
    prePlaced: [
      { type: 'mortar', x: 250, y: 500 },
      { type: 'mortar', x: 1670, y: 500 },
    ],
    allowedBuildings: { diamond: 3, obsidian: 3, longPlank: 4, pillar: 4, cube: 4, trampoline: 5 },
    waves: [
      { speed: 460, direction: 1, x: -163, y: 350, bomb: 'clusterBomb' },
    ],
  },

  // ── Level 10 ── Boss: Iron Fortress ───────────────────────────────────────
  // A massive floating central steel structure containing a mortar and a pillbox.
  // Deflect bombs onto the fortress to demolish its layout.
  10: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 3000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 960, y: 500, w: 800, h: 24 }, // Iron Fortress core
    ],
    prePlaced: [
      { type: 'mortar', x: 760, y: 450 },
      { type: 'pillbox', x: 960, y: 460 },
      { type: 'mortar', x: 1160, y: 450 },
    ],
    allowedBuildings: { obsidian: 4, diamond: 3, iron: 4, longPlank: 4, pillar: 4, cube: 4, trampoline: 6 },
    waves: [
      { speed: 500, direction: 1, x: -163, y: 350, bomb: 'clusterBomb' },
      { speed: 520, direction: -1, x: 2083, y: 350, bomb: 'clusterBomb' },
    ],
  },

  // ── Level 11 ── Offscreen Barrage Showdown ────────────────────────────────
  // Offscreen mortars fire heavy barrages.
  // Towers of TNT crates flank the sides. Deflect barrages into the crates!
  11: {
    levelType: 'mortar_barrage',
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 5000,
    mortarBarrage: {
      fireRateMs: 220,
      durationMs: 4000,
      bombType: 'smallBomb',
      spread: 15,
    },
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 300, y: 918 },
      { type: 'bomb_crate', x: 300, y: 870 },
      { type: 'bomb_crate', x: 1620, y: 918 },
      { type: 'bomb_crate', x: 1620, y: 870 },
    ],
    allowedBuildings: { obsidian: 4, diamond: 3, iron: 4, longPlank: 4, pillar: 4, cube: 4, trampoline: 6 },
    waves: [
      { speed: 0, direction: 1, x: 0, y: 0 },
      { speed: 0, direction: 1, x: 0, y: 0 },
    ],
  },

  // ── Level 12 ── Sky Reactor ───────────────────────────────────────────────
  // A floating central TNT core connects left/right defensive platforms.
  // Blow up the core to destroy both defenses!
  12: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4500,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 400, y: 600, w: 200, h: 24 },
      { x: 960, y: 550, w: 160, h: 24 }, // Reactor core platform
      { x: 1520, y: 600, w: 200, h: 24 },
    ],
    prePlaced: [
      { type: 'pillbox', x: 400, y: 560 },
      { type: 'bomb_crate', x: 960, y: 512 },
      { type: 'mortar', x: 1520, y: 550 },
    ],
    allowedBuildings: { wall: 4, stone: 4, iron: 3, gold: 2, trampoline: 4 },
    waves: [
      { speed: 450, direction: 1, x: -163, y: 300, bomb: 'clusterBomb' },
    ],
  },

  // ── Level 13 ── Core Collapse ─────────────────────────────────────────────
  // Multiple columns of TNT crates are stacked high.
  // Knock them over using trampolines to trigger a beautiful series of chain explosions.
  13: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
    ],
    prePlaced: [
      { type: 'bomb_crate', x: 600, y: 918 },
      { type: 'bomb_crate', x: 600, y: 870 },
      { type: 'bomb_crate', x: 600, y: 822 },
      { type: 'bomb_crate', x: 1320, y: 918 },
      { type: 'bomb_crate', x: 1320, y: 870 },
      { type: 'bomb_crate', x: 1320, y: 822 },
    ],
    allowedBuildings: { shortPlank: 6, longPlank: 4, pillar: 4, cube: 5, wall: 4, trampoline: 4 },
    waves: [
      { speed: 400, direction: 1, x: -163, y: 320, bomb: 'bomb' },
      { speed: 440, direction: -1, x: 2083, y: 320, bomb: 'clusterBomb' },
    ],
  },

  // ── Level 14 ── Mortar Heaven ─────────────────────────────────────────────
  // Three mortars placed on very high perches shooting at offset intervals.
  // The player must survive and bounce them back.
  14: {
    levelType: 'mortar_barrage',
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4500,
    mortarBarrage: {
      fireRateMs: 140,
      durationMs: 3000,
      bombType: 'bomb',
      spread: 12,
    },
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 500, y: 500, w: 150, h: 24 },
      { x: 960, y: 450, w: 150, h: 24 },
      { x: 1420, y: 500, w: 150, h: 24 },
    ],
    prePlaced: [
      { type: 'mortar', x: 500, y: 450 },
      { type: 'mortar', x: 960, y: 400 },
      { type: 'mortar', x: 1420, y: 450 },
    ],
    allowedBuildings: { obsidian: 6, diamond: 5, iron: 4, trampoline: 6 },
    waves: [
      { speed: 0, direction: 1, x: 0, y: 0 },
    ],
  },

  // ── Level 15 ── Grand Finale ──────────────────────────────────────────────
  // The ultimate challenge. Dual floating platforms, each with a mortar and a pillbox.
  // Three fast cluster planes fly overhead. Fully loaded arsenal!
  15: {
    playerSpawn: { x: 960, y: 810 },
    waveDelayMs: 4000,
    platforms: [
      { x: 960, y: 956, w: 1920, h: 24 },
      { x: 450, y: 550, w: 300, h: 24 },
      { x: 1470, y: 550, w: 300, h: 24 },
    ],
    prePlaced: [
      { type: 'mortar', x: 380, y: 500 },
      { type: 'pillbox', x: 520, y: 510 },
      { type: 'mortar', x: 1390, y: 500 },
      { type: 'pillbox', x: 1530, y: 510 },
    ],
    allowedBuildings: { obsidian: 8, diamond: 6, iron: 8, trampoline: 8, shortPlank: 8, longPlank: 8 },
    waves: [
      { speed: 480, direction: 1, x: -163, y: 350, bomb: 'clusterBomb' },
      { speed: 520, direction: -1, x: 2083, y: 350, bomb: 'clusterBomb' },
      { speed: 560, direction: 1, x: -163, y: 350, bomb: 'clusterBomb' },
    ],
  },
};
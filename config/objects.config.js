// config/objects.config.js
// All object type definitions: placeable buildings, level-placed objects,
// and internal engine objects (plane, bomb, player).

window.ObjectConfig = {

  // Global friction multipliers (scales kinetic and static friction of objects)
  globalFrictionMultiplier: 3.0,
  globalStaticFrictionMultiplier: 3.0,

  // ── Placeable buildings (player places these before a wave) ──────────────
  placeableTypes: {

    // ── Wood / Light ────────────────────────────────────────────────────────

    shortPlank: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'brown_wood',
      physics: { friction: 0.8, restitution: 0.2, frictionAir: 0.01, label: 'building', mass: 8 },
      health: 30, onDeath: 'remove', maxCount: 5,
    },

    thickPlank: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'small_wood',
      physics: { friction: 0.9, restitution: 0.1, frictionAir: 0.01, label: 'building', mass: 14 },
      health: 60, onDeath: 'remove', maxCount: 3,
    },

    plank: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'plank',
      physics: { friction: 0.85, restitution: 0.15, frictionAir: 0.01, label: 'building', mass: 10 },
      health: 40, onDeath: 'remove', maxCount: 4,
    },

    whitePlank: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'white_wood',
      physics: { friction: 0.75, restitution: 0.25, frictionAir: 0.01, label: 'building', mass: 7 },
      health: 25, onDeath: 'remove', maxCount: 5,
    },

    leaf: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'leaf',
      physics: { friction: 0.4, restitution: 0.05, frictionAir: 0.05, label: 'building', mass: 3 },
      health: 10, onDeath: 'remove', maxCount: 6,
    },

    // ── Earth / Soft ─────────────────────────────────────────────────────────

    dirt: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'dirt',
      physics: { friction: 0.9, restitution: 0.05, frictionAir: 0.01, label: 'building', mass: 18 },
      health: 45, onDeath: 'remove', maxCount: 4,
    },

    grass: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'grass',
      physics: { friction: 0.85, restitution: 0.05, frictionAir: 0.01, label: 'building', mass: 16 },
      health: 40, onDeath: 'remove', maxCount: 4,
    },

    sand: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'sand',
      physics: { friction: 0.95, restitution: 0.0, frictionAir: 0.02, label: 'building', mass: 20 },
      health: 35, onDeath: 'remove', maxCount: 4,
    },

    gravel: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'gravel',
      physics: { friction: 0.9, restitution: 0.1, frictionAir: 0.01, label: 'building', mass: 22 },
      health: 50, onDeath: 'remove', maxCount: 4,
    },

    // ── Stone / Hard ─────────────────────────────────────────────────────────

    wall: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'brick',
      physics: { friction: 0.8, restitution: 0.0, frictionAir: 0.01, label: 'building', mass: 30 },
      health: 80, onDeath: 'remove', maxCount: 2,
    },

    stone: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'stone',
      physics: { friction: 0.7, restitution: 0.1, frictionAir: 0.01, label: 'building', mass: 35 },
      health: 90, onDeath: 'remove', maxCount: 3,
    },

    sandstone: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'sandstone',
      physics: { friction: 0.75, restitution: 0.05, frictionAir: 0.01, label: 'building', mass: 28 },
      health: 70, onDeath: 'remove', maxCount: 3,
    },

    snow: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'snow',
      physics: { friction: 0.3, restitution: 0.05, frictionAir: 0.01, label: 'building', mass: 12 },
      health: 30, onDeath: 'remove', maxCount: 5,
    },

    // ── Ice ──────────────────────────────────────────────────────────────────

    ice: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'ice',
      physics: { friction: 0.05, restitution: 0.4, frictionAir: 0.005, label: 'building', mass: 15 },
      health: 35, onDeath: 'remove', maxCount: 4,
    },

    thickIce: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'ice',
      physics: { friction: 0.05, restitution: 0.35, frictionAir: 0.005, label: 'building', mass: 22 },
      health: 55, onDeath: 'remove', maxCount: 3,
    },

    // ── Ore / Heavy ──────────────────────────────────────────────────────────

    coal: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'coal',
      physics: { friction: 0.75, restitution: 0.1, frictionAir: 0.01, label: 'building', mass: 32 },
      health: 75, onDeath: 'remove', maxCount: 3,
    },

    iron: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'iron',
      physics: { friction: 0.65, restitution: 0.15, frictionAir: 0.01, label: 'building', mass: 40 },
      health: 110, onDeath: 'remove', maxCount: 3,
    },

    gold: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'gold',
      physics: { friction: 0.55, restitution: 0.2, frictionAir: 0.01, label: 'building', mass: 50 },
      health: 95, onDeath: 'remove', maxCount: 2,
    },

    diamond: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'diamond',
      physics: { friction: 0.6, restitution: 0.3, frictionAir: 0.01, label: 'building', mass: 45 },
      health: 150, onDeath: 'remove', maxCount: 2,
    },

    obsidian: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'obsidian',
      physics: { friction: 0.8, restitution: 0.0, frictionAir: 0.01, label: 'building', mass: 60 },
      health: 200, onDeath: 'remove', maxCount: 2,
    },

    // ── Explosive ────────────────────────────────────────────────────────────

    tnt: {
      scale: 7,
      imageKey: 'block_atlas', startFrame: 'tnt',
      physics: { friction: 0.8, restitution: 0.1, frictionAir: 0.01, label: 'building', mass: 12 },
      health: 20, onDeath: 'explode',
      explosion: { animKey: 'explosion', imageKey: 'explosion_atlas', scale: 2, blastScale: 1.2 },
      blastForce: 80,
      blastMaxDamage: 90,
      maxCount: 2,
    },

    // ── Trampoline / Bounce Board ────────────────────────────────────────────
    // Flat board that bounces bombs upward.
    // Has normal physics so it can be knocked around.  Configurable: bounceForce, bounceVelocityCap.
    trampoline: {
      scale: 0.3,                          // tune this to fit your arena
      imageKey: 'spring_atlas',
      startFrame: 'spring1',               // resting frame           
      physics: {
        friction: 0.3, restitution: 0.0, frictionAir: 0.01, label: 'trampoline', mass: 10,
        collisionFilter: { category: 0x0008, mask: 0x0001 | 0x0002 | 0x0004 },
      },
      bounceForce: 28,
      bounceVelocityCap: 30,
      health: -1, onDeath: 'none',
      maxCount: 3,
    },
  },

  // ── Level-placed objects (pre-placed by the level designer) ──────────────
  levelTypes: {

    bomb_crate: {
      scale: 2, imageKey: 'item_atlas', startFrame: 'bomb_crate_1', animKey: 'bomb_crate_idle',
      physics: { friction: 0.8, restitution: 0.15, frictionAir: 0.01, label: 'building', mass: 10 },
      health: 5, onDeath: 'explode',
      explosion: { animKey: 'explosion', imageKey: 'explosion_atlas', scale: 2, blastScale: 0.8 },
      blastForce: 100,
      blastMaxDamage: 100,
    }
  },

  // ── Internal engine objects (created by game code, not the player) ────────
  internalTypes: {

    bomb: {
      scale: 2,
      imageKey: 'plane_atlas',
      animKey: 'bomb_fly',
      speed: 200,
      lifetime: 5000,
      damage: 50,
      poolable: true,
      physics: {
        friction: 0.8, restitution: 0.1, frictionAir: 0.01, label: 'bomb',
        shape: { type: 'circle', radiusRatio: 0.35 },
        collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 | 0x0008 },
      },
      explosion: { animKey: 'explosion', imageKey: 'explosion_atlas', scale: 1.5, blastScale: 0.8 },
      blastForce: 100,
      blastMaxDamage: 50,
    },

    smallBomb: {
      scale: 2,
      imageKey: 'plane_atlas',
      animKey: 'bomb_fly',
      speed: 200,
      lifetime: 5000,
      damage: 25,
      poolable: true,
      physics: {
        friction: 0.8, restitution: 0.1, frictionAir: 0.01, label: 'bomb',
        shape: { type: 'circle', radiusRatio: 0.35 },
        collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 | 0x0008 },
      },
      explosion: { animKey: 'explosion', imageKey: 'explosion_atlas', scale: 1.5, blastScale: 0.8 },
      blastForce: 100,
      blastMaxDamage: 25,
    },

    clusterBomblet: {
      scale: 0.8,
      imageKey: 'plane_atlas',
      animKey: 'bomb_fly',
      speed: 200,
      lifetime: 5000,
      damage: 12,
      poolable: true,
      physics: {
        friction: 0.8, restitution: 0.15, frictionAir: 0.01, label: 'bomb',
        shape: { type: 'circle', radiusRatio: 0.35 },
        collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 | 0x0008 },
      },
      explosion: { animKey: 'explosion', imageKey: 'explosion_atlas', scale: 0.8, blastScale: 0.5 },
      blastForce: 40,
      blastMaxDamage: 12,
    },

    // ── Cluster bomb ──────────────────────────────────────────────────────────
    // Explodes on impact, then spawns sub-bombs that scatter around the area.
    clusterBomb: {
      scale: 2,
      imageKey: 'plane_atlas',
      animKey: 'bomb_fly',
      speed: 200,
      lifetime: 5000,
      damage: 30,
      poolable: false,
      physics: {
        friction: 0.8, restitution: 0.1, frictionAir: 0.01, label: 'bomb',
        shape: { type: 'circle', radiusRatio: 0.35 },
        collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 | 0x0008 },
      },
      explosion: { animKey: 'explosion', imageKey: 'explosion_atlas', scale: 1.5, blastScale: 0.8 },
      blastForce: 80,
      blastMaxDamage: 30,
      // Cluster sub-munitions
      cluster: {
        subBomb: 'clusterBomblet',   // bomb type for each sub-munition
        count: 5,             // number of sub-bombs
        spreadDeg: 60,            // angular spread cone (degrees)
        speed: 180,           // launch speed of sub-bombs
      },
    },

    // ── Pillbox enemy ────────────────────────────────────────────────────────
    // Static bunker that fires bombs at the player.
    pillbox: {
      useGraphics: true,
      graphicsType: 'pillbox',
      scale: 1,
      collisionSize: { width: 120, height: 80 },
      bomb: 'smallBomb',
      shootingType: 'player',
      physics: {
        isStatic: true,
        friction: 1.0, restitution: 0.0, frictionAir: 0.01,
        label: 'building', mass: 100,
        collisionFilter: { category: 0x0001, mask: 0x0001 | 0x0002 | 0x0004 },
      },
      health: 80, onDeath: 'explode',
      explosion: { animKey: 'explosion', imageKey: 'explosion_atlas', scale: 2, blastScale: 1.0 },
      blastForce: 100,
      blastMaxDamage: 40,
    },

    // ── Mortar enemy ─────────────────────────────────────────────────────────
    // Tall battery on the screen edge that fires a 30-bomb barrage.
    mortar: {
      useGraphics: true,
      graphicsType: 'mortar',
      scale: 1,
      collisionSize: { width: 50, height: 100 },
      bomb: 'bomb',
      shootingType: 'player',
      barrageCount: 30,
      accuracySpread: 15,
      physics: {
        isStatic: true,
        friction: 1.0, restitution: 0.0, frictionAir: 0.01,
        label: 'building', mass: 100,
        collisionFilter: { category: 0x0001, mask: 0x0001 | 0x0002 | 0x0004 },
      },
      health: 120, onDeath: 'explode',
      explosion: { animKey: 'explosion', imageKey: 'explosion_atlas', scale: 3, blastScale: 1.5 },
      blastForce: 100,
      blastMaxDamage: 60,
    },

    plane: {
      scale: 3,
      imageKey: 'plane_atlas',
      animKey: 'plane_fly',
      startFrame: 'plane_1',
      spawnYOffsetY: 50,
      bladeOffsetX: 35,        // px offset from plane centre to blade sprite
      bladeOffsetY: -0.50,     // ratio of plane rendered height (negative = upward)
      bladeScale: 3,
      bombDropDelayRangeSec: { min: 0.18, max: 0.45 },
      bombDropOffsetRatioRange: { min: -0.35, max: 0.35 },
      bombDropYOffsetY: 39,
      bomb: 'bomb',

      // Make plane killable via Air-to-Air reflection
      health: 10000, onDeath: 'explode',
      explosion: { animKey: 'explosion', imageKey: 'explosion_atlas', scale: 2.5, blastScale: 1.2 },
      physics: {
        friction: 0.1, restitution: 0.0, frictionAir: 0.01,
        ignoreGravity: true,
        isSensor: true, // Planes just pass over everything without physical impact
        label: 'plane', mass: 100,
        collisionFilter: { category: 0x0001, mask: 0x0001 | 0x0002 | 0x0004 },
      },
    },

    player: {
      scale: 0.3, imageKey: 'player',
      physics: {
        friction: 0.5, restitution: 0.1, frictionAir: 0.02, label: 'player', mass: 5,
        shape: { type: 'circle', radiusRatio: 0.7 },
      },
      health: 100, onDeath: 'remove',
    },
  },
};
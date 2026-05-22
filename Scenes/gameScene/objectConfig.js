window.ObjectConfig = {

  placeableTypes: {

    // ── Wood / Light ──────────────────────────────────────────────────────────

    shortPlank: {
      scale:      10,
      color:      0x8b4513,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'brownwood',
      physics: {
        friction:    0.8,
        restitution: 0.2,
        frictionAir: 0.01,
        label:       'building',
        mass:        8,
      },
      health:   30,
      onDeath:  'remove',
      maxCount: 5,
    },

    thickPlank: {
      scale:      10,
      color:      0x654321,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'smallwood',
      physics: {
        friction:    0.9,
        restitution: 0.1,
        frictionAir: 0.01,
        label:       'building',
        mass:        14,
      },
      health:   60,
      onDeath:  'remove',
      maxCount: 3,
    },

    plank: {
      scale:      10,
      color:      0xc8a060,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'plank',
      physics: {
        friction:    0.85,
        restitution: 0.15,
        frictionAir: 0.01,
        label:       'building',
        mass:        10,
      },
      health:   40,
      onDeath:  'remove',
      maxCount: 4,
    },

    whitePlank: {
      scale:      10,
      color:      0xe8dcc8,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'whitewood',
      physics: {
        friction:    0.75,
        restitution: 0.25,
        frictionAir: 0.01,
        label:       'building',
        mass:        7,
      },
      health:   25,
      onDeath:  'remove',
      maxCount: 5,
    },

    leaf: {
      scale:      10,
      color:      0x228b22,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'leaf',
      physics: {
        friction:    0.4,
        restitution: 0.05,
        frictionAir: 0.05,
        label:       'building',
        mass:        3,
      },
      health:   10,
      onDeath:  'remove',
      maxCount: 6,
    },

    // ── Earth / Soft ─────────────────────────────────────────────────────────

    dirt: {
      scale:      10,
      color:      0x8b5e3c,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'dirt',
      physics: {
        friction:    0.9,
        restitution: 0.05,
        frictionAir: 0.01,
        label:       'building',
        mass:        18,
      },
      health:   45,
      onDeath:  'remove',
      maxCount: 4,
    },

    grass: {
      scale:      10,
      color:      0x4a7c3f,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'grass',
      physics: {
        friction:    0.85,
        restitution: 0.05,
        frictionAir: 0.01,
        label:       'building',
        mass:        16,
      },
      health:   40,
      onDeath:  'remove',
      maxCount: 4,
    },

    sand: {
      scale:      10,
      color:      0xd2b55b,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'sand',
      physics: {
        friction:    0.95,
        restitution: 0.0,
        frictionAir: 0.02,
        label:       'building',
        mass:        20,
      },
      health:   35,
      onDeath:  'remove',
      maxCount: 4,
    },

    gravel: {
      scale:      10,
      color:      0x9e9e9e,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'gravel',
      physics: {
        friction:    0.9,
        restitution: 0.1,
        frictionAir: 0.01,
        label:       'building',
        mass:        22,
      },
      health:   50,
      onDeath:  'remove',
      maxCount: 4,
    },

    // ── Stone / Hard ─────────────────────────────────────────────────────────

    wall: {
      scale:      10,
      color:      0x696969,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'brick',
      physics: {
        friction:    0.8,
        restitution: 0.0,
        frictionAir: 0.01,
        label:       'building',
        mass:        30,
      },
      health:   80,
      onDeath:  'remove',
      maxCount: 2,
    },

    stone: {
      scale:      10,
      color:      0x808080,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'stone',
      physics: {
        friction:    0.7,
        restitution: 0.1,
        frictionAir: 0.01,
        label:       'building',
        mass:        35,
      },
      health:   90,
      onDeath:  'remove',
      maxCount: 3,
    },

    sandstone: {
      scale:      10,
      color:      0xe0c97f,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'sandstone',
      physics: {
        friction:    0.75,
        restitution: 0.05,
        frictionAir: 0.01,
        label:       'building',
        mass:        28,
      },
      health:   70,
      onDeath:  'remove',
      maxCount: 3,
    },

    snow: {
      scale:      10,
      color:      0xe8f4f8,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'snow',
      physics: {
        friction:    0.3,
        restitution: 0.05,
        frictionAir: 0.01,
        label:       'building',
        mass:        12,
      },
      health:   30,
      onDeath:  'remove',
      maxCount: 5,
    },

    // ── Ice ──────────────────────────────────────────────────────────────────

    ice: {
      scale:      10,
      color:      0xa8d8ea,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'ice',
      physics: {
        friction:    0.05,
        restitution: 0.4,
        frictionAir: 0.005,
        label:       'building',
        mass:        15,
      },
      health:   35,
      onDeath:  'remove',
      maxCount: 4,
    },

    thickIce: {
      scale:      10,
      color:      0x78bcd4,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'ice1',
      physics: {
        friction:    0.05,
        restitution: 0.35,
        frictionAir: 0.005,
        label:       'building',
        mass:        22,
      },
      health:   55,
      onDeath:  'remove',
      maxCount: 3,
    },

    // ── Ore / Heavy ──────────────────────────────────────────────────────────

    coal: {
      scale:      10,
      color:      0x2d2d2d,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'coal',
      physics: {
        friction:    0.75,
        restitution: 0.1,
        frictionAir: 0.01,
        label:       'building',
        mass:        32,
      },
      health:   75,
      onDeath:  'remove',
      maxCount: 3,
    },

    iron: {
      scale:      10,
      color:      0xd8c0a0,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'iron',
      physics: {
        friction:    0.65,
        restitution: 0.15,
        frictionAir: 0.01,
        label:       'building',
        mass:        40,
      },
      health:   110,
      onDeath:  'remove',
      maxCount: 3,
    },

    gold: {
      scale:      10,
      color:      0xffd700,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'gold',
      physics: {
        friction:    0.55,
        restitution: 0.2,
        frictionAir: 0.01,
        label:       'building',
        mass:        50,
      },
      health:   95,
      onDeath:  'remove',
      maxCount: 2,
    },

    diamond: {
      scale:      10,
      color:      0x00e5ff,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'diamond',
      physics: {
        friction:    0.6,
        restitution: 0.3,
        frictionAir: 0.01,
        label:       'building',
        mass:        45,
      },
      health:   150,
      onDeath:  'remove',
      maxCount: 2,
    },

    obsidian: {
      scale:      10,
      color:      0x1a0a2e,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'obsidian',
      physics: {
        friction:    0.8,
        restitution: 0.0,
        frictionAir: 0.01,
        label:       'building',
        mass:        60,
      },
      health:   200,
      onDeath:  'remove',
      maxCount: 2,
    },

    // ── Explosive ────────────────────────────────────────────────────────────

    tnt: {
      scale:      10,
      color:      0xff2222,
      useImage:   true,
      imageKey:   'block_atlas',
      startFrame: 'Tnt',
      physics: {
        friction:    0.8,
        restitution: 0.1,
        frictionAir: 0.01,
        label:       'building',
        mass:        12,
      },
      health:   20,
      onDeath:  'explode',
      explosion: {
        animKey:    'explosion',
        imageKey:   'explosion_atlas',
        scale:      2,
        blastScale: 1.2,
      },
      blastForce:     80,
      blastMaxDamage: 90,
      maxCount: 2,
    },
  },

  levelTypes: {

    bomb_crate: {
      scale:    5,
      color:    0xa0522d,
      useImage: true,
      imageKey: 'bomb_crate',
      physics: {
        friction:    0.8,
        restitution: 0.15,
        frictionAir: 0.01,
        label:       'building',
        mass:        10,
      },
      health:  5,
      onDeath: 'explode',
      explosion: {
        animKey:    'explosion',
        imageKey:   'explosion_atlas',
        scale:      2,
        blastScale: 0.8,
      },
      blastForce:     100,
      blastMaxDamage: 100,
    },
  },

  internalTypes: {

    bomb: {
      scale:      3,
      color:      0x333333,
      useImage:   true,
      imageKey:   'plane_atlas',
      startFrame: 'row11_04',
      physics: {
        friction:    0.8,
        restitution: 0.1,
        frictionAir: 0.01,
        label:       'bomb',
        collisionFilter: {
          category: 0x0004,
          mask:     0x0001 | 0x0002 | 0x0008,
        },
      },
      explosion: {
        animKey:    'explosion',
        imageKey:   'explosion_atlas',
        scale:      1.5,
        blastScale: 0.8,
      },
      blastForce:     50,
      blastMaxDamage: 100,
    },

    plane: {
      scale:                    3,
      color:                    0xffaa00,
      useImage:                 true,
      imageKey:                 'plane_atlas',
      animKey:                  'plane_fly',
      startFrame:               'row01_02',
      spawnYOffsetY:            29,
      bladeOffsetX:             9,       // px offset from plane centre to blade sprite
      bladeOffsetY:             -0.50,   // ratio of plane rendered height (negative = upward)
      bombDropDelayRangeSec:    { min: 0.18, max: 0.45 },
      bombDropOffsetRatioRange: { min: -0.35, max: 0.35 },
      bombDropYOffsetY:         39,
    },

    player: {
      scale:    0.3,
      color:    0x00ff00,
      useImage: true,
      imageKey: 'player',
      physics: {
        friction:    0.5,
        restitution: 0.1,
        frictionAir: 0.02,
        label:       'player',
        mass:        5,
        shape:       { type: 'circle', radiusRatio: 0.7 },
      },
      health:  100,
      onDeath: 'remove',
    },
  },

};
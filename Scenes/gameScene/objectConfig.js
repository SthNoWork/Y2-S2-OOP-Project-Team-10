// ========================================
// OBJECT CONFIG
// ========================================
// Central registry for placeable, level, and internal object types.

window.ObjectConfig = {
  placeableTypes: {
    shortPlank: {
      widthRatio:  0.45,
      heightRatio: 0.02,
      scale:       1,
      sizeMode:    'ratio',
      color:       0x8b4513,
      useImage:    true,
      imageKey:    'block_atlas',
      startFrame:  'brownwood',
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
      widthRatio:  0.25,
      heightRatio: 0.09,
      scale:       1,
      sizeMode:    'ratio',
      color:       0x654321,
      useImage:    true,
      imageKey:    'block_atlas',
      startFrame:  'smallwood',
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

    wall: {
      widthRatio:  0.06,
      heightRatio: 0.24,
      scale:       1,
      sizeMode:    'ratio',
      color:       0x696969,
      useImage:    true,
      imageKey:    'block_atlas',
      startFrame:  'brick',
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
  },

  levelTypes: {
    bomb_crate: {
      widthRatio:  0.07,
      heightRatio: 0.07,
      scale:       1,      // display scale multiplier (1 = native texture size)
      color:       0xa0522d,
      useImage:    true,
      imageKey:    'bomb_crate',
      physics: {
        friction:    0.8,
        restitution: 0.15,
        frictionAir: 0.01,
        label:       'building',
        mass:        10,
      },
      health:  5,
      onDeath: 'explode',
      blast: {
        radiusRatio: 0.18,
        forceRatio:  2.315,
        maxDamage:   60,
      },
    },
  },

  internalTypes: {
    bomb: {
      widthRatio:       0.030,
      heightRatio:      0.045,
      scale:            0.8,
      sizeMode:         'ratio',
      color:            0x333333,
      useImage:         true,
      imageKey:         'plane_atlas',
      startFrame:       'row11_04',
      physics: {
        friction:       0.8,
        restitution:    0.1,
        frictionAir:    0.01,
        label:          'bomb',
        collisionFilter: {
          category: 0x0004,
          mask:     0x0001 | 0x0002 | 0x0008,
        },
      },
      blastRadiusRatio: 0.2,
      blastForceRatio:  0.116,
      directHitDamage:  50,
      blastMaxDamage:   50,
    },

    plane: {
      widthRatio:               0.20,
      heightRatio:              0.10,
      scale:                    1,
      sizeMode:                 'ratio',
      spawnYOffsetRatio:        0.03,
      color:                    0xffaa00,
      useImage:                 true,
      imageKey:                 'plane_atlas',
      animKey:                  'plane_fly',
      startFrame:               'row01_02',
      bombDropDelayRangeSec:    { min: 0.18, max: 0.45 },
      bombDropOffsetRatioRange: { min: -0.35, max: 0.35 },
      bombDropYOffsetRatio:     0.04,
    },

    player: {
      widthRatio:  0.4,
      heightRatio: 0.2,
      scale:       0.5,
      sizeMode:    'ratio',
      color:       0x00ff00,
      useImage:    true,
      imageKey:    'player',
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
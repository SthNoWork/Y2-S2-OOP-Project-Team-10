// ========================================
// OBJECT CONFIG
// ========================================
// Central registry for placeable, level, and internal object types.

window.ObjectConfig = {
  placeableTypes: {
    shortPlank: {
      widthRatio:  0.15,
      heightRatio: 0.04,
      scale:       1,
      color:       0x8b4513,
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
      widthRatio:  0.1,
      heightRatio: 0.08,
      scale:       1,
      color:       0x654321,
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
      heightRatio: 0.2,
      scale:       1,
      color:       0x696969,
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
      widthRatio:       0.025,
      heightRatio:      0.035,
      scale:            0.8,
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
      widthRatio:               0.12,
      heightRatio:              0.05,
      scale:                    1,
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
      widthRatio:  0.08,
      heightRatio: 0.08,
      scale:       0.5,
      color:       0x00ff00,
      useImage:    true,
      imageKey:    'player',
      physics: {
        friction:    0.5,
        restitution: 0.1,
        frictionAir: 0.02,
        label:       'player',
        mass:        5,
        shape:       { type: 'circle' },
      },
      health:  100,
      onDeath: 'remove',
    },
  },
};
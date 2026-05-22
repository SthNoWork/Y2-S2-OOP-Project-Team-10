window.ObjectConfig = {

  placeableTypes: {

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
        animKey:  'explosion',
        imageKey: 'explosion_atlas',
        scale:    3,
        blastScale: 1,
      },
      blastForce:    100,
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
        scale:      2,
        blastScale: 0.8,
      },
      blastForce:    50,
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
      bladeOffsetX:             9,      // px offset from plane centre to blade sprite
      bladeOffsetY:             -0.50,  // ratio of plane rendered height (negative = upward)
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
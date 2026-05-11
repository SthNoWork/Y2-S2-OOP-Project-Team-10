// ========================================
// OBJECT FACTORY
// ========================================
// Single source of truth for all game object configs and creation/destruction.
// Owns: config data, createX(), destroyX() for bombs, planes, players, buildings.
// Does NOT own: drag logic, placement, counts, collisions, game state.

window.ObjectConfig = {};
window.ObjectFactory = {};

// ========================================
// BOMB
// ========================================

// Visual size, physics, and damage/blast parameters.
window.ObjectConfig.bomb = {
  useImage:         false,
  imageKey:         '',
  widthRatio:       0.025,
  heightRatio:      0.035,
  color:            0x333333,
  physics: {
    friction:       0.8,
    restitution:    0.1,
    frictionAir:    0.01,
  },
  // blastRadiusRatio: fraction of screen width used as explosion radius.
  blastRadiusRatio: 0.2,
  // blastForce: px/tick velocity units — higher = more dramatic knockback.
  blastForce:       5000,
  directHitDamage:  50,
  blastMaxDamage:   50,
};

// Create and return a bomb game object with a physics body.
// Bombs skip bomb-bomb collisions; they only react to ground, player, buildings.
window.ObjectFactory.createBomb = function (scene, x, y, arena) {
  const cfg = window.ObjectConfig.bomb;

  const bomb = (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey))
    ? scene.add.image(x, y, cfg.imageKey)
        .setDisplaySize(arena.W * cfg.widthRatio, arena.H * cfg.heightRatio)
    : scene.add.rectangle(x, y, arena.W * cfg.widthRatio, arena.H * cfg.heightRatio, cfg.color);

  scene.matter.add.gameObject(bomb, {
    friction:    cfg.physics.friction,
    restitution: cfg.physics.restitution,
    frictionAir: cfg.physics.frictionAir,
    label:       'bomb',
  });

  bomb.isBomb = true;

  // Collision filter: bombs ignore other bombs.
  if (bomb.body?.collisionFilter) {
    bomb.body.collisionFilter.category = 0x0004;            // bomb category
    bomb.body.collisionFilter.mask     = 0x0001 | 0x0002 | 0x0008; // ground | player | buildings
  }

  return bomb;
};

// ========================================
// PLANE
// ========================================

// Visual size and randomized bomb-drop timing parameters.
window.ObjectConfig.plane = {
  useImage:               false,
  imageKey:               '',
  widthRatio:             0.12,
  heightRatio:            0.05,
  color:                  0xffaa00,
  // bombDropDelayRangeSec: random interval between each bomb drop while plane is active.
  bombDropDelayRangeSec:  { min: 0.18, max: 0.45 },
  // bombDropOffsetRatioRange: horizontal scatter as a fraction of plane width.
  bombDropOffsetRatioRange: { min: -0.35, max: 0.35 },
  // bombDropYOffsetRatio: how far below the plane centre bombs spawn.
  bombDropYOffsetRatio:   0.04,
};

// Create and return a plane game object (visual only — no physics body).
window.ObjectFactory.createPlane = function (scene, spawnLocation, arena) {
  const cfg = window.ObjectConfig.plane;

  if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
    return scene.add
      .image(spawnLocation.x, spawnLocation.y, cfg.imageKey)
      .setDisplaySize(arena.W * cfg.widthRatio, arena.H * cfg.heightRatio);
  }

  return scene.add.rectangle(
    spawnLocation.x, spawnLocation.y,
    arena.W * cfg.widthRatio, arena.H * cfg.heightRatio,
    cfg.color
  );
};

// ========================================
// PLAYER
// ========================================

// Visual size, physics, mass, and starting health.
window.ObjectConfig.player = {
  useImage:   false,
  imageKey:   '',
  widthRatio:  0.08,
  heightRatio: 0.08,
  color:       0x00ff00,
  maxHealth:   100,
  physics: {
    friction:    0.5,
    restitution: 0.1,
    frictionAir: 0.02,
  },
  // mass: heavier = less knockback from blasts.
  mass: 5,
};

// Create and return a player game object with a physics body.
window.ObjectFactory.createPlayer = function (scene, x, y, arena) {
  const cfg = window.ObjectConfig.player;
  let player;

  if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
    player = scene.add.image(x, y, cfg.imageKey)
      .setDisplaySize(arena.W * cfg.widthRatio, arena.H * cfg.heightRatio);
  } else {
    player = scene.add.rectangle(
      x, y,
      arena.W * cfg.widthRatio, arena.H * cfg.heightRatio,
      cfg.color
    );
  }

  scene.matter.add.gameObject(player, {
    friction:    cfg.physics.friction,
    restitution: cfg.physics.restitution,
    frictionAir: cfg.physics.frictionAir,
    label:       'player',
  });

  if (player.body) {
    try { Phaser.Physics.Matter.Matter.Body.setMass(player.body, cfg.mass || 5); } catch (e) {}
  }

  return player;
};

// ========================================
// BUILDINGS
// ========================================

// Per-type definitions: visual, physics, health, mass, and placement limits.
// blastResistance removed — mass alone drives knockback calculation.
window.ObjectConfig.buildingTypes = {

  shortPlank: {
    label:      'shortPlank',
    widthRatio:  0.15,
    heightRatio: 0.04,
    color:       0x8b4513,
    physics: { friction: 0.8, restitution: 0.2, frictionAir: 0.01 },
    health:   30,
    mass:      8,
    maxCount:  5,
  },

  thickPlank: {
    label:      'thickPlank',
    widthRatio:  0.1,
    heightRatio: 0.08,
    color:       0x654321,
    physics: { friction: 0.9, restitution: 0.1, frictionAir: 0.01 },
    health:   60,
    mass:     14,
    maxCount:  3,
  },

  wall: {
    label:      'wall',
    widthRatio:  0.06,
    heightRatio: 0.2,
    color:       0x696969,
    physics: { friction: 0.8, restitution: 0.0, frictionAir: 0.01 },
    health:   80,
    mass:     30,
    maxCount:  2,
  },

};

// Create and return a building game object with a static physics body.
// Registers the building with GameLogic for blast/damage tracking.
window.ObjectFactory.createBuilding = function (scene, arena, buildingType, x, y, options = {}) {
  const cfg = window.ObjectConfig.buildingTypes[buildingType];
  if (!cfg) return null;

  const building = scene.add.rectangle(
    x, y,
    arena.W * cfg.widthRatio,
    arena.H * cfg.heightRatio,
    cfg.color
  );

  scene.matter.add.gameObject(building, {
    friction:    cfg.physics.friction,
    restitution: cfg.physics.restitution,
    frictionAir: cfg.physics.frictionAir,
    label:       'building',
  });

  if (building.body) {
    Phaser.Physics.Matter.Matter.Body.setStatic(building.body, true);
    try { Phaser.Physics.Matter.Matter.Body.setMass(building.body, cfg.mass || 8); } catch (e) {}
  }

  // Attach type metadata and runtime state.
  building.buildingType         = buildingType;
  building.buildingConfig       = cfg;
  building.health               = Infinity; // damage disabled during debug
  building.maxHealth            = Infinity;
  building.isDragging           = false;
  building.isBuilding           = true;
  building.spawnedFromInventory = !!options.fromInventory;
  building._dragOrigin          = { x, y };
  building._ghostRemoved        = false;

  // No-op damage handler while debugging — replace with real logic when ready.
  building.takeDamage = function () { return false; };

  building.setInteractive({ useHandCursor: true });

  // Notify GameLogic so it tracks this building for blast queries.
  if (window.GameLogic?.addBuilding) {
    window.GameLogic.addBuilding(building);
  }

  return building;
};

// Destroy a building game object and clean up its scene presence.
// BuildingManager calls this and handles count bookkeeping itself.
window.ObjectFactory.destroyBuilding = function (building) {
  if (!building?.active) return;
  try { building.destroy(); } catch (e) {}
};

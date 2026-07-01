// config/collisionLayers.config.js
// Single source of truth for Matter.js collision filter categories.

window.CollisionLayers = {
  DEFAULT:            0x0001,
  PLAYER_1:           0x0002,
  PLAYER_2:           0x0004,
  STRUCTURE:          0x0008,
  EXPLOSIVE_P1:       0x0010,
  EXPLOSIVE_P2:       0x0020,
  NEUTRAL_PROJECTILE: 0x0040,
  DIVIDER:            0x0080,
};

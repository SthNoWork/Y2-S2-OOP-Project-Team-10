// config/assets.config.js
// Declares every image, spritesheet, text atlas, and animation the game uses.
// Consumed by SpriteFactory.preloadAll() and SpriteFactory.buildAll().

window.Assets = {

  images: [
    { key: 'player',                    path: 'asset/character/result.png' },
    { key: 'bg_asset_background_1_jpg', path: 'asset/background/background.jpg' },
    { key: 'bg_asset_background_2_jpg', path: 'asset/background/background1.jpg' },
    { key: 'bg_asset_background_3_jpg', path: 'asset/background/background2.jpg' },
    { key: 'bg_asset_background_4_jpg', path: 'asset/background/background3.jpg' },
    { key: 'bg_asset_background_5_jpg', path: 'asset/background/background5.jpg' },
  ],

  atlases: [
    { key: 'plane_atlas', imagePath: 'asset/plane/plane.png', jsonPath: 'asset/plane/plane.json' },
    { key: 'block_atlas', imagePath: 'asset/block/block.png', jsonPath: 'asset/block/block.json' },
    { key: 'explosion_atlas', imagePath: 'asset/explosion/explosion.png', jsonPath: 'asset/explosion/explosion.json' },
    { key: 'item_atlas', imagePath: 'asset/item/item.png', jsonPath: 'asset/item/item.json' },
  ],

  animations: [
    {
      key:       'plane_fly',
      atlasKey:  'plane_atlas',
      frames:    ['plane_2', 'plane_3', 'plane_4', 'plane_5', 'plane_6'],
      frameRate: 10,
      repeat:    -1,
    },
    {
      key:       'plane_blades',
      atlasKey:  'plane_atlas',
      frames:    ['plane_blade_1', 'plane_blade_2', 'plane_blade_3', 'plane_blade_4', 'plane_blade_5'],
      frameRate: 18,
      repeat:    -1,
    },
    {
      key:       'explosion',
      atlasKey:  'explosion_atlas',
      frames: [
        'explosion_1',  'explosion_2',  'explosion_3',  'explosion_4',
        'explosion_5',  'explosion_6',  'explosion_7',  'explosion_8',
        'explosion_9',  'explosion_10', 'explosion_11', 'explosion_12',
        'explosion_13', 'explosion_13', 'explosion_14', 'explosion_15', 'explosion_16',
      ],
      frameRate: 32,
      repeat:    1,
    },

    // ── Bomb (plane_atlas) ───────────────────────────────────────────────────
    // Plays once and freezes on the last frame.
    // Game logic picks ltr vs rtl based on the plane's travel direction.
    {
      key:       'bomb_ltr',
      atlasKey:  'plane_atlas',
      frames:    ['bomb_1', 'bomb_2', 'bomb_3', 'bomb_4'],
      frameRate: 6,
      repeat:    1,   // play once → freezes on bomb_4
    },
    {
      key:       'bomb_rtl',
      atlasKey:  'plane_atlas',
      frames:    ['bomb_7', 'bomb_6', 'bomb_5', 'bomb_4'],
      frameRate: 6,
      repeat:    1,
    },

    // ── Items (item_atlas) ───────────────────────────────────────────────────
    {
      key:       'bomb_crate_idle',
      atlasKey:  'item_atlas',
      frames:    ['bomb_crate_1', 'bomb_crate_2', 'bomb_crate_3', 'bomb_crate_4',
                  'bomb_crate_5', 'bomb_crate_6', 'bomb_crate_7'],
      frameRate: 10,
      repeat:    -1,
    },
    {
      key:       'gas_idle',
      atlasKey:  'item_atlas',
      frames:    ['gas_1', 'gas_2', 'gas_3', 'gas_4', 'gas_5', 'gas_6', 'gas_7'],
      frameRate: 10,
      repeat:    -1,
    },
  ],
};
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
    { key: 'bg_asset_background_5_jpg', path: 'asset/background/background.jpg' },
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
  ],
};
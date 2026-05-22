window.Assets = {
  images: [
    { key: 'bomb_crate', path: 'asset/material/tile_0001.png' },
    { key: 'player', path: 'asset/character/result.png' },
    { key: 'bg_asset_background_1_jpg', path: 'asset/background/background.jpg' },
    { key: 'bg_asset_background_2_jpg', path: 'asset/background/background1.jpg' },
    { key: 'bg_asset_background_3_jpg', path: 'asset/background/background2.jpg' },
    { key: 'bg_asset_background_4_jpg', path: 'asset/background/background3.jpg' },
    { key: 'bg_asset_background_5_jpg', path: 'asset/background/background.jpg' },
  ],

  
  sheets: [
    { key: 'plane_sheet', path: 'asset/plane/spritesheet.png' },
    { key: 'block_sheet', path: 'asset/block/block.png' },
    { key: 'explosion_sheet', path: 'asset/explosion/explosion.png' },
  ],

  
  texts: [
    { key: 'plane_sprites', path: 'asset/plane/sprites.txt' },
    { key: 'block_sprites', path: 'asset/block/block.txt' },
    {key:'explosion_sprites', path: 'asset/explosion/explosion.txt' },
  ],

  
  atlases: [
    { key: 'plane_atlas', sheetKey: 'plane_sheet', textKey: 'plane_sprites' },
    { key: 'block_atlas', sheetKey: 'block_sheet', textKey: 'block_sprites' },
    {key: 'explosion_atlas', sheetKey: 'explosion_sheet', textKey: 'explosion_sprites' },
  ],

  
  animations: [
    {
      key: 'plane_fly',
      atlasKey: 'plane_atlas',
      frames: ['row01_02', 'row01_03', 'row01_04', 'row01_05', 'row01_06'],
      frameRate: 10,
      repeat: -1,
    },
    {
      key: 'plane_blades',
      atlasKey: 'plane_atlas',
      frames: ['row04_01', 'row04_02', 'row04_03', 'row04_04', 'row04_05'],
      frameRate: 18,
      repeat: -1,
    },
    {
      key: 'explosion',
      atlasKey: 'explosion_atlas',
      frames: ['explosion1', 'explosion2', 'explosion3', 'explosion4', 'explosion5', 'explosion6', 'explosion7', 'explosion8', 'explosion9', 'explosion10',
        'explosion11', 'explosion12', 'explosion13', 'explosion13', 'explosion14', 'explosion15', 'explosion16'],
      frameRate: 32,
      repeat: 1,
    },
  ],
};
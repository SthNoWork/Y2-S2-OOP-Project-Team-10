// ========================================
// ASSET CONFIG
// ========================================
// Central registry for all asset keys and paths.

window.Assets = {
  images: [
    { key: 'bomb_crate', path: 'asset/material/tile_0001.png' },
    { key: 'player', path: 'asset/character/1.png' },
    { key: 'bg_asset_background_1_jpg', path: 'asset/background/1.jpg' },
    { key: 'bg_asset_background_2_jpg', path: 'asset/background/2.jpg' },
    { key: 'bg_asset_background_3_jpg', path: 'asset/background/3.jpg' },
    { key: 'bg_asset_background_4_jpg', path: 'asset/background/4.jpg' },
    { key: 'bg_asset_background_5_jpg', path: 'asset/background/5.jpg' },
  ],
  sheets: [
    { key: 'plane_sheet', path: 'assets/plane/spritesheet.png' },
  ],
  texts: [
    { key: 'plane_sprites', path: 'assets/plane/sprites.txt' },
  ],
  atlases: [
    { key: 'plane_atlas', sheetKey: 'plane_sheet', textKey: 'plane_sprites' },
  ],
  animations: [
    {
      key: 'plane_fly',
      atlasKey: 'plane_atlas',
      frames: ['row01_02','row01_03','row01_04','row01_05','row01_06'],
      frameRate: 10,
      repeat: -1,
    },
    {
      key: 'plane_blades',
      atlasKey: 'plane_atlas',
      frames: ['row04_01','row04_02','row04_03','row04_04','row04_05'],
      frameRate: 18,
      repeat: -1,
    },
  ],
};

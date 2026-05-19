// assets.js
// Central registry for every asset the game uses.
// SpriteFactory reads this at boot to preload images, spritesheets,
// text-atlas descriptors, and to build Phaser atlases and animations.

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

  // Raw spritesheets — loaded as plain images, then sliced into atlases via the .txt files below.
  sheets: [
    { key: 'plane_sheet', path: 'asset/plane/spritesheet.png' },
    { key: 'block_sheet', path: 'asset/block/block.png' },
  ],

  // CSV-style text files that map frame names to pixel rects on their sheet.
  texts: [
    { key: 'plane_sprites', path: 'asset/plane/sprites.txt' },
    { key: 'block_sprites', path: 'asset/block/block.txt' },
  ],

  // Pairs a sheet with its text file so SpriteFactory can build a named Phaser atlas.
  atlases: [
    { key: 'plane_atlas', sheetKey: 'plane_sheet', textKey: 'plane_sprites' },
    { key: 'block_atlas', sheetKey: 'block_sheet', textKey: 'block_sprites' },
  ],

  // Phaser animation definitions referencing frames from an atlas.
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
class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  // ========================================
  // PRELOAD
  // ========================================
  // Load all shared assets here so every scene can use them.

  preload() {
    this.load.image('bomb_crate', 'asset/material/tile_0001.png');
    this.load.image('player', 'asset/character/1.png');
    this.load.image('plane_sheet', 'assets/plane/spritesheet.png');
    this.load.text('plane_sprites', 'assets/plane/sprites.txt');
  }

  create(data) {
    this._initPlaneAtlas();

    const nextScene = window._bootTarget ?? 'GameScene';
    window._bootTarget = null;
    this.scene.start(nextScene);
  }

  _initPlaneAtlas() {
    const sheetTex = this.textures.get('plane_sheet');
    const src = sheetTex?.getSourceImage?.();
    const raw = this.cache.text.get('plane_sprites');
    if (!src || !raw) return;

    const frames = {};
    raw.split(/\r?\n/).forEach((line) => {
      const parts = line.split(',');
      if (parts.length < 5) return;
      const name = parts[0].trim();
      const x = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      const w = parseInt(parts[3], 10);
      const h = parseInt(parts[4], 10);
      if (!name || Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(w) || Number.isNaN(h)) return;
      frames[name] = { frame: { x, y, w, h } };
    });

    if (!this.textures.exists('plane_atlas')) {
      this.textures.addAtlas('plane_atlas', src, { frames });
    }

    if (this.anims.exists('plane_fly')) this.anims.remove('plane_fly');
    const frameNames = ['row01_02','row01_03','row01_04','row01_05','row01_06'];
    this.anims.create({
      key: 'plane_fly',
      frames: frameNames.map((frame) => ({ key: 'plane_atlas', frame })),
      frameRate: 10,
      repeat: -1,
    });

    if (this.anims.exists('plane_blades')) this.anims.remove('plane_blades');
    const bladeFrames = [
      'row04_01','row04_02','row04_03','row04_04','row04_05',
    ];
    this.anims.create({
      key: 'plane_blades',
      frames: bladeFrames.map((frame) => ({ key: 'plane_atlas', frame })),
      frameRate: 18,
      repeat: -1,
    });
  }
}
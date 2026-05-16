const TRIM_CONFIGS = [
  {
    key:    'bomb_crate',
    sx:     15,
    sy:     25,
    sw:     33,
    sh:     33,
    alphaThreshold: 1,
  },
];

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  // ========================================
  // PRELOAD
  // ========================================
  // Load all shared assets here so every scene can use them.

  preload() {
    this.load.image('items', 'assets/metal_slug_items.png');
  }

  create(data) {
    const tex = this.textures.get('items');

    if (!tex || !tex.source || !tex.source[0]) {
      console.error('BootScene: items texture not ready');
    } else {
      const src = tex.getSourceImage();

      TRIM_CONFIGS.forEach((cfg) => {
        this._createTrimmedTexture(src, cfg);
      });
    }

    const nextScene = data?.nextScene || 'GameScene';
    this.scene.start(nextScene);
  }

  _trimOpaqueBounds(ctx, w, h) {
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] >= this._trimAlphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0 || maxY < 0) {
      return { minX: 0, minY: 0, maxX: w - 1, maxY: h - 1 };
    }

    return { minX, minY, maxX, maxY };
  }

  _createTrimmedTexture(src, cfg) {
    const rawKey = `${cfg.key}_raw`;
    const raw = this.textures.createCanvas(rawKey, cfg.sw, cfg.sh);
    raw.context.drawImage(src, cfg.sx, cfg.sy, cfg.sw, cfg.sh, 0, 0, cfg.sw, cfg.sh);
    raw.refresh();

    this._trimAlphaThreshold = cfg.alphaThreshold ?? 1;
    const bounds = this._trimOpaqueBounds(raw.context, cfg.sw, cfg.sh);
    this._trimAlphaThreshold = 1;

    const trimW = bounds.maxX - bounds.minX + 1;
    const trimH = bounds.maxY - bounds.minY + 1;
    const trimmed = this.textures.createCanvas(cfg.key, trimW, trimH);

    trimmed.context.drawImage(
      raw.getSourceImage(),
      bounds.minX,
      bounds.minY,
      trimW,
      trimH,
      0,
      0,
      trimW,
      trimH
    );

    trimmed.refresh();
    this.textures.remove(rawKey);
  }
}
// ========================================
// ASSET LOADER
// ========================================
// Loads all sheets and builds all animations declared in spriteDefinitions.js.
//
// Usage:
//   BootScene.preload() → window.AssetLoader.preloadAssets(this)
//   BootScene.create()  → window.AssetLoader.createAnimations(this)
//
// After BootScene finishes, every subsequent scene can call:
//   sprite.play('bomb_idle')
//   window.AssetLoader.makeSprite(scene, x, y, 'chicken_walk')

window.AssetLoader = {

  // Build and register a single animation if its texture exists.
  _ensureAnimation(scene, animKey) {
    const def = window.SpriteDefinitions.ANIMATIONS[animKey];
    if (!def) return false;

    const { sheet, frames, frameRate, repeat } = def;
    if (!scene.textures.exists(sheet)) {
      console.warn(`AssetLoader: texture "${sheet}" not found for animation "${animKey}"`);
      return false;
    }

    const texture = scene.textures.get(sheet);
    if (!texture || !Array.isArray(frames) || frames.length === 0) {
      return false;
    }

    const phaserFrames = frames.map((f, i) => {
      const frameName = `${animKey}_${i}`;
      if (!texture.has(frameName)) {
        texture.add(frameName, 0, f.x, f.y, f.w, f.h);
      }
      return { key: sheet, frame: frameName };
    });

    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key:       animKey,
        frames:    phaserFrames,
        frameRate: frameRate,
        repeat:    repeat,
      });
    }

    return scene.anims.exists(animKey);
  },

  // Create a simple placeholder canvas texture for missing assets.
  _makePlaceholderTexture(scene, animKey, width = 32, height = 32, color = '#ff00ff') {
    const key = `placeholder_${animKey}`;
    if (scene.textures.exists(key)) return key;

    const canvasTexture = scene.textures.createCanvas(key, width, height);
    const ctx = canvasTexture.getContext();
    try {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
      // Draw a contrasting inner box
      ctx.fillStyle = '#222222';
      ctx.fillRect(Math.floor(width * 0.1), Math.floor(height * 0.1), Math.floor(width * 0.8), Math.floor(height * 0.8));
      // Optional tiny label
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(8, Math.floor(height * 0.18))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = (animKey || 'missing').slice(0, 4);
      ctx.fillText(label, width / 2, height / 2);
    } catch (e) {}
    canvasTexture.refresh();
    return key;
  },

  // ========================================
  // PRELOAD
  // Call from BootScene.preload()
  // Queues every sheet in SHEETS for loading.
  // ========================================
  preloadAssets(scene) {
    const sheets = window.SpriteDefinitions.SHEETS;
    Object.entries(sheets).forEach(([key, path]) => {
      scene.load.image(key, path);
    });
  },

  // ========================================
  // CREATE ANIMATIONS
  // Call from BootScene.create()
  // Registers named frame regions on each texture,
  // then builds Phaser animations from them.
  // Animations are global — available in all scenes.
  // ========================================
  createAnimations(scene) {
    Object.keys(window.SpriteDefinitions.ANIMATIONS).forEach((animKey) => {
      this._ensureAnimation(scene, animKey);
    });
  },

  // ========================================
  // MAKE SPRITE
  // Convenience helper used by ObjectFactory.
  // Creates a Phaser Sprite and immediately plays the animation.
  // Returns the sprite, or null if the animKey is unknown.
  // ========================================
  makeSprite(scene, x, y, animKey) {
    const def = window.SpriteDefinitions.ANIMATIONS[animKey];
    if (!def) {
      console.warn(`AssetLoader.makeSprite: unknown animKey "${animKey}" — creating placeholder`);
      const key = this._makePlaceholderTexture(scene, animKey, 32, 32, '#888888');
      return scene.add.sprite(x, y, key);
    }

    // Try to ensure the real animation; if that fails, create a placeholder texture
    if (!this._ensureAnimation(scene, animKey)) {
      console.warn(`AssetLoader.makeSprite: animation "${animKey}" unavailable — using placeholder`);
      const fw = def.frames && def.frames[0] && def.frames[0].w ? def.frames[0].w : 32;
      const fh = def.frames && def.frames[0] && def.frames[0].h ? def.frames[0].h : 32;
      const key = this._makePlaceholderTexture(scene, animKey, fw, fh, '#888888');
      return scene.add.sprite(x, y, key);
    }

    const firstFrame = `${animKey}_0`;
    if (!scene.textures.exists(def.sheet) || !scene.textures.get(def.sheet)?.has(firstFrame)) {
      console.warn(`AssetLoader.makeSprite: frame "${firstFrame}" missing on sheet "${def.sheet}" — using placeholder`);
      const fw = def.frames && def.frames[0] && def.frames[0].w ? def.frames[0].w : 32;
      const fh = def.frames && def.frames[0] && def.frames[0].h ? def.frames[0].h : 32;
      const key = this._makePlaceholderTexture(scene, animKey, fw, fh, '#888888');
      return scene.add.sprite(x, y, key);
    }

    const sprite = scene.add.sprite(x, y, def.sheet, firstFrame);
    if (scene.anims.exists(animKey)) {
      sprite.play(animKey);
    }
    return sprite;
  },

};
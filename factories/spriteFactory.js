// factories/spriteFactory.js
// Handles all asset loading, atlas building, and animation playback.

window.SpriteFactory = {

  // ── Public API ────────────────────────────────────────────────────────────

  // Plays an animation on a sprite. If the animation is finite (repeat !== -1),
  // the sprite is automatically destroyed when it completes.
  playAnimation(sprite, animationKey) {
    if (!sprite?.anims || !animationKey) return sprite;

    const animCfg = this._getAnimationConfig(animationKey);

    if (this._isFiniteAnimation(animCfg)) {
      sprite.once('animationcomplete', () => {
        if (sprite.active) sprite.destroy();
      });
    }

    sprite.play(animationKey);
    return sprite;
  },

  // Queues all images, sheets, and text files for loading by Phaser.
  preloadAll(scene) {
    const cfg = window.Assets;
    if (!cfg) return;

    (cfg.images || []).forEach((img) => {
      if (img?.key && img?.path) scene.load.image(img.key, img.path);
    });

    (cfg.sheets || []).forEach((sheet) => {
      if (sheet?.key && sheet?.path) scene.load.image(sheet.key, sheet.path);
    });

    (cfg.texts || []).forEach((txt) => {
      if (txt?.key && txt?.path) scene.load.text(txt.key, txt.path);
    });
  },

  // Builds all atlases and registers all animations after assets are loaded.
  buildAll(scene) {
    this._buildAtlases(scene);
    this._buildAnimations(scene);
  },

  // ── Atlas building ────────────────────────────────────────────────────────

  _buildAtlases(scene) {
    const cfg = window.Assets;
    if (!cfg?.atlases) return;
    cfg.atlases.forEach((atlas) => this._buildAtlasFromText(scene, atlas));
  },

  // Parses a CSV text file into Phaser frame data and registers it as an atlas.
  _buildAtlasFromText(scene, atlas) {
    if (!atlas?.key || !atlas?.sheetKey || !atlas?.textKey) return;
    if (scene.textures.exists(atlas.key)) return;

    const sheetTex = scene.textures.get(atlas.sheetKey);
    const src      = sheetTex?.getSourceImage?.();
    const raw      = scene.cache.text.get(atlas.textKey);
    if (!src || !raw) return;

    const frames = this._parseAtlasText(raw);
    scene.textures.addAtlas(atlas.key, src, { frames });
  },

  // Converts raw CSV text (name,x,y,w,h per line) to a Phaser frames object.
  _parseAtlasText(raw) {
    const frames = {};
    raw.split(/\r?\n/).forEach((line) => {
      const parts = line.split(',');
      if (parts.length < 5) return;

      const name = parts[0].trim();
      const x    = parseInt(parts[1], 10);
      const y    = parseInt(parts[2], 10);
      const w    = parseInt(parts[3], 10);
      const h    = parseInt(parts[4], 10);

      if (!name || Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(w) || Number.isNaN(h)) return;
      frames[name] = { frame: { x, y, w, h } };
    });
    return frames;
  },

  // ── Animation building ────────────────────────────────────────────────────

  _buildAnimations(scene) {
    const cfg = window.Assets;
    if (!cfg?.animations) return;

    cfg.animations.forEach((anim) => {
      if (!anim?.key || !anim?.atlasKey || !Array.isArray(anim.frames)) return;

      // Remove stale animation so it can be re-registered cleanly.
      if (scene.anims.exists(anim.key)) scene.anims.remove(anim.key);

      scene.anims.create({
        key:       anim.key,
        frames:    anim.frames.map((frame) => ({ key: anim.atlasKey, frame })),
        frameRate: anim.frameRate ?? 10,
        repeat:    this._toPhaserRepeat(anim.repeat),
      });
    });
  },

  // ── Helpers ───────────────────────────────────────────────────────────────

  _getAnimationConfig(animationKey) {
    return (window.Assets?.animations || []).find((a) => a?.key === animationKey) || null;
  },

  // An animation is finite if its repeat count is anything other than -1 (loop forever).
  _isFiniteAnimation(animCfg) {
    return animCfg != null && (animCfg.repeat ?? -1) !== -1;
  },

  // Assets use repeat as a play-count (e.g. repeat:1 = play once).
  // Phaser uses repeat as an extra-cycles count (repeat:0 = play once).
  _toPhaserRepeat(repeat) {
    if (repeat == null || repeat === -1) return -1;
    return Math.max(0, repeat - 1);
  },
};
// spriteFactory.js
// Reads window.Assets and drives all asset loading and post-load assembly.
// Call preloadAll() inside a scene's preload() hook, then buildAll() in create().
// Keeps atlas and animation construction out of individual scenes.

window.SpriteFactory = {

  // Plays an animation on a sprite with lifecycle behavior derived from
  // window.Assets animation config.
  // - Any finite animation (repeat !== -1) auto-destroys the sprite when done.
  // - repeat: 1  → play once then destroy
  // - repeat: 3  → play 3 times then destroy
  // - repeat: -1 → loop forever, never destroy
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

  // Queues every image, spritesheet, and text file listed in window.Assets
  // for loading by Phaser's loader. Call this inside a scene's preload().
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

  // Assembles atlases and registers animations once all assets have loaded.
  // Call this inside a scene's create().
  buildAll(scene) {
    this._buildAtlases(scene);
    this._buildAnimations(scene);
  },

  // Iterates the atlas list in window.Assets and builds each one.
  _buildAtlases(scene) {
    const cfg = window.Assets;
    if (!cfg?.atlases) return;

    cfg.atlases.forEach((atlas) => {
      this._buildAtlasFromText(scene, atlas);
    });
  },

  // Parses a CSV text file into a Phaser atlas frame map and registers the atlas.
  // Skips silently if the texture or text data is not yet available.
  _buildAtlasFromText(scene, atlas) {
    if (!atlas?.key || !atlas?.sheetKey || !atlas?.textKey) return;
    if (scene.textures.exists(atlas.key)) return;

    const sheetTex = scene.textures.get(atlas.sheetKey);
    const src      = sheetTex?.getSourceImage?.();
    const raw      = scene.cache.text.get(atlas.textKey);
    if (!src || !raw) return;

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

    scene.textures.addAtlas(atlas.key, src, { frames });
  },

  // Creates all Phaser animations listed in window.Assets.
  // Removes any existing animation with the same key before recreating it.
  _buildAnimations(scene) {
    const cfg = window.Assets;
    if (!cfg?.animations) return;

    cfg.animations.forEach((anim) => {
      if (!anim?.key || !anim?.atlasKey || !Array.isArray(anim.frames)) return;
      if (scene.anims.exists(anim.key)) scene.anims.remove(anim.key);
      scene.anims.create({
        key:       anim.key,
        frames:    anim.frames.map((frame) => ({ key: anim.atlasKey, frame })),
        frameRate: anim.frameRate ?? 10,
        repeat:    this._toPhaserRepeat(anim.repeat),
      });
    });
  },

  _getAnimationConfig(animationKey) {
    const animations = window.Assets?.animations || [];
    return animations.find((anim) => anim?.key === animationKey) || null;
  },

  // Returns true for any animation that ends (repeat !== -1).
  // These sprites are auto-destroyed when the animation completes.
  _isFiniteAnimation(animCfg) {
    return animCfg != null && (animCfg.repeat ?? -1) !== -1;
  },

  // Converts config repeat to Phaser's repeat value.
  // Config repeat = total number of full plays.
  // Phaser repeat = extra loops AFTER the first play.
  //   config -1 → Phaser -1  (loop forever)
  //   config  1 → Phaser  0  (play once, no extras)
  //   config  3 → Phaser  2  (play once + 2 more = 3 total)
  _toPhaserRepeat(repeat) {
    if (repeat == null || repeat === -1) return -1;
    return Math.max(0, repeat - 1);
  },
};
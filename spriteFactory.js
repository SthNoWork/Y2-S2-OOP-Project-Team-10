// spriteFactory.js
// Reads window.Assets and drives all asset loading and post-load assembly.
// Call preloadAll() inside a scene's preload() hook, then buildAll() in create().
// Keeps atlas and animation construction out of individual scenes.

window.SpriteFactory = {

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
        repeat:    anim.repeat ?? -1,
      });
    });
  },
};
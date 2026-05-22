window.SpriteFactory = {







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



  buildAll(scene) {
    this._buildAtlases(scene);
    this._buildAnimations(scene);
  },


  _buildAtlases(scene) {
    const cfg = window.Assets;
    if (!cfg?.atlases) return;

    cfg.atlases.forEach((atlas) => {
      this._buildAtlasFromText(scene, atlas);
    });
  },



  _buildAtlasFromText(scene, atlas) {
    if (!atlas?.key || !atlas?.sheetKey || !atlas?.textKey) return;
    if (scene.textures.exists(atlas.key)) return;

    const sheetTex = scene.textures.get(atlas.sheetKey);
    const src = sheetTex?.getSourceImage?.();
    const raw = scene.cache.text.get(atlas.textKey);
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

    scene.textures.addAtlas(atlas.key, src, { frames });
  },



  _buildAnimations(scene) {
    const cfg = window.Assets;
    if (!cfg?.animations) return;

    cfg.animations.forEach((anim) => {
      if (!anim?.key || !anim?.atlasKey || !Array.isArray(anim.frames)) return;
      if (scene.anims.exists(anim.key)) scene.anims.remove(anim.key);
      scene.anims.create({
        key: anim.key,
        frames: anim.frames.map((frame) => ({ key: anim.atlasKey, frame })),
        frameRate: anim.frameRate ?? 10,
        repeat: this._toPhaserRepeat(anim.repeat),
      });
    });
  },

  _getAnimationConfig(animationKey) {
    const animations = window.Assets?.animations || [];
    return animations.find((anim) => anim?.key === animationKey) || null;
  },



  _isFiniteAnimation(animCfg) {
    return animCfg != null && (animCfg.repeat ?? -1) !== -1;
  },







  _toPhaserRepeat(repeat) {
    if (repeat == null || repeat === -1) return -1;
    return Math.max(0, repeat - 1);
  },
};
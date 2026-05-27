// factories/spriteFactory.js
// Handles all asset loading, atlas building, and animation playback.

window.SpriteFactory = {

  // ── Public API ────────────────────────────────────────────────────────────

  // Queues all images and atlases for loading by Phaser.
  preloadAll(scene) {
    const cfg = window.Assets;
    if (!cfg) return;

    (cfg.images || []).forEach((img) => {
      if (img?.key && img?.path) scene.load.image(img.key, img.path);
    });

    (cfg.atlases || []).forEach((atlas) => {
      if (atlas?.key && atlas?.imagePath && atlas?.jsonPath) {
        scene.load.atlas(atlas.key, atlas.imagePath, atlas.jsonPath);
      }
    });
  },

  // Registers all animations after assets are loaded.
  buildAll(scene) {
    const cfg = window.Assets;
    if (!cfg?.animations) return;

    cfg.animations.forEach((anim) => {
      if (!anim?.key || !anim?.atlasKey || !Array.isArray(anim.frames)) return;

      // Remove stale animation so it can be re-registered cleanly.
      if (scene.anims.exists(anim.key)) scene.anims.remove(anim.key);

      scene.anims.create({
        key: anim.key,
        frames: anim.frames.map((frame) => ({ key: anim.atlasKey, frame })),
        frameRate: anim.frameRate ?? 10,
        repeat: this._toPhaserRepeat(anim.repeat),
      });
    });
  },

  // Plays an animation on a sprite. Finite animations (repeat !== -1)
  // automatically destroy the sprite when they complete.
  playAnimation(sprite, animationKey) {
    if (!sprite?.anims || !animationKey) return sprite;

    const animCfg = this._findAnimConfig(animationKey);

    if (this._isFiniteAnimation(animCfg)) {
      sprite.once('animationcomplete', () => {
        if (sprite.active) sprite.destroy();
      });
    }

    sprite.play(animationKey);
    return sprite;
  },


  // ── Helpers ───────────────────────────────────────────────────────────────

  _findAnimConfig(animationKey) {
    return (window.Assets?.animations || []).find((a) => a?.key === animationKey) || null;
  },

  // An animation is finite if its repeat count is anything other than -1 (loop forever).
  _isFiniteAnimation(animCfg) {
    return animCfg != null && (animCfg.repeat ?? -1) !== -1;
  },

  // Assets use repeat as a play-count (e.g. repeat:1 = play once).
  // Phaser uses repeat as extra-cycles count (repeat:0 = play once, -1 = loop).
  _toPhaserRepeat(repeat) {
    if (repeat == null || repeat === -1) return -1;
    return Math.max(0, repeat - 1);
  },
};
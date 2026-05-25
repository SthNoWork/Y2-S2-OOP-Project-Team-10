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
    this._buildAnimations(scene);
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
// sizeCalculator.js
// Single-responsibility module: all dimension math for game object textures/bodies.
// No Phaser scene creation, no physics attachment, no visual building — just numbers.
//
// Usage:
//   const dims = window.SizeCalculator.computeSize(scene, cfg, arena);
//   // dims → { bodyW, bodyH, scaleX, scaleY }          (rectangle)
//   // dims → { bodyW, bodyH, scaleX, scaleY, radius }  (circle)
//
// The resolution ratio converts design-time sizes (authored at 1920×1080)
// into correct pixel values for any screen or arena size.
//
// Must be loaded before objectFactory.js.

window.SizeCalculator = {

  // Base resolution the game is authored at (matches window.Scale in Game.js).
  BASE_W: 1920,
  BASE_H: 1080,

  // ─────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────

  // Returns the resolution ratio for a given arena.
  //   ratioX = arenaWidth  / BASE_W  (horizontal correction factor)
  //   ratioY = arenaHeight / BASE_H  (vertical correction factor)
  // Multiplying a design-time pixel value by these factors gives the correct
  // live screen pixel value for the current arena size.
  getResolutionRatio(arena) {
    return {
      ratioX: arena.ARENA_W / this.BASE_W,
      ratioY: arena.ARENA_H / this.BASE_H,
    };
  },

  // Main entry point. Reads cfg.physics.shape.type (defaults to 'rectangle')
  // and delegates to computeRectangle or computeCircle accordingly.
  //
  // cfg fields used:
  //   widthRatio           — fraction of the sprite's own width  (1 = natural, 2 = double)
  //   heightRatio          — fraction of the sprite's own height (independent axis)
  //   scale                — uniform multiplier applied on top of the ratio result
  //   useImage             — whether to look up a texture frame for sizing
  //   imageKey             — texture key for image/sprite objects
  //   startFrame           — optional frame name within an atlas
  //   physics.shape.type   — 'rectangle' | 'circle' (defaults to 'rectangle')
  //   physics.shape.radiusRatio — optional per-object circle tuning (circles only)
  //
  // Returns { bodyW, bodyH, scaleX, scaleY } for rectangles,
  //     and { bodyW, bodyH, scaleX, scaleY, radius } for circles.
  // Results are cached per unique arena+config combo so repeated calls are cheap.
  computeSize(scene, cfg, arena) {
    const shapeType = cfg?.physics?.shape?.type ?? 'rectangle';
    const cacheKey  = this._cacheKey(cfg, arena, shapeType);

    if (cfg._sizeCache?.key === cacheKey) return { ...cfg._sizeCache.size };

    const size = shapeType === 'circle'
      ? this.computeCircle(scene, cfg, arena)
      : this.computeRectangle(scene, cfg, arena);

    cfg._sizeCache = { key: cacheKey, size };
    return { ...size };
  },

  // ─────────────────────────────────────────────────────────
  // RECTANGLE
  // ─────────────────────────────────────────────────────────

  // Computes final body dimensions and display scales for a rectangular object.
  //
  // Pipeline for image/atlas textures:
  //   1. Read the raw sprite frame dimensions (texW × texH).
  //   2. Multiply each axis independently by its ratio (widthRatio / heightRatio).
  //        ratio 1:1 → matches sprite exactly
  //        ratio 1:2 → twice as tall as it is wide
  //   3. Apply the resolution factor so the object occupies the same visual
  //      proportion on every screen size.
  //   4. Multiply by scale for a uniform size adjustment.
  //
  //   scaleX = widthRatio  × ratioX × scale   (passed to obj.setScale)
  //   scaleY = heightRatio × ratioY × scale
  //   bodyW  = texW × scaleX                  (physics body width in pixels)
  //   bodyH  = texH × scaleY                  (physics body height in pixels)
  //
  // Fallback for plain rectangles (no texture):
  //   bodyW  = ARENA_W × widthRatio  × scale
  //   bodyH  = ARENA_H × heightRatio × scale
  //   scaleX = scaleY = 1  (Phaser rectangles don't use setScale like images)
  //
  // Returns: { bodyW, bodyH, scaleX, scaleY }
  computeRectangle(scene, cfg, arena) {
    const scale  = cfg.scale       ?? 1;
    const wRatio = cfg.widthRatio  ?? 1;
    const hRatio = cfg.heightRatio ?? 1;
    const { ratioX, ratioY } = this.getResolutionRatio(arena);

    if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
      const { texW, texH } = this._getFrameDimensions(scene, cfg);

      // Each axis scaled independently: sprite size × config ratio × resolution × uniform scale.
      const scaleX = wRatio * ratioX * scale;
      const scaleY = hRatio * ratioY * scale;

      return {
        bodyW:  texW * scaleX,
        bodyH:  texH * scaleY,
        scaleX,
        scaleY,
      };
    }

    // Rectangle fallback — no texture, so ratios are fractions of the arena size.
    return {
      bodyW:  arena.ARENA_W * wRatio * scale,
      bodyH:  arena.ARENA_H * hRatio * scale,
      scaleX: 1,
      scaleY: 1,
    };
  },

  // ─────────────────────────────────────────────────────────
  // CIRCLE
  // ─────────────────────────────────────────────────────────

  // Computes dimensions for a circular physics body.
  //
  // Pipeline:
  //   1. Read raw sprite frame dimensions (texW × texH).
  //   2. Find the inscribed circle of the ORIGINAL (pre-scale) sprite:
  //        inscribed radius = min(texW, texH) / 2
  //      This is the largest circle that fits inside the untransformed frame,
  //      so the collision zone never bleeds outside the visible sprite.
  //   3. Apply resolution factor using the AVERAGE of X and Y ratios so the
  //      circle stays perfectly round on non-16:9 screens.
  //   4. Apply cfg.scale as a uniform multiplier.
  //   5. Optionally apply cfg.physics.shape.radiusRatio for per-object tuning
  //      (e.g. 0.7 makes the hitbox slightly smaller than the inscribed circle).
  //
  //   radius = inscribed × avgRatio × scale × (radiusRatio ?? 1)
  //
  //   bodyW / bodyH = diameter (2 × radius) — used for bounding box queries.
  //   scaleX / scaleY are computed the same way as for a rectangle so the
  //   sprite itself renders at the correct visual size even with a circular body.
  //
  // Returns: { bodyW, bodyH, scaleX, scaleY, radius }
  computeCircle(scene, cfg, arena) {
    const scale  = cfg.scale       ?? 1;
    const wRatio = cfg.widthRatio  ?? 1;
    const hRatio = cfg.heightRatio ?? 1;
    const { ratioX, ratioY } = this.getResolutionRatio(arena);

    // Average ratio keeps the circle round regardless of aspect ratio.
    const avgRatio = (ratioX + ratioY) * 0.5;

    if (cfg.useImage && cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
      const { texW, texH } = this._getFrameDimensions(scene, cfg);

      // Sprite display scales — same formula as rectangle so the image renders correctly.
      const scaleX = wRatio * ratioX * scale;
      const scaleY = hRatio * ratioY * scale;

      // Inscribed circle of the original (pre-scale) sprite dimensions.
      const inscribed = Math.min(texW, texH) / 2;

      // Final radius: inscribed × resolution × uniform scale × optional per-object tuning.
      const radiusRatio = cfg.physics?.shape?.radiusRatio ?? 1;
      const radius      = Math.max(2, Math.round(inscribed * avgRatio * scale * radiusRatio));

      return {
        bodyW:  radius * 2,
        bodyH:  radius * 2,
        scaleX,
        scaleY,
        radius,
      };
    }

    // Fallback: treat the arena-fraction rectangle as the bounding box,
    // then inscribe a circle inside it.
    const bodyW     = arena.ARENA_W * wRatio * scale;
    const bodyH     = arena.ARENA_H * hRatio * scale;
    const inscribed = Math.min(bodyW, bodyH) / 2;
    const radius    = Math.max(2, Math.round(inscribed * avgRatio));

    return {
      bodyW:  radius * 2,
      bodyH:  radius * 2,
      scaleX: 1,
      scaleY: 1,
      radius,
    };
  },

  // ─────────────────────────────────────────────────────────
  // EXPLOSION RADIUS
  // ─────────────────────────────────────────────────────────

  // Returns the blast radius in screen pixels using the explosion sprite's first frame.
  //
  // Pipeline:
  //   1. Read the first frame of explosion_atlas ('explosion1') to get raw pixel dims.
  //   2. Find the inscribed circle: radius = min(frameW, frameH) / 2.
  //      The largest circle that fits inside the frame, so the visual boundary of
  //      the explosion always contains the damage zone.
  //   3. Multiply by blastScale from the object config (default 1). Tune this per-
  //      object to make a bomb-crate blast larger or smaller than the raw sprite.
  //   4. Multiply by the average arena/device ratio so the radius stays the same
  //      visual proportion on every screen size.
  //
  // Used by ObjectFactory.explosionFrameRadius and GameLogic._blastRadiusPx.
  explosionRadius(scene, arena, blastScale) {
    const ATLAS       = 'explosion_atlas';
    const FIRST_FRAME = 'explosion6';

    let frameW = 64, frameH = 64;
    if (scene?.textures?.exists(ATLAS)) {
      const frame = scene.textures.getFrame(ATLAS, FIRST_FRAME);
      if (frame) {
        frameW = frame.realWidth  || frame.width  || 64;
        frameH = frame.realHeight || frame.height || 64;
      }
    }

    // Explicitly ignoring resFactor so the radius is consistently absolute
    const baseRadius = frameW;
    return baseRadius * (blastScale ?? 1);
  },

  // ─────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────

  // Reads the raw pixel dimensions of a texture frame.
  // Falls back to 32×32 if the atlas or frame hasn't loaded yet.
  _getFrameDimensions(scene, cfg) {
    const frame = cfg.startFrame
      ? scene.textures.getFrame(cfg.imageKey, cfg.startFrame)
      : scene.textures.getFrame(cfg.imageKey);

    return {
      texW: frame?.realWidth  || frame?.width  || 32,
      texH: frame?.realHeight || frame?.height || 32,
    };
  },

  // Builds a stable string key for the result cache.
  // Encodes everything that affects the output so stale results are never returned.
  _cacheKey(cfg, arena, shapeType) {
    return [
      Math.round(arena.ARENA_W),
      Math.round(arena.ARENA_H),
      shapeType,
      cfg.scale      ?? 1,
      cfg.widthRatio  ?? 1,
      cfg.heightRatio ?? 1,
      cfg.imageKey   ?? 'na',
      cfg.startFrame ?? 'base',
      cfg.physics?.shape?.radiusRatio ?? 1,
    ].join(':');
  },
};
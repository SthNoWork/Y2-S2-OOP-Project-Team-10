class ExplosionCommand {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.x = options.x;
    this.y = options.y;
    this.explosiveCfg = options.explosiveCfg;
    this.sourceBomb = options.sourceBomb;
  }

  execute() {
    const scene = this.scene;
    const x = this.x;
    const y = this.y;
    const explosiveCfg = this.explosiveCfg;
    const sourceBomb = this.sourceBomb;

    if (!scene || !explosiveCfg) return;

    const explosionCfg = explosiveCfg.explosion || {};
    const radius = this._blastRadiusPx(explosionCfg);
    if (!radius) return;

    if (sourceBomb?.body?.id) {
      console.log(`[Bomb Explode] ID: ${sourceBomb.body.id} | Explode Pos: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }

    if (window.DEBUG) {
      if (explosiveCfg.blastForce == null) console.error('[ExplosionCommand] blastForce is not defined');
      if (explosiveCfg.blastMaxDamage == null) console.error('[ExplosionCommand] blastMaxDamage is not defined');
    }

    // 1. Play SFX
    try { window.SfxManager?.playExplosion?.(); } catch (e) { }

    // 2. Play VFX (with throttling)
    this._spawnExplosionVFX(explosionCfg, x, y);

    // 3. Draw debug radius
    this._drawDebugBlastRadius(x, y, radius);

    // 4. Collect affected bodies in the Matter world
    const bodies = this._collectBlastBodies(x, y, radius, sourceBomb);
    for (const body of bodies) {
      this._applyBlastEffects(body, x, y, radius, explosiveCfg.blastForce, explosiveCfg.blastMaxDamage, sourceBomb);
    }

    // 5. Spawn cluster sub-bombs
    this._spawnClusterBombs(explosiveCfg, x, y, sourceBomb);
  }

  // Returns the blast radius in pixels derived from the largest animation frame.
  _blastRadiusPx(explosionCfg) {
    if (!explosionCfg?.animKey) return null;

    const { animKey, scale, blastScale } = explosionCfg;
    if (!this.scene.anims.exists(animKey)) return null;
    if (scale == null) return null;
    if (blastScale == null) return null;

    const anim = this.scene.anims.get(animKey);
    let maxRawDim = 0;
    for (const f of anim.frames) {
      maxRawDim = Math.max(maxRawDim,
        f.frame.realWidth || f.frame.width || 0,
        f.frame.realHeight || f.frame.height || 0
      );
    }
    if (maxRawDim === 0) return null;

    return ((maxRawDim * scale) / 2) * blastScale;
  }

  // Plays the explosion animation sprite at the blast origin.
  _spawnExplosionVFX(explosionCfg, x, y) {
    const now = this.scene.time.now;
    if (!this.scene._recentExplosions) this.scene._recentExplosions = [];

    // Filter out historical records older than 200ms
    this.scene._recentExplosions = this.scene._recentExplosions.filter(e => now - e.time < 200);

    // Skip spawning if there is already an explosion within 40px in the last 200ms
    const isOverlapping = this.scene._recentExplosions.some(e => {
      const dx = e.x - x;
      const dy = e.y - y;
      return dx * dx + dy * dy < 1600; // 40px * 40px
    });

    if (isOverlapping) return;

    this.scene._recentExplosions.push({ time: now, x, y });

    const animKey = explosionCfg.animKey;
    const scale = explosionCfg.scale || 1.5;
    const anim = this.scene.anims.get(animKey);
    if (!anim || !anim.frames || !anim.frames[0]) return;
    const firstFrame = anim.frames[0].frame;

    const explosion = this.scene.add.sprite(x, y, firstFrame.texture.key, firstFrame.name);
    explosion.setScale(scale);
    explosion.setDepth(2500);
    window.SpriteFactory.playAnimation(explosion, animKey);
  }

  // In debug mode, draws a red circle showing the blast radius.
  _drawDebugBlastRadius(x, y, radius) {
    if (!window.DEBUG) return;
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0xff0000, 1);
    g.strokeCircle(x, y, radius);
    g.setDepth(500);
    this.scene.time.delayedCall(600, () => { if (g.active) g.destroy(); });
  }

  // Returns all physics bodies within the blast area.
  _collectBlastBodies(x, y, radius, sourceBomb) {
    if (!this.scene.matter?.world) return [];
    
    const Matter = Phaser.Physics.Matter.Matter;
    const bounds = {
      min: { x: x - radius, y: y - radius },
      max: { x: x + radius, y: y + radius }
    };
    
    const allBodies = this.scene.matter.world.getAllBodies() || [];
    const bodiesInBounds = Matter.Query.region(allBodies, bounds) || [];

    const bodies = bodiesInBounds.filter(body => {
      if (!body || body.isSensor) return false;
      if (body.gameObject === sourceBomb || body === sourceBomb?.body) return false;

      const label = body.label || '';
      const go = body.gameObject;

      const isTarget = label === 'player' || 
                       label === 'building' || 
                       label === 'trampoline' ||
                       label === 'tnt' ||
                       go?.isBuilding || 
                       go?.isBomb ||
                       (go && go.objectType === 'plane');

      if (!isTarget) return false;

      // Check distance to AABB to make sure it's within the circular radius
      const closest = this._closestPointOnAABB(x, y, body);
      const dx = closest.x - x;
      const dy = closest.y - y;
      return dx * dx + dy * dy <= radius * radius;
    });

    return bodies;
  }

  // Calculates falloff in [0, 1] based on the nearest point on the body's AABB.
  _calcFalloff(x, y, body, radius) {
    const closest = this._closestPointOnAABB(x, y, body);
    const dx = closest.x - x;
    const dy = closest.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= radius) return 0;
    return 1 - (dist / radius);
  }

  // Returns the nearest point on a body's axis-aligned bounding box to (px, py).
  _closestPointOnAABB(px, py, body) {
    const { min, max } = body.bounds;
    return {
      x: Math.max(min.x, Math.min(px, max.x)),
      y: Math.max(min.y, Math.min(py, max.y)),
    };
  }

  // Applies physical velocity changes and damage to affected entities.
  _applyBlastEffects(body, x, y, radius, blastForce, blastMaxDmg, sourceBomb) {
    const falloff = this._calcFalloff(x, y, body, radius);
    if (falloff <= 0) return;

    // 1. Knockback
    if (body && !body.isStatic && blastForce) {
      const mass = body.mass || 5;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : -1;
      const deltaV = (blastForce * falloff) / mass;
      const cv = body.velocity;

      Phaser.Physics.Matter.Matter.Body.setVelocity(body, {
        x: cv.x + nx * deltaV,
        y: cv.y + ny * deltaV,
      });
    }

    // 2. Damage
    const go = body.gameObject;
    if (go && go.active && !go._dying) {
      const damage = Math.round(blastMaxDmg * falloff);
      if (damage <= 0) return;

      if (window.EntityManager) {
        // Single player air superiority reward check
        if (go.objectType === 'plane' && sourceBomb && sourceBomb.owner instanceof window.Player) {
          try { window.LevelManager?.addAirSuperiorityBonus?.(500); } catch (e) { }
          try { window.UIFactory?.showFloatingText?.(this.scene, go.x, go.y, 'Air Superiority!\n+500', '#ffff00'); } catch (e) { }
        }
        window.EntityManager.damageEntity(go, damage, sourceBomb);
      }
    }
  }

  // Spawns sub-bombs when a cluster bomb explodes.
  _spawnClusterBombs(explosiveCfg, x, y, sourceBomb) {
    const cluster = explosiveCfg.cluster;
    if (!cluster) return;

    const subType   = cluster.subBomb   || 'smallBomb';
    const count     = cluster.count     || 5;
    const spreadDeg = cluster.spreadDeg || 60;
    const speed     = cluster.speed     || 180;

    // Sub-bombs launch upward in a fan pattern
    const centerAngle = -90; // straight up in screen coords
    const halfSpread  = spreadDeg / 2;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1; // -1 to +1
      const angleDeg = centerAngle + t * halfSpread + (Math.random() - 0.5) * 10;

      const bomb = window.spawnBomb(
        this.scene, subType, x, y, angleDeg, null, sourceBomb?.owner || {}
      );

      if (bomb && bomb.body) {
        const angleRad = Phaser.Math.DegToRad(angleDeg);
        const vx = (speed / 60) * Math.cos(angleRad);
        const vy = (speed / 60) * Math.sin(angleRad);

        // Adjust category and mask for 1v1 specific collision separation
        if (this.scene.player1 || this.scene.player2) {
          bomb.isBomb = true;
          bomb.body.collisionFilter.category = 0x0040; // Neutral projectile
          bomb.body.collisionFilter.mask = 0x0001 | 0x0002 | 0x0004 | 0x0008;
          if (this.scene.activeBombs) {
            this.scene.activeBombs.push(bomb);
          }
        }

        Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, { x: vx, y: vy });
      }
    }
  }
}

window.ExplosionCommand = ExplosionCommand;

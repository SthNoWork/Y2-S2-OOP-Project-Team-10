// ========================================
// GAME_LOGIC: Collision, blast, and damage coordination
// ========================================
// Handles bomb impacts, blast physics, and object damage.

window.GameLogic = {
  scene: null,
  player: null,
  buildings: [],
  _onCollision: null,

  // ========================================
  // INITIALIZATION
  // ========================================

  // Set up the scene reference and collision listener.
  init(scene, player, buildings = []) {
    // Clean up old listener if scene still exists
    if (this.scene && this._onCollision && this.scene.matter && this.scene.matter.world) {
      try {
        this.scene.matter.world.off('collisionstart', this._onCollision);
      } catch (e) {
        // Scene was destroyed, ignore error
      }
    }

    this.scene = scene;
    this.player = player;
    this.buildings = buildings;

    this._onCollision = (event) => {
      event.pairs.forEach((pair) => this.handleCollision(pair.bodyA, pair.bodyB));
    };

    this.scene.matter.world.on('collisionstart', this._onCollision);
  },

  // ========================================
  // COLLISION_HANDLING
  // ========================================

  // Detect bomb impact, apply direct damage, and spawn blast.
  handleCollision(bodyA, bodyB) {
    if (!bodyA || !bodyB) return;

    const bombBody = bodyA.label === 'bomb' ? bodyA : bodyB.label === 'bomb' ? bodyB : null;
    if (!bombBody) return;

    const otherBody = bombBody === bodyA ? bodyB : bodyA;
    // Bombs do not collide with other bombs.
    if (otherBody.label === 'bomb') return;
    
    const bombGO = bombBody.gameObject;
    if (!bombGO || !bombGO.active) return;

    const bombCfg = window.GameSceneObjectConfig?.bomb || {};
    const radius = Math.max(40, (bombCfg.blastRadiusRatio || 0.06) * this.scene.scale.width);
    const force = bombCfg.blastForce || 50;
    const directDmg = bombCfg.directHitDamage || 50;

    const otherGO = otherBody?.gameObject;
    if (otherGO) {
      if (otherGO === this.player) {
        const dead = window.PlayerState.takeDamage(directDmg);
        if (dead) this.endGame(false);
      } else if (typeof otherGO.takeDamage === 'function') {
        otherGO.takeDamage(directDmg);
      }
    }

    this.createBlastRadius(bombGO.x, bombGO.y, radius, force);

    try { bombGO.destroy(); } catch (e) {}
  },

  // ========================================
  // BLAST_MECHANICS
  // ========================================

  // Compute raw knockback magnitude from force, distance, mass, and resistance.
  computeKnockbackRaw(blastForce, falloff, objMass, objResistance) {
    const mass = objMass || 1;
    const resistance = objResistance || 1.0;
    return (blastForce * falloff) / (mass * resistance);
  },

  // Apply knockback impulse to one body and return its falloff strength.
  applyBlastToBody(body, bx, by, blastForce, radius) {
    const obj = body.gameObject;
    if (!obj || body.isStatic || obj.isBomb || body.label === 'bomb') return 0;

    const dx = body.position.x - bx;
    const dy = body.position.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= radius || dist <= 0) return 0;

    const falloff = (1 - dist / radius) ** 2;
    const mass = body.mass || 1;
    const resistance = obj.blastResistance || 1.0;
    const deltaV = this.computeKnockbackRaw(blastForce, falloff, mass, resistance);

    const nx = dx / dist;
    const ny = dy / dist;
    const velocity = obj.getVelocity();
    obj.setVelocity(velocity.x + nx * deltaV, velocity.y + ny * deltaV);

    return falloff;
  },

  // Spawn explosion visual and apply blast to all nearby bodies with damage.
  createBlastRadius(x, y, radius, force) {
    try {
      const gfx = this.scene.add.circle(x, y, Math.max(8, radius * 0.2), 0xff6600, 0.5);
      this.scene.tweens.add({
        targets: gfx,
        alpha: 0,
        scale: 2,
        duration: 300,
        onComplete: () => gfx.destroy(),
      });
    } catch (e) {}

    const bodies = this.scene.matter.intersectRect(x - radius, y - radius, radius * 2, radius * 2) || [];
    const bombCfg = window.GameSceneObjectConfig?.bomb || {};
    const blastMaxDmg = bombCfg.blastMaxDamage || 50;

    bodies.forEach((body) => {
      const obj = body.gameObject;
      if (!obj || obj.isBomb || body.label === 'bomb') return;

      const falloff = this.applyBlastToBody(body, x, y, force, radius);
      if (falloff <= 0) return;

      const damage = Math.round(blastMaxDmg * falloff);

      if (obj === this.player) {
        const dead = window.PlayerState.takeDamage(damage);
        if (dead) this.endGame(false);
      } else if (obj.buildingConfig || obj.isBuilding) {
        if (typeof obj.takeDamage === 'function') {
          obj.takeDamage(damage);
          if (obj.health <= 0) {
            try { window.BuildingManager.destroyBuilding(obj); } catch (e) {}
            this.buildings = this.buildings.filter((b) => b !== obj);
          }
        }
      }
    });
  },

  // ========================================
  // GAME_STATE
  // ========================================

  // Mark game over and log result (fires only once).
  endGame(won) {
    if (window.PlayerState.gameOver) return;

    window.PlayerState.setGameOver();
    console.log(won ? 'Level Complete!' : 'Game Over!');
  },

  // Track a building for blast queries and damage.
  addBuilding(building) {
    this.buildings.push(building);
    building.isBuilding = true;
  },
};
// ----------------------------
// Game Logic: Collisions, Damage, Events
// ----------------------------
window.GameLogic = {
  scene: null,
  player: null,
  buildings: [],
  activeBombs: [],
  _onCollision: null,

  init(scene, player, buildings = []) {
    // Remove old listener before adding a new one
    if (this.scene && this._onCollision) {
      this.scene.matter.world.off('collisionstart', this._onCollision);
    }

    this.scene = scene;
    this.player = player;
    this.buildings = buildings;
    this.activeBombs = [];

    this._onCollision = (event) => {
      event.pairs.forEach((pair) => this.handleCollision(pair.bodyA, pair.bodyB));
    };
    this.scene.matter.world.on('collisionstart', this._onCollision);
  },

  handleCollision(bodyA, bodyB) {
    if (!bodyA || !bodyB) return;

    const bombBody = bodyA.label === 'bomb' ? bodyA : bodyB.label === 'bomb' ? bodyB : null;
    if (!bombBody) return;

    const otherBody = bombBody === bodyA ? bodyB : bodyA;
    const bombGO = bombBody.gameObject;
    if (!bombGO || !bombGO.active) return;

    const bombCfg = window.GameSceneObjectConfig?.bomb || {};
    const radius = Math.max(40, (bombCfg.blastRadiusRatio || 0.06) * this.scene.scale.width);
    const force = bombCfg.blastForce || 50;
    const directDmg = bombCfg.directHitDamage || 50;

    // Direct hit damage
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
    this.removeBomb(bombGO);
  },

  // Applies velocity impulse to a single body from a blast origin.
  // Uses inverse-square falloff: close = dramatic, far = minimal.
  applyBlastToBody(body, bx, by, blastForce, radius) {
    const obj = body.gameObject;
    if (!obj || body.isStatic) return 0;

    const dx = body.position.x - bx;
    const dy = body.position.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= radius || dist <= 0) return 0;

    const t = 1 - dist / radius;
    const falloff = t * t; // inverse-square: violent at center, drops fast

    const mass = body.mass || 1;
    const resistance = obj.blastResistance || 1.0;
    const deltaV = (blastForce * falloff) / (mass * resistance);

    const nx = dx / dist;
    const ny = dy / dist;

    const cur = obj.getVelocity();
    obj.setVelocity(cur.x + nx * deltaV, cur.y + ny * deltaV);

    return falloff;
  },

  createBlastRadius(x, y, radius, force) {
    // Visual: brief explosion circle
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
      if (!obj) return;

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

  endGame(won) {
    window.PlayerState.setGameOver();
    console.log(won ? 'Level Complete!' : 'Game Over!');
  },

  addBomb(bomb) {
    this.activeBombs.push(bomb);
    if (bomb.body) bomb.body.label = 'bomb';
  },

  removeBomb(bomb) {
    const i = this.activeBombs.indexOf(bomb);
    if (i > -1) this.activeBombs.splice(i, 1);
  },

  addBuilding(building) {
    this.buildings.push(building);
    building.isBuilding = true;
  },

  removeBuilding(building) {
    const i = this.buildings.indexOf(building);
    if (i > -1) this.buildings.splice(i, 1);
  },

  getGameState() {
    return {
      playerAlive: window.PlayerState.isAlive(),
      playerHealth: window.PlayerState.health,
      buildingsCount: this.buildings.length,
      activeBombsCount: this.activeBombs.length,
    };
  },
};
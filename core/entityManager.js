// core/entityManager.js
// Central manager that tracks all active gameplay entities, processes HP updates,
// maps targets, and calculates blast area damage.

window.EntityManager = {
  scene: null,
  player: null,       // Single player mode player
  player1: null,      // 1v1 player 1
  player2: null,      // 1v1 player 2
  
  buildings: [],      // Placed buildings
  attackers: [],      // Active attacking entities (pillboxes, mortars, planes)
  bombs: [],          // Active bombs currently in the air
  
  _chainExplosionQueue: [],

  init(scene) {
    this.scene = scene;
    this.player = null;
    this.player1 = null;
    this.player2 = null;
    this.buildings = [];
    this.attackers = [];
    this.bombs = [];
    this._chainExplosionQueue = [];

    // Auto cleanup on scene shutdown
    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  },

  registerEntity(entity) {
    if (!entity) return;

    if (entity instanceof window.Player) {
      if (this.scene && (this.scene.player1 || this.scene.player2)) {
        if (entity === this.scene.player1) this.player1 = entity;
        else if (entity === this.scene.player2) this.player2 = entity;
      } else {
        this.player = entity;
      }
    } else if (entity instanceof window.Attacker) {
      if (!this.attackers.includes(entity)) {
        this.attackers.push(entity);
      }
    } else if (entity instanceof window.Building) {
      if (!this.buildings.includes(entity)) {
        this.buildings.push(entity);
      }
    } else if (entity.isBomb || entity.objectType === 'bomb' || entity.objectType === 'smallBomb') {
      if (!this.bombs.includes(entity)) {
        this.bombs.push(entity);
      }
    }
  },

  unregisterEntity(entity) {
    if (!entity) return;

    if (entity === this.player) this.player = null;
    if (entity === this.player1) this.player1 = null;
    if (entity === this.player2) this.player2 = null;

    this.buildings = this.buildings.filter(b => b !== entity);
    this.attackers = this.attackers.filter(a => a !== entity);
    this.bombs = this.bombs.filter(b => b !== entity);
  },

  getNearestTarget(x, y) {
    // Determine target based on game mode
    if (this.player1 || this.player2) {
      // 1v1 mode: target player on opposite side of screen
      if (x < 960) return this.player2;
      return this.player1;
    }
    
    // Single player mode
    return this.player;
  },

  damageEntity(entity, damage, sourceBomb) {
    if (!entity || !entity.active || entity._dying) return;
    entity.takeDamage(damage);
  },

  queueChainExplosion(explosionData) {
    this._chainExplosionQueue.push(explosionData);
  },

  update(delta) {
    // Process queued chain explosions (from TNT, crates, player, etc.)
    this._processChainExplosions();

    // Sync all entity HP labels
    const allDestructibles = [this.player, this.player1, this.player2, ...this.buildings, ...this.attackers].filter(Boolean);
    for (const entity of allDestructibles) {
      if (entity.active) {
        entity.updateHpLabel();
      }
    }

    // Clean up bombs that go off screen
    this._updateBombs();
  },

  _processChainExplosions() {
    if (this._chainExplosionQueue.length === 0) return;

    const queue = [...this._chainExplosionQueue];
    this._chainExplosionQueue = [];

    queue.forEach(item => {
      // Small randomized delay before detonation for chain feel
      this.scene.time.delayedCall(50 + Math.random() * 120, () => {
        const cmd = new window.ExplosionCommand(this.scene, {
          x: item.x,
          y: item.y,
          explosiveCfg: item.cfg,
          sourceBomb: item.sourceBomb
        });
        cmd.execute();
      });
    });
  },

  _updateBombs() {
    if (this.bombs.length === 0) return;

    const arena = window.GameLogic?.arena || this.scene.arena || { ARENA_Y: 81, ARENA_H: 972 };
    const bottom = arena.ARENA_Y + arena.ARENA_H;

    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      if (!bomb || !bomb.active) continue;

      const isOffScreen = bomb.x < -1000 || bomb.x > 2920 || bomb.y < -2000;
      if (bomb.y >= bottom || isOffScreen) {
        if (bomb.y >= bottom) {
          // Explode on ground contact
          const bombCfg = window.ObjectConfig.internalTypes[bomb.objectType] || window.ObjectConfig.internalTypes.bomb;
          try { this.scene.events.emit('bomb:explode', bomb); } catch (e) { }
          try {
            const cmd = new window.ExplosionCommand(this.scene, {
              x: bomb.x,
              y: bomb.y,
              explosiveCfg: bombCfg,
              sourceBomb: bomb
            });
            cmd.execute();
          } catch (e) { }
          try { this.scene.events.emit('bomb:destroy', bomb); } catch (e) { }
          try { bomb.destroy(); } catch (e) { }
        } else {
          // Reclaim silently
          try { this.scene.events.emit('bomb:destroy', bomb); } catch (e) { }
          try { bomb.destroy(); } catch (e) { }
        }
      }
    }
  },

  _barrageActive: false,
  _barrageTimers: [],

  startBarrage(opts = {}) {
    const fireRateMs = opts.fireRateMs ?? 40;
    const bombType = opts.bombType ?? 'bomb';
    const spread = opts.spread ?? 15;
    const bombCount = opts.bombCount ?? Math.floor((opts.durationMs ?? 2000) / fireRateMs);

    let launchPositions = [];
    for (const m of this.attackers) {
      if (m.active && m.objectType === 'mortar') {
        launchPositions.push({ x: m.x, y: m.y, obj: m });
      }
    }
    if (launchPositions.length === 0) {
      const arena = this.scene.arena || window.GameLogic?.arena || { ARENA_Y: 81, ARENA_H: 972 };
      const groundY = (arena.ARENA_Y + arena.ARENA_H - 50);
      launchPositions = [
        { x: -80, y: groundY, obj: null },
        { x: 2000, y: groundY, obj: null },
      ];
    }

    this._barrageActive = true;
    let fired = 0;

    const timer = this.scene.time.addEvent({
      delay: fireRateMs,
      callback: () => {
        if (fired >= bombCount) {
          timer.remove();
          this._barrageActive = false;
          return;
        }

        const pos = launchPositions[Math.floor(Math.random() * launchPositions.length)];
        const target = this.getNearestTarget(pos.x, pos.y);
        if (!target || !target.active) {
          fired++;
          return;
        }

        let spawnX = pos.x;
        let spawnY = pos.y;
        if (pos.obj && pos.obj.active) {
          const safePos = window.GameLogicHelper.getSafeSpawnPosition(pos.obj, target, 0.8);
          spawnX = safePos.x;
          spawnY = safePos.y;
        }

        const dx = target.x - spawnX;
        const dy = target.y - spawnY;

        window.GameLogicHelper.fireHighArcBomb(this.scene, {
          bombType,
          spawnX,
          spawnY,
          dx,
          dy,
          target,
          owner: pos.obj || {},
          spreadAngleDeg: spread,
          speedSpreadRatio: 0.15,
          minAngleDeg: 75
        });

        fired++;
      },
      loop: true
    });

    this._barrageTimers.push(timer);
  },

  stopBarrage() {
    for (const t of this._barrageTimers) {
      try { t.remove(); } catch (e) {}
    }
    this._barrageTimers = [];
    this._barrageActive = false;
  },

  destroy() {
    this.stopBarrage();
    this.player = null;
    this.player1 = null;
    this.player2 = null;
    this.buildings = [];
    this.attackers = [];
    this.bombs = [];
    this._chainExplosionQueue = [];
    this.scene = null;
  }
};

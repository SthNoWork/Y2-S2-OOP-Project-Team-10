// core/mortarManager.js
// Manages mortar enemies and the mortar_barrage level type.
//
// Two modes:
//  1. Pre-placed mortars: registered via registerMortar(), fires when startShooting() is called.
//  2. Barrage-level mode: called by LevelManager for levelType === 'mortar_barrage'.
//     Fires from fixed off-screen positions with configurable fire rate and duration.

window.MortarManager = {
  _mortars: [],
  _barrageTimers: [],
  _barrageActive: false,
  scene: null,
  arena: null,

  init(scene, arena) {
    this.scene = scene;
    this.arena = arena;
    this._mortars = [];
    this._barrageTimers = [];
    this._barrageActive = false;
  },

  // ── Pre-placed mortar registration ──────────────────────────────────────────

  registerMortar(mortarObj) {
    if (!this._mortars.includes(mortarObj)) {
      this._mortars.push(mortarObj);
    }
  },

  unregisterMortar(mortarObj) {
    this._mortars = this._mortars.filter(m => m !== mortarObj);
  },

  // ── Mode 1: Pre-placed mortar barrage (existing behaviour) ─────────────────

  // Triggered by LevelManager at the start of a wave
  startShooting() {
    for (const mortar of this._mortars) {
      if (!mortar.active || mortar._dying) continue;
      this._shootBarrage(mortar);
    }
  },

  _shootBarrage(mortar) {
    const cfg = window.ObjectConfig.internalTypes.mortar;
    const count = cfg.barrageCount || 30;
    const spread = cfg.accuracySpread || 15;
    const bombType = cfg.bomb || 'bomb';

    const target = window.GameLogic.player;
    if (!target || !target.active) return;

    let fired = 0;
    const fireInterval = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        if (!mortar.active || mortar._dying) {
          fireInterval.remove();
          return;
        }

        // Re-target each shot at the player's CURRENT position
        const curTarget = window.GameLogic.player;
        if (!curTarget || !curTarget.active) {
          fired++;
          if (fired >= count) fireInterval.remove();
          return;
        }

        const { x: spawnX, y: spawnY } = window.GameLogicHelper.getSafeSpawnPosition(mortar, curTarget, 0.8);
        const dx = curTarget.x - spawnX;
        const dy = curTarget.y - spawnY;

        window.GameLogicHelper.fireHighArcBomb(this.scene, {
          bombType,
          spawnX,
          spawnY,
          dx,
          dy,
          target: curTarget,
          owner: mortar,
          spreadAngleDeg: spread,
          speedSpreadRatio: 0.15,
          minAngleDeg: 75
        });

        fired++;
        if (fired >= count) {
          fireInterval.remove();
        }
      },
      loop: true
    });
  },


  // ── Mode 2: Barrage-level mode (mortar_barrage levelType) ──────────────────
  //
  // Called by LevelManager._fireNextWave() for mortar_barrage levels.
  // Spawns bombs from off-screen mortar positions towards the player.
  //
  // opts = {
  //   fireRateMs:  delay between bombs in ms   (default 40)
  //   durationMs:  total firing window in ms    (default 2000)
  //   bombCount:   exact number of bombs        (overrides durationMs if set)
  //   bombType:    bomb config key               (default 'bomb')
  //   spread:      angle randomness in degrees  (default 15)
  // }

  startBarrageLevel(opts = {}) {
    const fireRateMs = opts.fireRateMs ?? 40;
    const bombType = opts.bombType ?? 'bomb';
    const spread = opts.spread ?? 15;

    // Calculate bomb count: explicit count OR derived from duration/fireRate
    const bombCount = opts.bombCount ?? Math.floor((opts.durationMs ?? 2000) / fireRateMs);

    // Mortar launch positions: use pre-placed mortars if any,
    // otherwise create virtual positions at both screen edges.
    let launchPositions = [];
    for (const m of this._mortars) {
      if (m.active && !m._dying) {
        launchPositions.push({ x: m.x, y: m.y, obj: m });
      }
    }
    if (launchPositions.length === 0) {
      // Virtual mortar positions at screen edges
      const groundY = this.arena ? (this.arena.ARENA_Y + this.arena.ARENA_H - 50) : 900;
      launchPositions = [
        { x: -80, y: groundY, obj: null },
        { x: 2000, y: groundY, obj: null },
      ];
    }

    this._barrageActive = true;
    this._stopBarrageTimers();

    let fired = 0;

    const timer = this.scene.time.addEvent({
      delay: fireRateMs,
      callback: () => {
        if (fired >= bombCount) {
          timer.remove();
          this._barrageActive = false;
          return;
        }

        // Pick a random launch position
        const pos = launchPositions[Math.floor(Math.random() * launchPositions.length)];

        // Target the player
        const target = window.GameLogic.player;
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
      loop: true,
    });

    this._barrageTimers.push(timer);
  },

  _stopBarrageTimers() {
    for (const t of this._barrageTimers) {
      try { t.remove(); } catch (e) { }
    }
    this._barrageTimers = [];
  },

  update(delta) {
    // Intentionally empty — uses Phaser timers
  },
};

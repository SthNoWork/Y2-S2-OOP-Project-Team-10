// core/pillboxManager.js
// Manages all active pillbox enemies using Phaser timers for robust execution.

window.PillboxManager = {

  _scene: null,
  _pillboxes: [],     // array of { gameObject, bombType, cfg, timerEvent }
  _shooting: false,

  // ── Public API ──────────────────────────────────────────────────────────────

  init(scene) {
    this.destroy();
    this._scene = scene;
    this._pillboxes = [];
    this._shooting = false;

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  },

  registerPillbox(gameObject, prePlacedEntry) {
    const cfg = window.ObjectConfig.internalTypes.pillbox;
    if (!cfg) return;

    const bombType = prePlacedEntry?.bomb || cfg.bomb || 'smallBomb';

    this._pillboxes.push({
      gameObject,
      bombType,
      cfg,
      timerEvent: null
    });
  },

  unregisterPillbox(gameObject) {
    for (const p of this._pillboxes) {
      if (p.gameObject === gameObject) {
        if (p.timerEvent) p.timerEvent.destroy();
      }
    }
    this._pillboxes = this._pillboxes.filter(p => p.gameObject !== gameObject);
  },

  startShooting() {
    this._shooting = true;
    for (const p of this._pillboxes) {
      this._scheduleNextShot(p, true);
    }
  },

  stopShooting() {
    this._shooting = false;
    for (const p of this._pillboxes) {
      if (p.timerEvent) {
        p.timerEvent.destroy();
        p.timerEvent = null;
      }
    }
  },

  update(delta) {
    // Left intentionally blank - now using Phaser timers
  },

  destroy() {
    this.stopShooting();
    this._pillboxes = [];
    this._scene = null;
  },

  // ── Internal ────────────────────────────────────────────────────────────────

  _scheduleNextShot(p, immediate = false) {
    if (!this._shooting || !this._scene) return;

    let delay = 100;
    if (!immediate) {
      // User requested very fast shooting frequency
      delay = 400 + Math.random() * 400; // 0.4s to 0.8s
    }

    p.timerEvent = this._scene.time.addEvent({
      delay: delay,
      callback: () => {
        if (!p.gameObject?.active || p.gameObject._dying) return;
        this._fireBomb(p);
        this._scheduleNextShot(p, false);
      }
    });
  },

  _fireBomb(pillboxEntry) {
    const { gameObject, bombType, cfg } = pillboxEntry;
    const scene = this._scene;
    if (!scene || !gameObject?.active) return;

    const target = window.GameLogic?.getTarget?.(gameObject.x, gameObject.y);
    if (!target || !target.active) return;

    // 1. Calculate rough angle to target just to position the spawn point safely outside
    const { x: spawnX, y: spawnY } = window.GameLogicHelper.getSafeSpawnPosition(gameObject, target, 0.75);

    // 2. Now calculate perfect ballistic trajectory from the EXACT spawn point!
    const dx = target.x - spawnX;
    const dy = target.y - spawnY;

    // 3. Force angle to be at least 75 degrees, and compute required launch speed and angle
    const inaccuracyAngle = cfg?.inaccuracy?.angleDeg ?? 5;

    window.GameLogicHelper.fireHighArcBomb(scene, {
      bombType,
      spawnX,
      spawnY,
      dx,
      dy,
      target,
      owner: gameObject,
      spreadAngleDeg: inaccuracyAngle,
      speedSpreadRatio: 0.15,
      minAngleDeg: 75,
      logPrefix: 'Pillbox Shoot'
    });
  },
};

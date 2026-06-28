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
    if (gameObject && gameObject._weaponTimer) {
      try { gameObject._weaponTimer.destroy(); } catch (e) {}
      gameObject._weaponTimer = null;
    }
    this._pillboxes = this._pillboxes.filter(p => p.gameObject !== gameObject);
  },

  startShooting() {
    this._shooting = true;
    for (const p of this._pillboxes) {
      if (p.gameObject && typeof p.gameObject.activate === 'function') {
        const target = window.GameLogic?.getTarget?.(p.gameObject.x, p.gameObject.y);
        p.gameObject.activate(target);
      }
    }
  },

  stopShooting() {
    this._shooting = false;
    for (const p of this._pillboxes) {
      if (p.gameObject && p.gameObject._weaponTimer) {
        try { p.gameObject._weaponTimer.destroy(); } catch (e) {}
        p.gameObject._weaponTimer = null;
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
};

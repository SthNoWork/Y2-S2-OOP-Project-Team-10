// core/barrageController.js
// Handles virtual mortar barrages for campaign wave levels.

window.BarrageController = {
  _barrageActive: false,
  _barrageTimers: [],

  startBarrage(scene, opts = {}) {
    const fireRateMs = opts.fireRateMs ?? 40;
    const bombType = opts.bombType ?? 'bomb';
    const spread = opts.spread ?? 15;
    const bombCount = opts.bombCount ?? Math.floor((opts.durationMs ?? 2000) / fireRateMs);

    let launchPositions = [];
    if (window.EntityManager) {
      for (const m of window.EntityManager.attackers) {
        if (m.active && m.objectType === 'mortar') {
          launchPositions.push({ x: m.x, y: m.y, obj: m });
        }
      }
    }
    if (launchPositions.length === 0) {
      const arena = scene.arena || window.GameLogic?.arena || { ARENA_Y: 81, ARENA_H: 972 };
      const groundY = (arena.ARENA_Y + arena.ARENA_H - 50);
      launchPositions = [
        { x: -80, y: groundY, obj: null },
        { x: 2000, y: groundY, obj: null },
      ];
    }

    this._barrageActive = true;
    let fired = 0;

    const timer = scene.time.addEvent({
      delay: fireRateMs,
      callback: () => {
        if (fired >= bombCount) {
          timer.remove();
          this._barrageActive = false;
          return;
        }

        const pos = launchPositions[Math.floor(Math.random() * launchPositions.length)];
        const target = window.EntityManager?.getNearestTarget(pos.x, pos.y);
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

        window.GameLogicHelper.fireHighArcBomb(scene, {
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
  }
};

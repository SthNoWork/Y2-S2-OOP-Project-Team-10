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
    const roughAngleRad = Math.atan2(target.y - gameObject.y, target.x - gameObject.x);
    const spawnDist = Math.max(gameObject.displayWidth || 120, gameObject.displayHeight || 80) * 0.75;
    const spawnX = gameObject.x + Math.cos(roughAngleRad) * spawnDist;
    const spawnY = gameObject.y + Math.sin(roughAngleRad) * spawnDist;

    // 2. Now calculate perfect ballistic trajectory from the EXACT spawn point!
    const dx = target.x - spawnX;
    const dy = target.y - spawnY;

    const bombCfg = window.ObjectConfig.internalTypes[bombType] || window.ObjectConfig.internalTypes.smallBomb;

    // Get world gravity
    const gravityObj = scene.matter?.world?.localWorld?.gravity || scene.matter?.world?.engine?.gravity;
    const worldGravity = (gravityObj && gravityObj.y !== undefined && gravityObj.scale !== undefined)
      ? (gravityObj.y * gravityObj.scale * 1000000)
      : 1000;
    const g = bombCfg?.gravity !== undefined ? bombCfg.gravity : worldGravity;

    // 3. Force angle to be at least 75 degrees, and compute required launch speed and angle
    const { speed: solvedSpeed, angleDeg: solvedAngle } = window.GameLogicHelper.solveHighArcSpeedAndAngle(dx, dy, g, 75);
    let speed = solvedSpeed;
    let baseAngleDeg = solvedAngle;

    // Spattering Randomization
    // 1. Randomize angle by +/- 5 degrees (if not specified in config)
    const inaccuracyAngle = cfg?.inaccuracy?.angleDeg ?? 5;
    const angleOffset = (Math.random() * 2 - 1) * inaccuracyAngle;
    baseAngleDeg += angleOffset;

    // 2. Randomize speed by +/- 15% for distance spattering
    const speedMultiplier = 1 + ((Math.random() * 2 - 1) * 0.15);
    speed *= speedMultiplier;

    const bomb = window.spawnBomb(scene, bombType, spawnX, spawnY, baseAngleDeg, target, gameObject);
    if (bomb) {
      bomb.owner = gameObject;

      // Override velocity with our precisely computed speed
      if (bomb.body) {
        const vx = (speed / 60) * Math.cos(Phaser.Math.DegToRad(baseAngleDeg));
        const vy = (speed / 60) * Math.sin(Phaser.Math.DegToRad(baseAngleDeg));
        Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, { x: vx, y: vy });

        // CRITICAL FIX: Matter.js has air friction by default, which drastically slows down the 
        // bomb mid-air and completely breaks the perfect ballistic trajectory math!
        // We must remove air friction for this projectile so it flies in a true vacuum parabola.
        bomb.body.frictionAir = 0;

        console.log(`[Pillbox Shoot] ID: ${bomb.body.id} | Spawn: (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}) | Target at shoot: (${target.x.toFixed(1)}, ${target.y.toFixed(1)}) | Velocity: (${vx.toFixed(2)}, ${vy.toFixed(2)})`);
      }
    }
  },
};

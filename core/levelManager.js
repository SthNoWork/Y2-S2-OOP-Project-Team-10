// core/levelManager.js
// Controls level loading, wave sequencing, HUD updates, and win/lose screens.
// End-of-round overlay drawing is delegated to HUDFactory. Implements the Singleton pattern.

class LevelManager {
  #scene = null;
  #arena = null;
  #levelNum = 1;
  #levelCfg = null;

  #state = 'idle';
  #waveIndex = 0;
  #countdownMs = 0;
  #screenShown = false;

  #waveText = null;
  #healthText = null;

  #platforms = [];
  #prePlaced = [];

  #progressKey = 'bts_unlocked_level';
  #airSuperiorityBonus = 0;

  static #instance = null;
  static getInstance() {
    if (!LevelManager.#instance) {
      LevelManager.#instance = new LevelManager();
    }
    return LevelManager.#instance;
  }

  get scene() { return this.#scene; }
  get arena() { return this.#arena; }
  get levelNum() { return this.#levelNum; }
  get levelCfg() { return this.#levelCfg; }
  get _prePlaced() { return [...this.#prePlaced]; }
  get airSuperiorityBonus() { return this.#airSuperiorityBonus; }
  set airSuperiorityBonus(val) { this.#airSuperiorityBonus = val; }

  load(scene, arena, levelNum) {
    this.#scene = scene;
    this.#arena = arena;
    this.#levelNum = levelNum;
    this.#levelCfg = window.Levels?.[levelNum] ?? this._fallbackConfig();

    this._resetLevelState();
    this._applyAllowedBuildings();
    this._createPlatforms();

    const spawn = this.#levelCfg.playerSpawn ?? { x: 960, y: 810 };

    // Get the equipped skin from GameData
    const equippedSkin = window.GameData?.getEquippedSkin?.() || 'skin_1';

    // Use happy variant as starting skin for skin_1 and skin_3
    const startSkin = equippedSkin === 'skin_1' ? 'skin_1_happy'
                    : equippedSkin === 'skin_3' ? 'skin_3_happy'
                    : equippedSkin;

    const player = window.ObjectFactory.createInternal(
      scene, 'player', spawn.x, spawn.y, arena, { skinKey: startSkin }
    );

    // Store equipped skin on player for reference
    player._equippedSkin = equippedSkin;

    window.GameLogic.init(scene, player, arena);

    // Call preplaced creation AFTER GameLogic.init so that preplaced objects are not cleared from GameLogic.buildings!
    this._createPrePlacedObjects();

    this.#healthText = window.UIFactory.addHealthText(scene, arena);
    this.#waveText = this._createWaveText();

    return player;
  }

  _resetLevelState() {
    this.#state = 'idle';
    this.#waveIndex = 0;
    this.#countdownMs = 0;
    this.#screenShown = false;
    this.#platforms = [];
    this.#prePlaced = [];
    this.#waveText = null;
    this.#healthText = null;
    this.#airSuperiorityBonus = 0;
  }

  _applyAllowedBuildings() {
    const allowed = this.#levelCfg.allowedBuildings || {};

    Object.entries(allowed).forEach(([type, cap]) => {
      const cfg = window.ObjectConfig.placeableTypes[type];
      if (cfg) cfg.maxCount = cap;
    });
  }

  _createPlatforms() {
    const platforms = this.#levelCfg.platforms || [];

    if (platforms.length === 0) {
      platforms.push({
        x: this.#arena.ARENA_X + this.#arena.ARENA_W * 0.5,
        y: 936,
        w: 1382,
        h: 24,
      });
      this.#levelCfg.platforms = platforms;
    }

    platforms.forEach((p) => {
      const platform = this.#scene.add.rectangle(p.x, p.y, p.w, p.h, 0x888888);

      const frictionMult = window.ObjectConfig.globalFrictionMultiplier ?? 3.0;
      const staticFrictionMult = window.ObjectConfig.globalStaticFrictionMultiplier ?? 3.0;

      this.#scene.matter.add.gameObject(platform, {
        label: 'platform',
        isStatic: true,
        friction: 1.0 * frictionMult,
        frictionStatic: 10 * staticFrictionMult,
      });

      this.#platforms.push(platform);
    });
  }

  _createPrePlacedObjects() {
    (this.#levelCfg.prePlaced || []).forEach((e) => {
      const obj = window.ObjectFactory.createLevelObject(
        this.#scene, e.type, e.x, e.y, this.#arena
      );
      if (obj) {
        this.#prePlaced.push(obj);
      }
    });
  }

  _fallbackConfig() {
    return {
      playerSpawn: { x: 960, y: 810 },
      platforms: [],
      prePlaced: [],
      allowedBuildings: {},
      waves: [{ speed: 300, direction: 1, x: -100, y: 100 }],
    };
  }

  update(delta) {
    this._refreshHUD();

    if (window.GameLogic.gameOver &&
      this.#state !== 'won' &&
      this.#state !== 'lost') {
      this.#state = 'lost';
    }

    switch (this.#state) {
      case 'running': this._tickRunning(delta); break;
      case 'waiting': this._tickWaiting(); break;
      case 'won': this._tickWon(); break;
      case 'lost': this._tickLost(); break;
    }
  }

  _tickRunning(delta) {
    this.#countdownMs -= delta;
    if (this.#countdownMs > 0) return;

    const wavesRemaining = this.#waveIndex < this.#levelCfg.waves.length;

    if (wavesRemaining) {
      this._fireNextWave();
      this.#countdownMs = this.#levelCfg.waveDelayMs ?? 3000;
    } else {
      this.#state = 'waiting';
    }
  }

  _tickWaiting() {
    const planeActive = !!(window.EntityManager?.attackers?.some(a => a instanceof window.Plane && a.active));
    const mortarActive = !!window.BarrageController?._barrageActive;
    const bombsExist = window.GameLogicHelper?.hasActiveBombs?.(this.#scene);
    const weaponsActive = window.GameLogicHelper?.anyWeaponHasAmmo?.(this.#scene);
    if (!planeActive && !mortarActive && !bombsExist && !weaponsActive) this.#state = 'won';
  }

  _tickWon() {
    if (!this.#screenShown) {
      this.#screenShown = true;
      this._showWinScreen();
    }
  }

  _tickLost() {
    if (!this.#screenShown) {
      this.#screenShown = true;
      this._showLoseScreen();
    }
  }

  startLevelWave() {
    if (this.#state === 'idle') {
      this.#state = 'running';
      this.#countdownMs = 0; // Trigger wave immediately
      window.BuildingManager.lockPlacement();
    }
  }

  _fireNextWave() {
    const wave = this.#levelCfg.waves[this.#waveIndex];
    if (!wave) return;

    const levelType = this.#levelCfg.levelType;

    if (levelType === 'mortar_barrage') {
      const mb = this.#levelCfg.mortarBarrage || {};
      try {
        if (window.BarrageController) {
          window.BarrageController.startBarrage(this.#scene, {
            fireRateMs: mb.fireRateMs ?? 40,
            durationMs: mb.durationMs ?? 2000,
            bombType: mb.bombType ?? 'bomb',
            spread: mb.spread ?? 15,
            bombCount: mb.bombCount,
          });
        }
      } catch (e) { console.error('[LevelManager] mortar_barrage error:', e); }
    } else {
      window.GameLogic.startBombingRun(
        wave.speed,
        { x: wave.x, y: wave.y },
        wave.direction,
        wave.bomb
      );
    }

    this.#waveIndex++;
    this._refreshHUD();
  }

  _createWaveText() {
    return this.#scene.add.text(
      this.#arena.ARENA_X + this.#arena.ARENA_W * 0.5,
      this.#arena.ARENA_Y + 11,
      'Press Start',
      { fontSize: '32px', fill: '#ffffff' }
    ).setOrigin(0.5).setDepth(100);
  }

  _refreshHUD() {
    if (this.#healthText) {
      const hp = Math.max(0, Math.round(window.GameLogic.player?.health ?? 0));
      this.#healthText.setText(`HP: ${hp}`);
    }

    if (this.#waveText) {
      const total = this.#levelCfg?.waves?.length ?? 0;
      const current = Math.min(this.#waveIndex, total);
      this.#waveText.setText(this._waveStatusLabel(current, total));
    }
  }

  _waveStatusLabel(current, total) {
    switch (this.#state) {
      case 'idle': return 'Press Start';
      case 'waiting': return 'Last wave…';
      case 'won': return 'Level clear!';
      case 'lost': return 'Eliminated';
      default: return `Wave ${current} / ${total}`;
    }
  }

  addAirSuperiorityBonus(points) {
    this.#airSuperiorityBonus += points;
  }

  _showWinScreen() {
    this._unlockNextLevel(this.#levelNum);

    const { objectScore, playerBonus, total } = this._calculateScore();

    window.FirebaseStore?.recordWin(this.#levelNum, total);

    const hp = Math.max(0, Math.round(window.GameLogic.player?.health ?? 0));
    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    const currentLevel = parseInt(this.#levelNum, 10) || 1;
    const hasNext = !!(window.Levels?.[currentLevel + 1]?.waves?.length);

    window.HUDFactory.showWinScreen(this.#scene, this.#arena, {
      levelNum: currentLevel,
      totalWaves: this.#levelCfg.waves.length,
      hp,
      maxHp,
      objectScore,
      playerBonus,
      total,
      onNext: hasNext ? () => { window._currentLevel = currentLevel + 1; window.startScene('GameScene'); } : null,
      onLevels: () => window.startScene('LevelSelectScene'),
    });
  }

  _showLoseScreen() {
    window.HUDFactory.showLoseScreen(this.#scene, this.#arena, {
      levelNum: this.#levelNum,
      wavesSurvived: Math.max(0, this.#waveIndex - 1),
      totalWaves: this.#levelCfg.waves.length,
      onRetry: () => window.startScene('GameScene'),
      onLevels: () => window.startScene('LevelSelectScene'),
    });
  }

  _calculateScore() {
    const allowed = this.#levelCfg.allowedBuildings || {};
    let objectScore = 0;

    for (const [type, cap] of Object.entries(allowed)) {
      const cfg = window.ObjectConfig.placeableTypes[type];
      if (!cfg) continue;

      const total = window.BuildingManager._totalPlacedCounts[type] || 0;
      const neverPlaced = Math.max(0, cap - total);
      objectScore += neverPlaced * cfg.health * 10;
    }

    for (const b of window.BuildingManager.getPlacedBuildings()) {
      if (b.active && typeof b.health === 'number') {
        objectScore += Math.max(0, b.health) * 10;
      }
    }

    const playerHp = window.GameLogic.player?.health ?? 0;
    const baseMax = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    
    const survivalBonus = playerHp > 0 ? 1000 : 0;
    const hpBonus = playerHp > 0 ? Math.round((playerHp / baseMax) * 500) : 0;
    const bonus = survivalBonus + hpBonus + this.#airSuperiorityBonus;

    return {
      objectScore: Math.round(objectScore),
      playerBonus: bonus,
      total: Math.round(objectScore) + bonus,
    };
  }

  getMaxUnlockedLevel() {
    if (window.DEBUG) return this._getTotalLevels();

    if (window.FirebaseAuth?.currentUser) {
      const total = this._getTotalLevels();
      let max = 1;
      for (let i = 1; i <= total; i++) {
        if (window.GameData?.isLevelBeaten(i)) {
          max = Math.min(i + 1, total);
        } else {
          break;
        }
      }
      return max;
    }

    let unlocked = 1;
    try {
      const stored = parseInt(localStorage.getItem(this.#progressKey), 10);
      if (Number.isFinite(stored) && stored >= 1) unlocked = stored;
    } catch (err) { }
    return Math.min(Math.max(1, unlocked), this._getTotalLevels());
  }

  isLevelUnlocked(levelNum) {
    return levelNum <= this.getMaxUnlockedLevel();
  }

  _unlockNextLevel(currentLevel) {
    if (window.DEBUG) return;

    if (window.FirebaseAuth?.currentUser) return;

    const total = this._getTotalLevels();
    const target = Math.min(total, (currentLevel || 1) + 1);
    if (target > this.getMaxUnlockedLevel()) {
      try {
        localStorage.setItem(this.#progressKey, String(target));
      } catch (err) { }
    }
  }

  _getTotalLevels() {
    return Object.keys(window.Levels ?? {}).length || 1;
  }
}

window.LevelManager = LevelManager.getInstance();
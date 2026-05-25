// core/levelManager.js
// Controls level loading, wave sequencing, HUD updates, and win/lose screens.
// End-of-round overlay drawing is delegated to HUDFactory.

window.LevelManager = {

  scene: null,
  arena: null,
  levelNum: 1,
  levelCfg: null,

  _state: 'idle',
  _waveIndex: 0,
  _countdownMs: 0,
  _screenShown: false,

  _waveText: null,
  _healthText: null,

  _platforms: [],
  _prePlaced: [],

  // ── Progress / unlock ─────────────────────────────────────────────────────

  _progressKey: 'bts_unlocked_level',

  _getTotalLevels() {
    return Object.keys(window.Levels ?? {}).length || 1;
  },

  getMaxUnlockedLevel() {
    if (window.DEBUG) return this._getTotalLevels();

    // When logged in, derive unlock status from beaten levels in the server cache
    // so progress syncs across devices.
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

    // Logged out — fall back to localStorage as before.
    let unlocked = 1;
    try {
      const stored = parseInt(localStorage.getItem(this._progressKey), 10);
      if (Number.isFinite(stored) && stored >= 1) unlocked = stored;
    } catch (err) { /* private mode / storage disabled */ }
    return Math.min(Math.max(1, unlocked), this._getTotalLevels());
  },

  isLevelUnlocked(levelNum) {
    return levelNum <= this.getMaxUnlockedLevel();
  },

  _unlockNextLevel(currentLevel) {
    if (window.DEBUG) return;

    // Firebase tracks unlock state for logged-in users via beaten level scores,
    // so localStorage only needs updating for logged-out players.
    if (window.FirebaseAuth?.currentUser) return;

    const total  = this._getTotalLevels();
    const target = Math.min(total, (currentLevel || 1) + 1);
    if (target > this.getMaxUnlockedLevel()) {
      try {
        localStorage.setItem(this._progressKey, String(target));
      } catch (err) { /* private mode / storage disabled */ }
    }
  },

  load(scene, arena, levelNum) {
    this.scene = scene;
    this.arena = arena;
    this.levelNum = levelNum;
    this.levelCfg = window.Levels?.[levelNum] ?? this._fallbackConfig();

    this._resetLevelState();
    this._applyAllowedBuildings();
    this._createPlatforms();
    this._createPrePlacedObjects();

    const spawn = this.levelCfg.playerSpawn ?? { x: 960, y: 810 };
    const player = window.ObjectFactory.createInternal(
      scene, 'player', spawn.x, spawn.y, arena
    );

    window.GameLogic.init(scene, player, arena);

    this._healthText = window.UIFactory.addHealthText(scene, arena);
    this._waveText = this._createWaveText();

    return player;
  },

  _resetLevelState() {
    this._state = 'idle';
    this._waveIndex = 0;
    this._countdownMs = 0;
    this._screenShown = false;
    this._platforms = [];
    this._prePlaced = [];
    this._waveText = null;
    this._healthText = null;
  },

  update(delta) {
    this._refreshHUD();

    if (window.GameLogic.gameOver &&
        this._state !== 'won' &&
        this._state !== 'lost') {
      this._state = 'lost';
    }

    switch (this._state) {
      case 'running': this._tickRunning(delta); break;
      case 'waiting': this._tickWaiting(); break;
      case 'won': this._tickWon(); break;
      case 'lost': this._tickLost(); break;
    }
  },

  _tickRunning(delta) {
    this._countdownMs -= delta;
    if (this._countdownMs > 0) return;

    const wavesRemaining =
      this._waveIndex < this.levelCfg.waves.length;

    if (wavesRemaining) {
      this._fireNextWave();
      this._countdownMs = this.levelCfg.waveDelayMs ?? 3000;
    } else {
      this._state = 'waiting';
    }
  },

  _tickWaiting() {
    if (!window.GameLogic._run) this._state = 'won';
  },

  _tickWon() {
    if (!this._screenShown) {
      this._screenShown = true;
      this._showWinScreen();
    }
  },

  _tickLost() {
    if (!this._screenShown) {
      this._screenShown = true;
      this._showLoseScreen();
    }
  },

  startWave() {
    if (this._state !== 'idle') return;

    window.BuildingManager.lockPlacement();

    this._fireNextWave();
    this._state =
      this._waveIndex < this.levelCfg.waves.length ? 'running' : 'waiting';

    this._countdownMs = this.levelCfg.waveDelayMs ?? 3000;
  },

  _fireNextWave() {
    const waves = this.levelCfg.waves;
    if (!waves?.length || this._waveIndex >= waves.length) return;

    const wave = waves[this._waveIndex];

    window.GameLogic.startBombingRun(
      wave.speed,
      { x: wave.x, y: wave.y },
      wave.direction
    );

    this._waveIndex++;
    this._refreshHUD();
  },

  _refreshHUD() {
    if (this._healthText) {
      const hp = Math.max(
        0,
        Math.round(window.GameLogic.player?.health ?? 0)
      );
      this._healthText.setText(`HP: ${hp}`);
    }

    if (this._waveText) {
      const total = this.levelCfg?.waves?.length ?? 0;
      const current = Math.min(this._waveIndex, total);

      this._waveText.setText(
        this._waveStatusLabel(current, total)
      );
    }
  },

  _waveStatusLabel(current, total) {
    switch (this._state) {
      case 'idle': return 'Press Start';
      case 'waiting': return 'Last wave…';
      case 'won': return 'Level clear!';
      case 'lost': return 'Eliminated';
      default: return `Wave ${current} / ${total}`;
    }
  },

  _createWaveText() {
    return this.scene.add.text(
      this.arena.ARENA_X + this.arena.ARENA_W * 0.5,
      this.arena.ARENA_Y + 11,
      'Press Start',
      { fontSize: '32px', fill: '#ffffff' }
    ).setOrigin(0.5).setDepth(100);
  },

  _calculateScore() {
    const allowed = this.levelCfg.allowedBuildings || {};
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

    const playerHp  = window.GameLogic.player?.health ?? 0;
    const playerMax = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    const bonus     = playerHp >= playerMax ? 1000 : 0;

    return {
      objectScore: Math.round(objectScore),
      playerBonus: bonus,
      total: Math.round(objectScore) + bonus,
    };
  },

  _showWinScreen() {
    this._unlockNextLevel(this.levelNum);

    const { objectScore, playerBonus, total } = this._calculateScore();

    // ── Save score to Firebase (or offline bucket if logged out) ──────────
    window.FirebaseStore?.recordWin(this.levelNum, total);

    const hp    = Math.max(0, Math.round(window.GameLogic.player?.health ?? 0));
    const maxHp = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    const currentLevel = this.levelNum;
    const hasNext      = !!(window.Levels?.[(currentLevel + 1)]?.waves?.length);

    window.HUDFactory.showWinScreen(this.scene, this.arena, {
      levelNum:    currentLevel,
      totalWaves:  this.levelCfg.waves.length,
      hp,
      maxHp,
      objectScore,
      playerBonus,
      total,
      onNext:   hasNext ? () => { window._currentLevel = currentLevel + 1; window.startScene('GameScene'); } : null,
      onLevels: () => window.startScene('LevelSelectScene'),
    });
  },

  _showLoseScreen() {
    window.HUDFactory.showLoseScreen(this.scene, this.arena, {
      levelNum:      this.levelNum,
      wavesSurvived: Math.max(0, this._waveIndex - 1),
      totalWaves:    this.levelCfg.waves.length,
      onRetry:  () => window.startScene('GameScene'),
      onLevels: () => window.startScene('LevelSelectScene'),
    });
  },

  _createPlatforms() {
    (this.levelCfg.platforms || []).forEach((p) => {
      const platform = this.scene.add.rectangle(p.x, p.y, p.w, p.h, 0x888888);

      this.scene.matter.add.gameObject(platform, {
        label: 'platform',
        isStatic: true
      });

      this._platforms.push(platform);
    });
  },

  _createPrePlacedObjects() {
    (this.levelCfg.prePlaced || []).forEach((e) => {
      const obj = window.ObjectFactory.createLevelObject(
        this.scene,
        e.type,
        e.x,
        e.y,
        this.arena
      );

      if (obj) this._prePlaced.push(obj);
    });
  },

  _applyAllowedBuildings() {
    const allowed = this.levelCfg.allowedBuildings || {};

    Object.entries(allowed).forEach(([type, cap]) => {
      const cfg = window.ObjectConfig.placeableTypes[type];
      if (cfg) cfg.maxCount = cap;
    });
  },

  _fallbackConfig() {
    return {
      playerSpawn: { x: 960, y: 810 },
      platforms: [],
      prePlaced: [],
      allowedBuildings: {},
      waves: [{ speed: 300, direction: 1, x: -100, y: 100 }]
    };
  },
};
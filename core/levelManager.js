// core/levelManager.js
// Controls level loading, wave sequencing, HUD updates, and win/lose screens.

window.LevelManager = {

  scene:    null,
  arena:    null,
  levelNum: 1,
  levelCfg: null,

  _state:       'idle',  // idle | running | waiting | won | lost
  _waveIndex:   0,
  _countdownMs: 0,
  _screenShown: false,

  _waveText:    null,
  _healthText:  null,

  _platforms: [],
  _prePlaced:  [],

  // ── Level loading ─────────────────────────────────────────────────────────

  load(scene, arena, levelNum) {
    this.scene    = scene;
    this.arena    = arena;
    this.levelNum = levelNum;
    this.levelCfg = window.Levels?.[levelNum] ?? this._fallbackConfig();

    this._initLevelState();
    this._applyAllowedBuildings();
    this._spawnLevelObjects();

    const spawn  = this.levelCfg.playerSpawn ?? { x: 960, y: 810 };
    const player = window.ObjectFactory.createInternal(scene, 'player', spawn.x, spawn.y, arena);
    window.GameLogic.init(scene, player, arena);

    this._createHUD();
    return player;
  },

  // Resets all mutable level state to defaults.
  _initLevelState() {
    this._state       = 'idle';
    this._waveIndex   = 0;
    this._countdownMs = 0;
    this._screenShown = false;
    this._platforms   = [];
    this._prePlaced   = [];
    this._waveText    = null;
    this._healthText  = null;
  },

  // Spawns platforms and pre-placed objects from the level config.
  _spawnLevelObjects() {
    this._spawnPlatforms();
    this._spawnPrePlaced();
  },

  // Creates the HP display and wave counter text.
  _createHUD() {
    this._healthText = window.UIFactory.addHealthText(this.scene, this.arena);
    this._waveText   = this._createWaveText();
  },

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(delta) {
    this._refreshHUD();

    // Mirror a GameLogic loss into the level state machine.
    if (window.GameLogic.gameOver && this._state !== 'won' && this._state !== 'lost') {
      this._state = 'lost';
    }

    switch (this._state) {
      case 'idle':    break;
      case 'running': this._tickRunning(delta);  break;
      case 'waiting': this._tickWaiting();       break;
      case 'won':     this._tickWon();           break;
      case 'lost':    this._tickLost();          break;
    }
  },

  // Counts down between waves and fires the next one when ready.
  _tickRunning(delta) {
    this._countdownMs -= delta;
    if (this._countdownMs > 0) return;

    if (this._waveIndex < this.levelCfg.waves.length) {
      this._fireNextWave();
      this._countdownMs = this.levelCfg.waveDelayMs ?? 3000;
    } else {
      this._state = 'waiting';
    }
  },

  // Waits for the last plane to leave before declaring a win.
  _tickWaiting() {
    if (!window.GameLogic._run) this._state = 'won';
  },

  _tickWon() {
    if (!this._screenShown) { this._screenShown = true; this._showWinScreen(); }
  },

  _tickLost() {
    if (!this._screenShown) { this._screenShown = true; this._showLoseScreen(); }
  },

  // ── Wave control ──────────────────────────────────────────────────────────

  // Called by the Start button — kicks off the first wave.
  startWave() {
    if (this._state !== 'idle') return;

    this._fireNextWave();
    this._state       = this._waveIndex < this.levelCfg.waves.length ? 'running' : 'waiting';
    this._countdownMs = this.levelCfg.waveDelayMs ?? 3000;
  },

  _fireNextWave() {
    const waves = this.levelCfg.waves;
    if (!waves?.length || this._waveIndex >= waves.length) return;

    const wave = waves[this._waveIndex];
    window.GameLogic.startBombingRun(wave.speed, { x: wave.x, y: wave.y }, wave.direction);
    this._waveIndex++;
    this._refreshHUD();
  },

  // ── HUD refresh ───────────────────────────────────────────────────────────

  _refreshHUD() {
    this._refreshHealthText();
    this._refreshWaveText();
  },

  _refreshHealthText() {
    if (!this._healthText) return;
    const hp = Math.max(0, Math.round(window.GameLogic.player?.health ?? 0));
    this._healthText.setText(`HP: ${hp}`);
  },

  _refreshWaveText() {
    if (!this._waveText) return;
    const total   = this.levelCfg?.waves?.length ?? 0;
    const current = Math.min(this._waveIndex, total);
    const label   = this._stateToWaveLabel(current, total);
    this._waveText.setText(label);
  },

  _stateToWaveLabel(current, total) {
    switch (this._state) {
      case 'idle':    return 'Press Start';
      case 'waiting': return 'Last wave…';
      case 'won':     return 'Level clear!';
      case 'lost':    return 'Eliminated';
      default:        return `Wave ${current} / ${total}`;
    }
  },

  _createWaveText() {
    return this.scene.add.text(
      this.arena.ARENA_X + this.arena.ARENA_W * 0.5,
      this.arena.ARENA_Y + 11,
      'Press Start',
      { fontSize: '32px', fill: '#ffffff' }
    ).setOrigin(0.5, 0).setDepth(100);
  },

  // ── Overlay screens ───────────────────────────────────────────────────────

  _showWinScreen() {
    const { cx, cy }  = this._overlayCenter();
    const totalWaves  = this.levelCfg.waves.length;
    const hp          = Math.max(0, Math.round(window.GameLogic.player?.health ?? 0));

    this._createOverlayPanel(cx, cy);

    this.scene.add.text(cx, cy - 119, 'YOU WIN!', {
      fontSize: '97px', fill: '#44ff88', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.scene.add.text(cx, cy - 22,
      `All ${totalWaves} wave${totalWaves !== 1 ? 's' : ''} survived  ·  HP remaining: ${hp}`,
      { fontSize: '43px', fill: '#ffffff', align: 'center' }
    ).setOrigin(0.5).setDepth(2001);

    this._overlayBtn(cx, cy + 140, 'Back to Levels', '#333333',
      () => window.startScene('LevelSelectScene')
    );
  },

  _showLoseScreen() {
    const { cx, cy }  = this._overlayCenter();
    const wavesSurvived = Math.max(0, this._waveIndex - 1);
    const totalWaves    = this.levelCfg.waves.length;

    this._createOverlayPanel(cx, cy);

    this.scene.add.text(cx, cy - 119, 'GAME OVER', {
      fontSize: '108px', fill: '#ff3333', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.scene.add.text(cx, cy - 22,
      `Survived ${wavesSurvived} of ${totalWaves} wave${totalWaves !== 1 ? 's' : ''}`,
      { fontSize: '43px', fill: '#aaaaaa', align: 'center' }
    ).setOrigin(0.5).setDepth(2001);

    this._overlayBtn(cx, cy + 140, 'Back to Levels', '#333333',
      () => window.startScene('LevelSelectScene')
    );
  },

  // Returns the pixel centre of the arena, used by both overlay screens.
  _overlayCenter() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;
    return {
      cx: ARENA_X + ARENA_W * 0.5,
      cy: ARENA_Y + ARENA_H * 0.5,
    };
  },

  // Draws the semi-transparent dark background panel shared by both screens.
  _createOverlayPanel(cx, cy) {
    this.scene.add.rectangle(cx, cy, 960, 454, 0x000000, 0.85).setDepth(2000);
  },

  _overlayBtn(x, y, label, bgColor, onClick) {
    return this.scene.add.text(x, y, label, {
      fontSize:        '43px',
      fill:            '#ffffff',
      backgroundColor: bgColor,
      padding:         { x: 48, y: 16 },
    })
      .setOrigin(0.5).setDepth(2002)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  },

  // ── Level object spawning ─────────────────────────────────────────────────

  _spawnPlatforms() {
    (this.levelCfg.platforms || []).forEach((p) => {
      const platform = this.scene.add.rectangle(p.x, p.y, p.w, p.h, 0x888888);

      this.scene.matter.add.gameObject(platform, {
        label:       'platform',
        isStatic:    true,
        friction:    0.8,
        restitution: 0.0,
        frictionAir: 0.0,
        shape:       { type: 'rectangle', width: Math.ceil(p.w), height: Math.ceil(p.h) },
      });

      if (platform.body) {
        Phaser.Physics.Matter.Matter.Body.setStatic(platform.body, true);
      }

      this._platforms.push(platform);
    });
  },

  _spawnPrePlaced() {
    (this.levelCfg.prePlaced || []).forEach((entry) => {
      const obj = window.ObjectFactory.createLevelObject(
        this.scene, entry.type, entry.x, entry.y, this.arena
      );
      if (obj) this._prePlaced.push(obj);
    });
  },

  // Stamps the allowed building caps from the level config onto ObjectConfig.
  _applyAllowedBuildings() {
    const allowed = this.levelCfg.allowedBuildings || {};
    Object.entries(allowed).forEach(([type, cap]) => {
      const cfg = window.ObjectConfig.placeableTypes[type];
      if (cfg) cfg.maxCount = cap;
    });
  },

  // ── Fallback config ───────────────────────────────────────────────────────

  _fallbackConfig() {
    return {
      playerSpawn:      { x: 960, y: 810 },
      platforms:        [],
      prePlaced:        [],
      allowedBuildings: {},
      waves:            [{ speed: 314, direction: 1, x: -163, y: 120 }],
    };
  },
};
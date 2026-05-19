// levelManager.js
// Owns: level loading, platform and pre-placed object spawning, sequential wave
//       firing with inter-wave countdown, win/lose overlay screens, and the HUD.
// Does not own: physics, blast logic, building drag, or UI styling.
//
// State machine:
//   'idle'    — waiting for the Start button
//   'running' — counting down between waves; planes may overlap mid-arena
//   'waiting' — all waves fired; waiting for the last plane to exit
//   'won'     — last plane cleared; shows win screen
//   'lost'    — player HP hit zero; shows lose screen
//
// Usage:
//   LevelManager.load(scene, arena, levelNum)  — call from GameScene.create()
//   LevelManager.update(delta)                 — call from GameScene.update()
//   LevelManager.startWave()                   — wired to the Start button

window.LevelManager = {

  scene:    null,
  arena:    null,
  levelNum: 1,
  levelCfg: null,

  _state:         'idle',
  _waveIndex:     0,      // index of the next wave to fire
  _countdownMs:   0,      // ms remaining until the next wave fires
  _waveText:      null,   // "Wave X / Y" HUD label
  _healthText:    null,   // HP HUD label
  _screenShown:   false,  // prevents duplicate win/lose overlays

  _platforms:  [],        // static platform game objects
  _prePlaced:  [],        // pre-placed level object game objects

  // Sets up the level: applies building caps, spawns platforms and pre-placed objects,
  // creates the player, initialises GameLogic, and builds the HUD.
  // Returns the player game object.
  load(scene, arena, levelNum) {
    this.scene    = scene;
    this.arena    = arena;
    this.levelNum = levelNum;
    this.levelCfg = window.Levels?.[levelNum] ?? this._fallbackConfig();

    this._state         = 'idle';
    this._waveIndex     = 0;
    this._countdownMs   = 0;
    this._screenShown   = false;
    this._countdownText = null;
    this._waveText      = null;
    this._healthText    = null;
    this._platforms     = [];
    this._prePlaced     = [];

    this._applyAllowedBuildings();
    this._spawnPlatforms();
    this._spawnPrePlaced();

    const { px, py } = this._playerSpawnPx();
    const player = window.ObjectFactory.createInternal(scene, 'player', px, py, arena);
    window.GameLogic.init(scene, player, arena);

    this._healthText = window.UIFactory.addHealthText(scene, arena);
    this._waveText   = this._createWaveText();

    return player;
  },

  // Drives the wave state machine. Call this every frame from GameScene.update().
  // Refreshes the HUD, checks for player death, and advances through states.
  update(delta) {
    this._refreshHUD();

    if (window.GameLogic.gameOver && this._state !== 'won' && this._state !== 'lost') {
      this._state = 'lost';
    }

    switch (this._state) {

      case 'idle':
        break;

      case 'running':
        this._countdownMs -= delta;

        if (this._countdownMs <= 0) {
          if (this._waveIndex < this.levelCfg.waves.length) {
            this._fireNextWave();
            this._countdownMs = this.levelCfg.waveDelayMs ?? 3000;
          } else {
            this._state = 'waiting';
          }
        }
        break;

      case 'waiting':
        if (!window.GameLogic._run) this._state = 'won';
        break;

      case 'won':
        if (!this._screenShown) { this._screenShown = true; this._showWinScreen(); }
        break;

      case 'lost':
        if (!this._screenShown) { this._screenShown = true; this._showLoseScreen(); }
        break;
    }
  },

  // Fires the first wave immediately when the Start button is pressed.
  // Transitions to 'running' if more waves remain, or 'waiting' if it was the only one.
  startWave() {
    if (this._state !== 'idle') return;

    this._fireNextWave();

    if (this._waveIndex < this.levelCfg.waves.length) {
      this._state       = 'running';
      this._countdownMs = this.levelCfg.waveDelayMs ?? 3000;
    } else {
      this._state = 'waiting';
    }
  },

  // Resolves the next wave entry's pixel position and speed, calls
  // GameLogic.startBombingRun, then increments the wave index.
  _fireNextWave() {
    const waves = this.levelCfg.waves;
    if (!waves?.length || this._waveIndex >= waves.length) return;

    const waveCfg = waves[this._waveIndex];
    const spawnX  = this.arena.ARENA_X + this.arena.ARENA_W * waveCfg.xRatio;
    const spawnY  = this.arena.ARENA_Y + this.arena.ARENA_H * waveCfg.yRatio;
    const speed   = this._scaleWaveSpeed(waveCfg);

    window.GameLogic.startBombingRun(speed, { x: spawnX, y: spawnY }, waveCfg.direction);

    this._waveIndex++;
    this._refreshHUD();
  },

  // Renders the win overlay: a dark panel with a 'YOU WIN!' title, a wave/HP
  // summary, and a button that returns the player to the level select screen.
  _showWinScreen() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;
    const scale  = window.Scale;
    const cx     = ARENA_X + ARENA_W * 0.5;
    const cy     = ARENA_Y + ARENA_H * 0.5;
    const fsLg   = scale.screenScaleH(this.scene, scale.baseH * 0.09);
    const fs     = scale.screenScaleH(this.scene, scale.baseH * 0.04);
    const panelW = scale.screenScaleW(this.scene, scale.baseW * 0.5);
    const panelH = scale.screenScaleH(this.scene, scale.baseH * 0.42);
    const titleY = cy - scale.screenScaleH(this.scene, scale.baseH * 0.11);
    const subY   = cy - scale.screenScaleH(this.scene, scale.baseH * 0.02);
    const btnY   = cy + scale.screenScaleH(this.scene, scale.baseH * 0.13);

    const totalWaves = this.levelCfg.waves.length;
    const hp         = Math.max(0, Math.round(window.GameLogic.player?.health ?? 0));

    this.scene.add.rectangle(cx, cy, panelW, panelH, 0x000000, 0.82).setDepth(2000);
    this.scene.add.text(cx, titleY, 'YOU WIN!', {
      fontSize: `${fsLg}px`, fill: '#44ff88', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.scene.add.text(cx, subY,
      `All ${totalWaves} wave${totalWaves !== 1 ? 's' : ''} survived  ·  HP remaining: ${hp}`,
      { fontSize: `${fs}px`, fill: '#ffffff', align: 'center' }
    ).setOrigin(0.5).setDepth(2001);

    this._overlayBtn(cx, btnY, 'Back to Levels', '#333333',
      () => window.startScene('LevelSelectScene')
    );
  },

  // Renders the lose overlay: a dark panel with a 'GAME OVER' title, a waves-survived
  // counter, and a button that returns the player to the level select screen.
  _showLoseScreen() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;
    const scale  = window.Scale;
    const cx     = ARENA_X + ARENA_W * 0.5;
    const cy     = ARENA_Y + ARENA_H * 0.5;
    const fsLg   = scale.screenScaleH(this.scene, scale.baseH * 0.1);
    const fs     = scale.screenScaleH(this.scene, scale.baseH * 0.04);
    const panelW = scale.screenScaleW(this.scene, scale.baseW * 0.5);
    const panelH = scale.screenScaleH(this.scene, scale.baseH * 0.42);
    const titleY = cy - scale.screenScaleH(this.scene, scale.baseH * 0.11);
    const subY   = cy - scale.screenScaleH(this.scene, scale.baseH * 0.02);
    const btnY   = cy + scale.screenScaleH(this.scene, scale.baseH * 0.13);

    const wavesSurvived = Math.max(0, this._waveIndex - 1);
    const totalWaves    = this.levelCfg.waves.length;

    this.scene.add.rectangle(cx, cy, panelW, panelH, 0x000000, 0.85).setDepth(2000);
    this.scene.add.text(cx, titleY, 'GAME OVER', {
      fontSize: `${fsLg}px`, fill: '#ff3333', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.scene.add.text(cx, subY,
      `Survived ${wavesSurvived} of ${totalWaves} wave${totalWaves !== 1 ? 's' : ''}`,
      { fontSize: `${fs}px`, fill: '#aaaaaa', align: 'center' }
    ).setOrigin(0.5).setDepth(2001);

    this._overlayBtn(cx, btnY, 'Back to Levels', '#333333',
      () => window.startScene('LevelSelectScene')
    );
  },

  // Updates the HP and wave-count labels each frame.
  // Shows a contextual string in the wave label depending on the current state.
  _refreshHUD() {
    if (this._healthText) {
      const hp = Math.max(0, Math.round(window.GameLogic.player?.health ?? 0));
      this._healthText.setText(`HP: ${hp}`);
    }
    if (this._waveText) {
      const total    = this.levelCfg?.waves?.length ?? 0;
      const current  = Math.min(this._waveIndex, total);
      const stateStr = this._state === 'idle'    ? 'Press Start'
                     : this._state === 'waiting' ? 'Last wave…'
                     : this._state === 'won'     ? 'Level clear!'
                     : this._state === 'lost'    ? 'Eliminated'
                     : `Wave ${current} / ${total}`;
      this._waveText.setText(stateStr);
    }
  },

  // Creates the wave-counter text label centred at the top of the arena.
  _createWaveText() {
    const scale    = window.Scale;
    const fontSize = scale.screenScaleH(this.scene, scale.baseH * 0.03);
    const offY     = scale.screenScaleH(this.scene, scale.baseH * 0.01);
    return this.scene.add.text(
      this.arena.ARENA_X + this.arena.ARENA_W * 0.5,
      this.arena.ARENA_Y + offY,
      'Press Start',
      { fontSize: `${fontSize}px`, fill: '#ffffff' }
    ).setOrigin(0.5, 0).setDepth(100);
  },

  // Creates a centred, interactive text button for use inside win/lose overlays.
  _overlayBtn(x, y, label, bgColor, onClick) {
    const scale = window.Scale;
    const fs    = scale.screenScaleH(this.scene, scale.baseH * 0.04);
    const padX  = scale.screenScaleW(this.scene, scale.baseW * 0.025);
    const padY  = scale.screenScaleH(this.scene, scale.baseH * 0.015);
    return this.scene.add.text(x, y, label, {
      fontSize:        `${fs}px`,
      fill:            '#ffffff',
      backgroundColor: bgColor,
      padding:         { x: padX, y: padY },
    })
      .setOrigin(0.5).setDepth(2002)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  },

  // Creates static Matter.js rectangle bodies for each platform defined in the level config.
  // Platforms are pinned as static bodies so physics can rest objects on them.
  _spawnPlatforms() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;

    (this.levelCfg.platforms || []).forEach((p) => {
      const px = ARENA_X + ARENA_W * p.xRatio;
      const py = ARENA_Y + ARENA_H * p.yRatio;
      const pw = ARENA_W * p.wRatio;
      const ph = ARENA_H * p.hRatio;

      const platform = this.scene.add.rectangle(px, py, pw, ph, 0x888888);
      this.scene.matter.add.gameObject(platform, {
        label:       'platform',
        isStatic:    true,
        friction:    0.8,
        restitution: 0.0,
        frictionAir: 0.0,
        shape: { type: 'rectangle', width: Math.ceil(pw), height: Math.ceil(ph) },
      });
      if (platform.body) {
        Phaser.Physics.Matter.Matter.Body.setStatic(platform.body, true);
      }
      this._platforms.push(platform);
    });
  },

  // Spawns the locked, designer-placed objects listed in levelCfg.prePlaced
  // (e.g. bomb crates) via ObjectFactory.createLevelObject.
  _spawnPrePlaced() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;

    (this.levelCfg.prePlaced || []).forEach((entry) => {
      const px = ARENA_X + ARENA_W * entry.xRatio;
      const py = ARENA_Y + ARENA_H * entry.yRatio;
      const obj = window.ObjectFactory.createLevelObject(this.scene, entry.type, px, py, this.arena);
      if (!obj) return;
      this._prePlaced.push(obj);
    });
  },

  // Applies per-level building caps from levelCfg.allowedBuildings to the
  // global ObjectConfig so BuildingManager enforces them during the level.
  _applyAllowedBuildings() {
    const allowed = this.levelCfg.allowedBuildings || {};
    Object.entries(allowed).forEach(([type, cap]) => {
      const cfg = window.ObjectConfig.placeableTypes[type];
      if (cfg) cfg.maxCount = cap;
    });
  },

  // Converts the level's playerSpawn ratios to arena-relative pixel coordinates.
  _playerSpawnPx() {
    const s = this.levelCfg.playerSpawn ?? { xRatio: 0.5, yRatio: 0.75 };
    return {
      px: this.arena.ARENA_X + this.arena.ARENA_W * s.xRatio,
      py: this.arena.ARENA_Y + this.arena.ARENA_H * s.yRatio,
    };
  },

  // Returns a wave's speed in pixels-per-second.
  // Prefers speedRatio (fraction of ARENA_W/s); falls back to a raw px/s value.
  _scaleWaveSpeed(waveCfg) {
    if (waveCfg.speedRatio != null) return this.arena.ARENA_W * waveCfg.speedRatio;
    return window.Scale.arenaScaleW(this.arena, waveCfg.speedPxPerSec ?? 0);
  },

  // Returns a minimal single-wave config used when a level number has no entry in window.Levels.
  _fallbackConfig() {
    return {
      playerSpawn:      { xRatio: 0.5, yRatio: 0.75 },
      platforms:        [],
      prePlaced:        [],
      allowedBuildings: {},
      waves: [{ speedRatio: 0.182, direction: 1, xRatio: -0.15, yRatio: 0.04 }],
    };
  },
};
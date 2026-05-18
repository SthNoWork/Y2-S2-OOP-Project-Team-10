// ========================================
// LEVEL MANAGER
// ========================================
// Owns: level loading, platform/prePlaced spawning, sequential wave
//       firing with inter-wave countdown, win/lose screens, HUD.
// Does NOT own: physics, blast logic, building drag, UI styling.
//
// Flow:
//   LevelManager.load(scene, arena, levelNum)  — call from GameScene.create()
//   LevelManager.update(delta)                 — call from GameScene.update()
//   LevelManager.startWave()                   — wired to the Start button
//
// Wave sequence (fires automatically once Start is pressed):
//   wave[0] fires → countdown starts immediately → wave[1] fires (plane[0] may still be flying)
//   → … → last wave fires → wait for last plane to exit → win.
//   If player.health <= 0 at any point → lose immediately.

window.LevelManager = {

  // ========================================
  // STATE
  // ========================================

  scene:    null,
  arena:    null,
  levelNum: 1,
  levelCfg: null,

  // 'idle'    — waiting for Start press
  // 'running' — sequence active: countdown ticking, planes spawning (may overlap)
  // 'waiting' — all waves fired, waiting for last plane to clear the arena
  // 'won'     — all waves cleared
  // 'lost'    — player health reached 0
  _state: 'idle',

  _waveIndex:      0,     // index of the NEXT wave to fire
  _countdownMs:    0,     // ms until the next wave fires
  _waveText:       null,  // "Wave X / Y" HUD label
  _healthText:     null,  // HP HUD label
  _screenShown:    false, // prevents duplicate win/lose overlays

  _platforms:  [],        // static platform game objects
  _prePlaced:  [],        // pre-placed level object game objects

  // ========================================
  // LOAD
  // ========================================

  load(scene, arena, levelNum) {
    this.scene    = scene;
    this.arena    = arena;
    this.levelNum = levelNum;
    this.levelCfg = window.Levels?.[levelNum] ?? this._fallbackConfig();

    this._state          = 'idle';
    this._waveIndex      = 0;
    this._countdownMs    = 0;
    this._screenShown    = false;
    this._countdownText  = null;
    this._waveText       = null;
    this._healthText     = null;
    this._platforms      = [];
    this._prePlaced      = [];

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

  // ========================================
  // PER-FRAME UPDATE
  // ========================================

  update(delta) {
    // Always refresh HP display.
    this._refreshHUD();

    // Player death takes priority — can happen in any active state.
    if (window.GameLogic.gameOver && this._state !== 'won' && this._state !== 'lost') {
      this._state = 'lost';
    }

    switch (this._state) {

      case 'idle':
        // Waiting for the Start button — nothing to do.
        break;

      case 'running':
        // Tick the countdown toward the next wave.
        this._countdownMs -= delta;

        if (this._countdownMs <= 0) {
          if (this._waveIndex < this.levelCfg.waves.length) {
            // Fire the next wave and restart the countdown for the one after.
            this._fireNextWave();
            this._countdownMs = this.levelCfg.waveDelayMs ?? 3000;
          } else {
            // All waves have been dispatched — wait for the last plane to leave.
            this._state = 'waiting';
          }
        }
        break;

      case 'waiting':
        // All planes spawned. Once the last one clears, the level is won.
        if (!window.GameLogic._run) {
          this._state = 'won';
        }
        break;

      case 'won':
        if (!this._screenShown) {
          this._screenShown = true;
          this._showWinScreen();
        }
        break;

      case 'lost':
        if (!this._screenShown) {
          this._screenShown = true;
          this._showLoseScreen();
        }
        break;
    }
  },

  // ========================================
  // START — wired to the Start button in GameScene
  // ========================================

  startWave() {
    if (this._state !== 'idle') return;   // already running

    // Fire wave 0 immediately.
    this._fireNextWave();

    // If there are more waves, start the countdown for the next one right away.
    if (this._waveIndex < this.levelCfg.waves.length) {
      this._state       = 'running';
      this._countdownMs = this.levelCfg.waveDelayMs ?? 3000;
    } else {
      // Only one wave — go straight to waiting for it to finish.
      this._state = 'waiting';
    }
  },

  // ========================================
  // INTERNAL — WAVE FIRING
  // ========================================

  _fireNextWave() {
    const waves = this.levelCfg.waves;
    if (!waves?.length || this._waveIndex >= waves.length) return;

    const waveCfg = waves[this._waveIndex];
    const spawnX  = this.arena.ARENA_X + this.arena.ARENA_W * waveCfg.xRatio;
    const spawnY  = this.arena.ARENA_Y + this.arena.ARENA_H * waveCfg.yRatio;
    const speed   = this._scaleWaveSpeed(waveCfg);

    window.GameLogic.startBombingRun(
      speed,
      { x: spawnX, y: spawnY },
      waveCfg.direction
    );

    this._waveIndex++;
    this._refreshHUD();   // update "Wave X / Y" immediately
  },

  // ========================================
  // WIN SCREEN
  // ========================================

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
      fontSize: `${fsLg}px`,
      fill: '#44ff88',
      align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.scene.add.text(cx, subY,
      `All ${totalWaves} wave${totalWaves !== 1 ? 's' : ''} survived  ·  HP remaining: ${hp}`,
      { fontSize: `${fs}px`, fill: '#ffffff', align: 'center' }
    ).setOrigin(0.5).setDepth(2001);

    this._overlayBtn(cx, btnY, 'Back to Levels', '#333333',
      () => window.startScene('LevelSelectScene')
    );
  },

  // ========================================
  // LOSE SCREEN
  // ========================================

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
      fontSize: `${fsLg}px`,
      fill: '#ff3333',
      align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.scene.add.text(cx, subY,
      `Survived ${wavesSurvived} of ${totalWaves} wave${totalWaves !== 1 ? 's' : ''}`,
      { fontSize: `${fs}px`, fill: '#aaaaaa', align: 'center' }
    ).setOrigin(0.5).setDepth(2001);

    this._overlayBtn(cx, btnY, 'Back to Levels', '#333333',
      () => window.startScene('LevelSelectScene')
    );
  },

  // ========================================
  // HUD
  // ========================================

  _refreshHUD() {
    if (this._healthText) {
      const hp = Math.max(0, Math.round(window.GameLogic.player?.health ?? 0));
      this._healthText.setText(`HP: ${hp}`);
    }
    if (this._waveText) {
      const total    = this.levelCfg?.waves?.length ?? 0;
      const current  = Math.min(this._waveIndex, total);   // waves fired so far
      const stateStr = this._state === 'idle'    ? 'Press Start'
                     : this._state === 'waiting' ? 'Last wave…'
                     : this._state === 'won'     ? 'Level clear!'
                     : this._state === 'lost'    ? 'Eliminated'
                     : `Wave ${current} / ${total}`;
      this._waveText.setText(stateStr);
    }
  },

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

  // ========================================
  // OVERLAY HELPER
  // ========================================

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

  // ========================================
  // PLATFORM SPAWNING
  // ========================================

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

  // ========================================
  // PRE-PLACED BUILDINGS
  // ========================================

  _spawnPrePlaced() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;

    (this.levelCfg.prePlaced || []).forEach((entry) => {
      const px = ARENA_X + ARENA_W * entry.xRatio;
      const py = ARENA_Y + ARENA_H * entry.yRatio;

      const obj = window.ObjectFactory.createLevelObject(
        this.scene, entry.type, px, py, this.arena
      );
      if (!obj) return;
      this._prePlaced.push(obj);
    });
  },

  // ========================================
  // ALLOWED BUILDINGS
  // ========================================

  _applyAllowedBuildings() {
    const allowed = this.levelCfg.allowedBuildings || {};
    Object.entries(allowed).forEach(([type, cap]) => {
      const cfg = window.ObjectConfig.placeableTypes[type];
      if (cfg) cfg.maxCount = cap;
    });
  },

  // ========================================
  // HELPERS
  // ========================================

  _playerSpawnPx() {
    const s = this.levelCfg.playerSpawn ?? { xRatio: 0.5, yRatio: 0.75 };
    return {
      px: this.arena.ARENA_X + this.arena.ARENA_W * s.xRatio,
      py: this.arena.ARENA_Y + this.arena.ARENA_H * s.yRatio,
    };
  },

  _scaleWaveSpeed(waveCfg) {
    if (waveCfg.speedRatio != null) {
      return this.arena.ARENA_W * waveCfg.speedRatio;
    }
    const raw = waveCfg.speedPxPerSec ?? 0;
    return window.Scale.arenaScaleW(this.arena, raw);
  },

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
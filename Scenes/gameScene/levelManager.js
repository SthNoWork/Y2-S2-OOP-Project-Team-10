// ========================================
// LEVEL MANAGER
// ========================================
// Owns: level loading from Levels config, platform/prePlaced spawning,
//       wave sequencing, score calculation, continue/stop screen, HUD.
// Does NOT own: physics, blast logic, building drag, UI styling.
//
// Flow:
//   LevelManager.load(scene, arena, levelNum)  — call from GameScene.create()
//   LevelManager.update()                      — call from GameScene.update()
//
// After each wave, if player alive → continue/stop screen.
//   Continue: fire next wave (loops with higher multiplier).
//   Stop:     lock in score, show final screen.

window.LevelManager = {

  // ========================================
  // STATE
  // ========================================

  scene:       null,
  arena:       null,
  levelNum:    1,
  levelCfg:    null,

  _waveIndex:  0,       // index into levelCfg.waves (wraps on loop)
  _runCount:   0,       // total completed runs (drives multiplier)
  _waveActive: false,   // true while a plane is in flight

  _score:      0,
  _buildingsPlacedThisRun: 0,

  _healthText:   null,
  _scoreText:    null,
  _gameOverText: null,
  _overlay:      null,  // continue/stop panel object refs

  _platforms:  [],      // static platform game objects
  _prePlaced:  [],      // locked pre-placed building game objects

  // ========================================
  // LOAD  (replaces old init)
  // ========================================

  load(scene, arena, levelNum) {
    this.scene    = scene;
    this.arena    = arena;
    this.levelNum = levelNum;
    this.levelCfg = window.Levels?.[levelNum] ?? this._fallbackConfig();

    this._waveIndex    = 0;
    this._runCount     = 0;
    this._waveActive   = false;
    this._score        = 0;
    this._buildingsPlacedThisRun = 0;
    this._platforms    = [];
    this._prePlaced    = [];
    this._gameOverText = null;
    this._overlay      = null;
    this._healthText   = null;
    this._scoreText    = null;

    this._applyAllowedBuildings();
    this._spawnPlatforms();
    this._spawnPrePlaced();

    const { px, py } = this._playerSpawnPx();
    const player = window.ObjectFactory.createInternal(scene, 'player', px, py, arena);
    window.GameLogic.init(scene, player, arena);

    this._healthText = window.UIFactory.addHealthText(scene, arena);
    this._scoreText  = this._createScoreText();

    return player;
  },

  // ========================================
  // PER-FRAME UPDATE
  // ========================================

  update() {
    this._refreshHUD();

    if (window.GameLogic.gameOver) {
      this._showGameOver();
      return;
    }

    // Wave just ended — plane exited, no overlay showing yet.
    if (this._waveActive && !window.GameLogic._run && !this._overlay) {
      this._waveActive = false;
      this._onWaveComplete();
    }
  },

  // ========================================
  // WAVE CONTROL
  // ========================================

  startWave() {
    if (this._waveActive) return;

    const waves = this.levelCfg.waves;
    if (!waves?.length) return;

    const waveCfg = waves[this._waveIndex % waves.length];
    const spawnX  = this.arena.ARENA_X + this.arena.ARENA_W * waveCfg.xRatio;
    const spawnY  = this.arena.ARENA_Y + this.arena.ARENA_H * waveCfg.yRatio;

    window.GameLogic.startBombingRun(
      waveCfg.speedPxPerSec,
      { x: spawnX, y: spawnY },
      waveCfg.direction
    );

    this._waveActive             = true;
    this._buildingsPlacedThisRun = window.BuildingManager.getPlacedBuildings().length;
  },

  _onWaveComplete() {
    this._runCount++;
    this._waveIndex++;

    const roundScore = this._calcRoundScore();
    this._score     += roundScore;

    this._showContinueStop(roundScore);
  },

  // ========================================
  // SCORE
  // ========================================

  _calcRoundScore() {
    const cfg        = window.ScoreConfig;
    const player     = window.GameLogic.player;
    const maxHp      = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    const hpRatio    = player ? Math.max(0, player.health / maxHp) : 0;
    const hpScore    = Math.round(hpRatio * cfg.playerHpWeight);

    const buildings  = window.BuildingManager.getPlacedBuildings();
    const totals = buildings.reduce((acc, b) => {
      if (!b || b.maxHealth <= 0) return acc;
      acc.current += Math.max(0, b.health);
      acc.max += b.maxHealth;
      return acc;
    }, { current: 0, max: 0 });
    const bldRatio = totals.max > 0 ? Math.max(0, totals.current / totals.max) : 0;
    const bldScore = Math.round(bldRatio * cfg.buildingWeight);

    const penalty    = this._buildingsPlacedThisRun * cfg.placementPenalty;
    const multiplier = 1 + (this._runCount - 1) * cfg.runMultiplierStep;
    const total      = Math.round(Math.max(0, hpScore + bldScore - penalty) * multiplier);

    window.logDebug?.(
      `Run ${this._runCount}: hp=${hpScore} bld=${bldScore} ` +
      `pen=-${penalty} ×${multiplier.toFixed(1)} = ${total}`
    );
    return total;
  },

  // ========================================
  // CONTINUE / STOP SCREEN
  // ========================================

  _showContinueStop(roundScore) {
    if (this._overlay) return;

    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;
    const cx   = ARENA_X + ARENA_W * 0.5;
    const cy   = ARENA_Y + ARENA_H * 0.5;
    const fs   = Math.round(this.scene.scale.height * 0.04);
    const fsLg = Math.round(this.scene.scale.height * 0.06);

    const nextMult = 1 + this._runCount * (window.ScoreConfig?.runMultiplierStep ?? 0.5);

    const bg = this.scene.add.rectangle(cx, cy, ARENA_W * 0.55, ARENA_H * 0.48, 0x000000, 0.78)
      .setDepth(2000);

    const title = this.scene.add.text(cx, cy - ARENA_H * 0.16, 'Wave Complete!', {
      fontSize: `${fsLg}px`, fill: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    const scoreLine = this.scene.add.text(
      cx, cy - ARENA_H * 0.07,
      `+${roundScore}  |  Total: ${this._score}`,
      { fontSize: `${fs}px`, fill: '#ffdd00', align: 'center' }
    ).setOrigin(0.5).setDepth(2001);

    const hint = this.scene.add.text(
      cx, cy + ARENA_H * 0.01,
      `Continue for ×${nextMult.toFixed(1)} multiplier`,
      { fontSize: `${Math.round(fs * 0.8)}px`, fill: '#aaaaaa', align: 'center' }
    ).setOrigin(0.5).setDepth(2001);

    const contBtn = this._overlayBtn(
      cx - ARENA_W * 0.1, cy + ARENA_H * 0.12, 'Continue', '#1a7a3a',
      () => { this._closeOverlay(); this.startWave(); }
    );

    const stopBtn = this._overlayBtn(
      cx + ARENA_W * 0.1, cy + ARENA_H * 0.12, 'Stop', '#7a1a1a',
      () => { this._closeOverlay(); this._showFinalScore(); }
    );

    this._overlay = { bg, title, scoreLine, hint, contBtn, stopBtn };
  },

  _overlayBtn(x, y, label, bgColor, onClick) {
    const fs   = Math.round(this.scene.scale.height * 0.04);
    const padX = Math.round(this.scene.scale.width  * 0.025);
    const padY = Math.round(this.scene.scale.height * 0.015);
    return this.scene.add.text(x, y, label, {
      fontSize: `${fs}px`, fill: '#ffffff',
      backgroundColor: bgColor,
      padding: { x: padX, y: padY },
    })
      .setOrigin(0.5).setDepth(2002)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  },

  _closeOverlay() {
    if (!this._overlay) return;
    Object.values(this._overlay).forEach((o) => { try { o.destroy(); } catch (e) {} });
    this._overlay = null;
  },

  // ========================================
  // FINAL SCORE SCREEN
  // ========================================

  _showFinalScore() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;
    const cx   = ARENA_X + ARENA_W * 0.5;
    const cy   = ARENA_Y + ARENA_H * 0.5;
    const fsLg = Math.round(this.scene.scale.height * 0.07);
    const fs   = Math.round(this.scene.scale.height * 0.05);
    const fsSm = Math.round(this.scene.scale.height * 0.035);

    this.scene.add.rectangle(cx, cy, ARENA_W * 0.55, ARENA_H * 0.52, 0x000000, 0.85)
      .setDepth(2000);

    this.scene.add.text(cx, cy - ARENA_H * 0.18, 'Level Complete!', {
      fontSize: `${fsLg}px`, fill: '#ffdd00', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.scene.add.text(cx, cy - ARENA_H * 0.07, `Final Score: ${this._score}`, {
      fontSize: `${fs}px`, fill: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.scene.add.text(cx, cy + ARENA_H * 0.03, `Waves survived: ${this._runCount}`, {
      fontSize: `${fsSm}px`, fill: '#aaaaaa', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this._overlayBtn(cx, cy + ARENA_H * 0.15, 'Back to Levels', '#333333',
      () => window.startScene('LevelSelectScene')
    );
  },

  // ========================================
  // GAME OVER
  // ========================================

  _showGameOver() {
    if (this._gameOverText) return;
    this._closeOverlay();

    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;
    const cx   = ARENA_X + ARENA_W * 0.5;
    const cy   = ARENA_Y + ARENA_H * 0.5;
    const fsLg = Math.round(this.scene.scale.height * 0.1);
    const fs   = Math.round(this.scene.scale.height * 0.04);

    this.scene.add.rectangle(cx, cy, ARENA_W * 0.55, ARENA_H * 0.48, 0x000000, 0.82)
      .setDepth(2000);

    this._gameOverText = this.scene.add.text(cx, cy - ARENA_H * 0.12, 'GAME OVER', {
      fontSize: `${fsLg}px`, fill: '#ff3333', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this.scene.add.text(cx, cy + ARENA_H * 0.03, `Score: ${this._score}`, {
      fontSize: `${fs}px`, fill: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(2001);

    this._overlayBtn(cx, cy + ARENA_H * 0.15, 'Back to Levels', '#333333',
      () => window.startScene('LevelSelectScene')
    );
  },

  // ========================================
  // HUD
  // ========================================

  _refreshHUD() {
    if (this._healthText) {
      const hp = window.GameLogic.player?.health ?? 0;
      this._healthText.setText(`HP: ${Math.max(0, Math.round(hp))}`);
    }
    if (this._scoreText) {
      this._scoreText.setText(`Score: ${this._score}`);
    }
  },

  _createScoreText() {
    const cfg      = window.UIFactory.config.healthText;
    const fontSize = Math.round(this.scene.scale.height * cfg.fontSizeRatio);
    return this.scene.add.text(
      this.arena.ARENA_X + this.arena.ARENA_W * 0.5,
      this.arena.ARENA_Y + this.arena.ARENA_H * 0.01,
      'Score: 0',
      { fontSize: `${fontSize}px`, fill: cfg.fill }
    ).setOrigin(0.5, 0);
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

      // Use createLevelObject — completely separate from BuildingManager/placeableTypes.
      // These objects are never draggable, never counted, never in placedBuildings.
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
      if (cfg) {
        cfg.maxCount      = cap;
      }
    });
  },

  // ========================================
  // FULL RESET
  // ========================================

  reset(player) {
    window.GameLogic.resetRun();

    for (const b of window.BuildingManager.getPlacedBuildings().slice()) {
      try { window.BuildingManager.destroyBuilding(b); } catch (e) {}
    }
    window.BuildingManager.resetState();

    this._closeOverlay();
    if (this._gameOverText) {
      try { this._gameOverText.destroy(); } catch (e) {}
      this._gameOverText = null;
    }

    this._score      = 0;
    this._runCount   = 0;
    this._waveIndex  = 0;
    this._waveActive = false;

    const { px, py } = this._playerSpawnPx();

    if (!player || !player.active) {
      player = window.ObjectFactory.createInternal(this.scene, 'player', px, py, this.arena);
    } else {
      if (player.body) {
        try {
          Phaser.Physics.Matter.Matter.Body.setPosition(player.body, { x: px, y: py });
          Phaser.Physics.Matter.Matter.Body.setVelocity(player.body, { x: 0, y: 0 });
        } catch (e) {}
      }
    }

    window.GameLogic.init(this.scene, player, this.arena);
    this._refreshHUD();
    return player;
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

  _fallbackConfig() {
    return {
      playerSpawn:      { xRatio: 0.5, yRatio: 0.75 },
      platforms:        [],
      prePlaced:        [],
      allowedBuildings: {},
      waves: [{ speedPxPerSec: 350, direction: 1, xRatio: -0.15, yRatio: 0.04 }],
    };
  },

};
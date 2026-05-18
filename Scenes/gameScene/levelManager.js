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

window.LevelManager = {

  // ========================================
  // STATE
  // ========================================

  scene:    null,
  arena:    null,
  levelNum: 1,
  levelCfg: null,

  // 'idle'    — waiting for Start press
  // 'running' — sequence active: countdown ticking, planes spawning
  // 'waiting' — all waves fired, waiting for last plane to clear
  // 'won'     — all waves cleared
  // 'lost'    — player health reached 0
  _state: 'idle',

  _waveIndex:      0,
  _countdownMs:    0,
  _waveText:       null,
  _healthText:     null,
  _screenShown:    false,

  _platforms:  [],
  _prePlaced:  [],

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
  // START
  // ========================================

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

    window.GameLogic.startBombingRun(speed, { x: spawnX, y: spawnY }, waveCfg.direction);

    this._waveIndex++;
    this._refreshHUD();
  },

  // ========================================
  // WIN SCREEN
  // ========================================

  _showWinScreen() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;
    const scale      = window.Scale;
    const cx         = ARENA_X + ARENA_W * 0.5;
    const cy         = ARENA_Y + ARENA_H * 0.5;
    const totalWaves = this.levelCfg.waves.length;
    const hp         = Math.max(0, Math.round(window.GameLogic.player?.health ?? 0));
    const maxHp      = window.ObjectConfig.internalTypes?.player?.health ?? 100;
    const hpPct      = hp / maxHp;

    // Star rating: 3 = >=75% HP, 2 = >=35% HP, 1 = survived
    const stars = hpPct >= 0.75 ? 3 : hpPct >= 0.35 ? 2 : 1;

    const panelW = scale.screenScaleW(this.scene, scale.baseW * 0.50);
    const panelH = scale.screenScaleH(this.scene, scale.baseH * 0.56);
    const D      = 2000;

    // ── Dark backdrop (full arena) ──
    this.scene.add.rectangle(cx, cy, ARENA_W, ARENA_H, 0x000000, 0.55).setDepth(D);

    // ── Panel shadow ──
    this.scene.add.rectangle(
      cx + scale.screenScaleW(this.scene, 6),
      cy + scale.screenScaleH(this.scene, 6),
      panelW, panelH, 0x000000, 0.5
    ).setDepth(D + 1);

    // ── Main panel ──
    this.scene.add.rectangle(cx, cy, panelW, panelH, 0x0d1b0d, 0.97).setDepth(D + 2);

    // ── Green top accent bar ──
    const barH = scale.screenScaleH(this.scene, scale.baseH * 0.007);
    this.scene.add.rectangle(
      cx, cy - panelH * 0.5 + barH * 0.5,
      panelW, barH, 0x44ff88
    ).setDepth(D + 3);

    // ── Panel border ──
    const border = this.scene.add.graphics().setDepth(D + 3);
    border.lineStyle(scale.screenScaleW(this.scene, 2), 0x44ff88, 0.6);
    border.strokeRect(cx - panelW * 0.5, cy - panelH * 0.5, panelW, panelH);

    // ── LEVEL badge ──
    const badgeFs = scale.screenScaleH(this.scene, scale.baseH * 0.025);
    const topY    = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.04);
    this.scene.add.text(cx, topY, `LEVEL ${this.levelNum}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize:   `${badgeFs}px`,
      fill:       '#44ff88',
      letterSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(D + 4);

    // ── YOU WIN! title ──
    const titleFs = scale.screenScaleH(this.scene, scale.baseH * 0.085);
    const titleY  = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.115);
    this.scene.add.text(cx, titleY, 'YOU WIN!', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize:   `${titleFs}px`,
      fill:       '#44ff88',
      stroke:     '#006633',
      strokeThickness: scale.screenScaleH(this.scene, 4),
    }).setOrigin(0.5, 0).setDepth(D + 4);

    // ── Star rating ──
    const starY     = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.245);
    const starSize  = scale.screenScaleH(this.scene, scale.baseH * 0.052);
    const starGap   = scale.screenScaleW(this.scene, scale.baseW * 0.045);
    const starOffsets = [-starGap, 0, starGap];
    starOffsets.forEach((offset, i) => {
      const filled = i < stars;
      this.scene.add.text(cx + offset, starY, '★', {
        fontFamily: 'Arial, sans-serif',
        fontSize:   `${starSize}px`,
        fill:       filled ? '#ffd700' : '#2a2a2a',
        stroke:     filled ? '#b8860b' : '#444444',
        strokeThickness: scale.screenScaleH(this.scene, 2),
      }).setOrigin(0.5).setDepth(D + 4);
    });

    // ── Divider line ──
    const divY = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.315);
    const divW = panelW * 0.82;
    const divGfx = this.scene.add.graphics().setDepth(D + 3);
    divGfx.lineStyle(1, 0x44ff88, 0.25);
    divGfx.lineBetween(cx - divW * 0.5, divY, cx + divW * 0.5, divY);

    // ── Stat cards ──
    const cardY      = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.355);
    const cardW      = panelW * 0.28;
    const cardH      = scale.screenScaleH(this.scene, scale.baseH * 0.095);
    const cardGap    = panelW * 0.34;
    const labelFs    = scale.screenScaleH(this.scene, scale.baseH * 0.024);
    const valueFs    = scale.screenScaleH(this.scene, scale.baseH * 0.042);

    const cards = [
      { label: 'LEVEL',   value: `${this.levelNum}`,            color: '#aaaaaa' },
      { label: 'WAVES',   value: `${totalWaves}/${totalWaves}`, color: '#44ccff' },
      { label: 'HP LEFT', value: `${hp}`,                       color: hpPct >= 0.5 ? '#44ff88' : hpPct >= 0.25 ? '#ffcc00' : '#ff5555' },
    ];

    cards.forEach((card, i) => {
      const cardX = cx + (i - 1) * cardGap;
      this.scene.add.rectangle(cardX, cardY, cardW, cardH, 0x1a2e1a, 1).setDepth(D + 3);
      const cardBorder = this.scene.add.graphics().setDepth(D + 3);
      cardBorder.lineStyle(1, 0x44ff88, 0.2);
      cardBorder.strokeRect(cardX - cardW * 0.5, cardY - cardH * 0.5, cardW, cardH);
      this.scene.add.text(cardX, cardY - cardH * 0.18, card.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize:   `${labelFs}px`,
        fill:       '#778877',
        letterSpacing: 2,
      }).setOrigin(0.5).setDepth(D + 4);
      this.scene.add.text(cardX, cardY + cardH * 0.22, card.value, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize:   `${valueFs}px`,
        fill:       card.color,
      }).setOrigin(0.5).setDepth(D + 4);
    });

    // ── HP bar ──
    const barY     = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.435);
    const hpBarW   = panelW * 0.72;
    const hpBarH   = scale.screenScaleH(this.scene, scale.baseH * 0.016);
    const hpBarGfx = this.scene.add.graphics().setDepth(D + 3);
    hpBarGfx.fillStyle(0x1a2e1a, 1);
    hpBarGfx.fillRect(cx - hpBarW * 0.5, barY - hpBarH * 0.5, hpBarW, hpBarH);
    const fillColor = hpPct >= 0.5 ? 0x44ff88 : hpPct >= 0.25 ? 0xffcc00 : 0xff5555;
    hpBarGfx.fillStyle(fillColor, 1);
    hpBarGfx.fillRect(cx - hpBarW * 0.5, barY - hpBarH * 0.5, hpBarW * hpPct, hpBarH);
    hpBarGfx.lineStyle(1, 0x44ff88, 0.2);
    hpBarGfx.strokeRect(cx - hpBarW * 0.5, barY - hpBarH * 0.5, hpBarW, hpBarH);

    // ── Buttons ──
    const currentLevel = this.levelNum;
    const btnY    = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.495);
    const hasNext = !!(window.Levels?.[(currentLevel + 1)]?.waves?.length);

    if (hasNext) {
      const b1x = cx - panelW * 0.18;
      const b2x = cx + panelW * 0.18;

      this._overlayBtn(b1x, btnY, '▶  Next Level', 0x1a5a2a, 0x33aa55, () => {
        window._currentLevel = currentLevel + 1;
        window.startScene('GameScene');
      }, D);
      this._overlayBtn(b2x, btnY, '☰  Levels', 0x2a2a2a, 0x555555,
        () => window.startScene('LevelSelectScene'), D);
    } else {
      this._overlayBtn(cx, btnY, '☰  Back to Levels', 0x2a2a2a, 0x555555,
        () => window.startScene('LevelSelectScene'), D);
    }
  },

  // ========================================
  // LOSE SCREEN
  // ========================================

  _showLoseScreen() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this.arena;
    const scale        = window.Scale;
    const cx           = ARENA_X + ARENA_W * 0.5;
    const cy           = ARENA_Y + ARENA_H * 0.5;
    const wavesSurvived = Math.max(0, this._waveIndex - 1);
    const totalWaves   = this.levelCfg.waves.length;
    const hp           = 0;
    const wavePct      = totalWaves > 0 ? wavesSurvived / totalWaves : 0;

    const panelW = scale.screenScaleW(this.scene, scale.baseW * 0.50);
    const panelH = scale.screenScaleH(this.scene, scale.baseH * 0.56);
    const D      = 2000;

    // ── Dark backdrop ──
    this.scene.add.rectangle(cx, cy, ARENA_W, ARENA_H, 0x000000, 0.65).setDepth(D);

    // ── Panel shadow ──
    this.scene.add.rectangle(
      cx + scale.screenScaleW(this.scene, 6),
      cy + scale.screenScaleH(this.scene, 6),
      panelW, panelH, 0x000000, 0.5
    ).setDepth(D + 1);

    // ── Main panel ──
    this.scene.add.rectangle(cx, cy, panelW, panelH, 0x1a0505, 0.97).setDepth(D + 2);

    // ── Red top accent bar ──
    const barH = scale.screenScaleH(this.scene, scale.baseH * 0.007);
    this.scene.add.rectangle(
      cx, cy - panelH * 0.5 + barH * 0.5,
      panelW, barH, 0xff3333
    ).setDepth(D + 3);

    // ── Panel border ──
    const border = this.scene.add.graphics().setDepth(D + 3);
    border.lineStyle(scale.screenScaleW(this.scene, 2), 0xff3333, 0.5);
    border.strokeRect(cx - panelW * 0.5, cy - panelH * 0.5, panelW, panelH);

    // ── LEVEL badge ──
    const badgeFs = scale.screenScaleH(this.scene, scale.baseH * 0.025);
    const topY    = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.04);
    this.scene.add.text(cx, topY, `LEVEL ${this.levelNum}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize:   `${badgeFs}px`,
      fill:       '#ff5555',
      letterSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(D + 4);

    // ── GAME OVER title ──
    const titleFs = scale.screenScaleH(this.scene, scale.baseH * 0.085);
    const titleY  = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.115);
    this.scene.add.text(cx, titleY, 'GAME OVER', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize:   `${titleFs}px`,
      fill:       '#ff3333',
      stroke:     '#660000',
      strokeThickness: scale.screenScaleH(this.scene, 4),
    }).setOrigin(0.5, 0).setDepth(D + 4);

    // ── Skull icons ──
    const skullY    = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.255);
    const skullSize = scale.screenScaleH(this.scene, scale.baseH * 0.048);
    const skullGap  = scale.screenScaleW(this.scene, scale.baseW * 0.045);
    ['💀', '💀', '💀'].forEach((icon, i) => {
      this.scene.add.text(cx + (i - 1) * skullGap, skullY, icon, {
        fontFamily: 'Arial, sans-serif',
        fontSize:   `${skullSize}px`,
      }).setOrigin(0.5).setDepth(D + 4);
    });

    // ── Divider line ──
    const divY = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.315);
    const divW = panelW * 0.82;
    const divGfx = this.scene.add.graphics().setDepth(D + 3);
    divGfx.lineStyle(1, 0xff3333, 0.25);
    divGfx.lineBetween(cx - divW * 0.5, divY, cx + divW * 0.5, divY);

    // ── Stat cards ──
    const cardY   = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.355);
    const cardW   = panelW * 0.28;
    const cardH   = scale.screenScaleH(this.scene, scale.baseH * 0.095);
    const cardGap = panelW * 0.34;
    const labelFs = scale.screenScaleH(this.scene, scale.baseH * 0.024);
    const valueFs = scale.screenScaleH(this.scene, scale.baseH * 0.042);

    const waveColor = wavePct >= 0.75 ? '#44ff88' : wavePct >= 0.4 ? '#ffcc00' : '#ff5555';
    const cards = [
      { label: 'LEVEL', value: `${this.levelNum}`,               color: '#aaaaaa' },
      { label: 'WAVES', value: `${wavesSurvived}/${totalWaves}`, color: waveColor },
      { label: 'HP LEFT', value: '0',                            color: '#ff5555' },
    ];

    cards.forEach((card, i) => {
      const cardX = cx + (i - 1) * cardGap;
      this.scene.add.rectangle(cardX, cardY, cardW, cardH, 0x2e1a1a, 1).setDepth(D + 3);
      const cardBorder = this.scene.add.graphics().setDepth(D + 3);
      cardBorder.lineStyle(1, 0xff3333, 0.2);
      cardBorder.strokeRect(cardX - cardW * 0.5, cardY - cardH * 0.5, cardW, cardH);
      this.scene.add.text(cardX, cardY - cardH * 0.18, card.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize:   `${labelFs}px`,
        fill:       '#775555',
        letterSpacing: 2,
      }).setOrigin(0.5).setDepth(D + 4);
      this.scene.add.text(cardX, cardY + cardH * 0.22, card.value, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize:   `${valueFs}px`,
        fill:       card.color,
      }).setOrigin(0.5).setDepth(D + 4);
    });

    // ── Wave progress bar ──
    const barY     = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.435);
    const waveBarW = panelW * 0.72;
    const waveBarH = scale.screenScaleH(this.scene, scale.baseH * 0.016);
    const waveBarGfx = this.scene.add.graphics().setDepth(D + 3);
    waveBarGfx.fillStyle(0x2e1a1a, 1);
    waveBarGfx.fillRect(cx - waveBarW * 0.5, barY - waveBarH * 0.5, waveBarW, waveBarH);
    const fillCol = wavePct >= 0.75 ? 0x44ff88 : wavePct >= 0.4 ? 0xffcc00 : 0xff5555;
    waveBarGfx.fillStyle(fillCol, 1);
    waveBarGfx.fillRect(cx - waveBarW * 0.5, barY - waveBarH * 0.5, waveBarW * Math.max(wavePct, 0.03), waveBarH);
    waveBarGfx.lineStyle(1, 0xff3333, 0.2);
    waveBarGfx.strokeRect(cx - waveBarW * 0.5, barY - waveBarH * 0.5, waveBarW, waveBarH);

    // ── Buttons ──
    const btnY = cy - panelH * 0.5 + scale.screenScaleH(this.scene, scale.baseH * 0.495);
    const b1x  = cx - panelW * 0.18;
    const b2x  = cx + panelW * 0.18;

    this._overlayBtn(b1x, btnY, '↺  Try Again', 0x5a1a1a, 0xaa3333,
      () => window.startScene('GameScene'), D);
    this._overlayBtn(b2x, btnY, '☰  Levels', 0x2a2a2a, 0x555555,
      () => window.startScene('LevelSelectScene'), D);
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
      const current  = Math.min(this._waveIndex, total);
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
  // bgColor / hoverColor accept hex number (0xRRGGBB) or CSS string ('#rrggbb').

  _overlayBtn(x, y, label, bgColor, hoverColor, onClick, depth) {
    // Support old 4-arg signature: _overlayBtn(x, y, label, cssString, onClick)
    if (typeof hoverColor === 'function') {
      depth    = onClick;
      onClick  = hoverColor;
      hoverColor = bgColor;
    }
    depth = depth ?? 2000;

    const scale = window.Scale;
    const fs    = scale.screenScaleH(this.scene, scale.baseH * 0.036);
    const padX  = scale.screenScaleW(this.scene, scale.baseW * 0.022);
    const padY  = scale.screenScaleH(this.scene, scale.baseH * 0.013);

    // Convert hex number → CSS string if needed
    const toCss = (c) => typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c;
    const normalCss = toCss(bgColor);
    const hoverCss  = toCss(hoverColor);

    const btn = this.scene.add.text(x, y, label, {
      fontFamily:      'Arial, sans-serif',
      fontSize:        `${fs}px`,
      fill:            '#ffffff',
      backgroundColor: normalCss,
      padding:         { x: padX, y: padY },
    })
      .setOrigin(0.5)
      .setDepth(depth + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => btn.setStyle({ backgroundColor: hoverCss }))
      .on('pointerout',   () => btn.setStyle({ backgroundColor: normalCss }))
      .on('pointerdown',  onClick);

    return btn;
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
      const obj = window.ObjectFactory.createLevelObject(this.scene, entry.type, px, py, this.arena);
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
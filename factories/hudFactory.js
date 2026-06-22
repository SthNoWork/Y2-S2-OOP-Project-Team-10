// factories/hudFactory.js
// Handles in-game HUD elements, scene backgrounds, and end-of-round overlay screens.
// Split from uiFactory to keep HUD concerns separate from generic button helpers.
// Win/lose screen drawing lives here so levelManager stays focused on game logic.

window.HUDFactory = {};


// ── Basic HUD ─────────────────────────────────────────────────────────────────

// Creates the HP display text anchored to the top-left of the arena.
window.HUDFactory.addHealthText = function (scene, arena) {
  return scene.add.text(
    arena.ARENA_X + 19,
    arena.ARENA_Y + 11,
    '',
    {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '36px',
      fill: '#ff3333',
      backgroundColor: '#000000',
      padding: { x: 10, y: 6 },
    }
  );
};

// Adds a background image scaled to cover the full 1920×1080 canvas.
window.HUDFactory.addBackground = function (scene, path) {
  if (!path) return null;

  const key = `bg_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;

  if (!scene.textures.exists(key)) {
    window.logDebug?.(`[HUDFactory.addBackground] Missing texture: ${key}`);
    return null;
  }

  const img = scene.add.image(960, 540, key).setOrigin(0.5, 0.5);
  const src = scene.textures.get(key)?.getSourceImage?.();
  const texW = src?.width || 1;
  const texH = src?.height || 1;

  img.setScale(Math.max(1920 / texW, 1080 / texH));
  img.setDepth(-1000);
  img.setScrollFactor(0);

  return img;
};


// ── Shared overlay primitives ─────────────────────────────────────────────────

// Draws a labelled stat card (background rect + border + label + value).
window.HUDFactory._overlayStatCard = function (
  scene, cx, cy, cardW, cardH,
  bgColor, borderColor,
  labelFs, valueFs,
  labelText, valueText,
  labelColor, valueColor,
  depth
) {
  scene.add.rectangle(cx, cy, cardW, cardH, bgColor, 1).setDepth(depth);

  const border = scene.add.graphics().setDepth(depth);
  border.lineStyle(1, borderColor, 0.2);
  border.strokeRect(cx - cardW * 0.5, cy - cardH * 0.5, cardW, cardH);

  scene.add.text(cx, cy - cardH * 0.22, labelText, {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${labelFs}px`,
    fill: labelColor,
    letterSpacing: 2,
  }).setOrigin(0.5).setDepth(depth + 1);

  scene.add.text(cx, cy + cardH * 0.2, valueText, {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: `${valueFs}px`,
    fill: valueColor,
  }).setOrigin(0.5).setDepth(depth + 1);
};

// Draws a two-column score row (label left of cx, value right of cx).
window.HUDFactory._overlayScoreRow = function (
  scene, cx, cy,
  label, value,
  color, fontSize, fontStyle,
  depth
) {
  const s = {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${fontSize}px`,
    fill: color,
    fontStyle: fontStyle ?? 'normal',
  };

  scene.add.text(cx - 24, cy, label, s)
    .setOrigin(1, 0.5).setDepth(depth);
  scene.add.text(cx + 24, cy, value, { ...s, fontFamily: 'Arial Black, Arial, sans-serif' })
    .setOrigin(0, 0.5).setDepth(depth);
};

// Creates an overlay button with a hover highlight.
// Canvas is always 1920×1080 so sizes are fixed px values.
window.HUDFactory._overlayBtn = function (scene, x, y, label, bgColor, hoverColor, onClick, depth) {
  depth = depth ?? 2010;  // above all panel layers (D+4 = 2004 is the highest used)

  const toCss = (c) => typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c;
  const normalCss = toCss(bgColor);
  const hoverCss = toCss(hoverColor);

  const btn = scene.add.text(x, y, label, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '39px',
    fill: '#ffffff',
    backgroundColor: normalCss,
    padding: { x: 42, y: 14 },
  })
    .setOrigin(0.5)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });

  if (!scene.sys.game.device.input.touch) {
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: hoverCss }))
       .on('pointerout', () => btn.setStyle({ backgroundColor: normalCss }));
  }
  btn.on('pointerdown', onClick);
    
  return btn;
};


// ── Win screen ────────────────────────────────────────────────────────────────

window.HUDFactory.showWinScreen = function (scene, arena, opts) {
  try { window.SfxManager?.muteAll?.(); } catch (e) { }
  try { window.SfxManager?.playComplete?.(); } catch (e) { }

  const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = arena;
  const { levelNum, totalWaves, hp, maxHp, objectScore, playerBonus, total, onNext, onLevels } = opts;

  const cx = ARENA_X + ARENA_W * 0.5;
  const cy = ARENA_Y + ARENA_H * 0.5;
  const hpPct = maxHp > 0 ? hp / maxHp : 0;
  const stars = hpPct >= 0.75 ? 3 : hpPct >= 0.35 ? 2 : 1;
  const D = 2000;

  // Layout constants (all px, canvas = 1920×1080)
  const panelW = 1056;   // ~55% of 1920
  const panelH = 780;
  const topEdge = cy - panelH * 0.5;

  _winPanel(scene, cx, cy, topEdge, panelW, panelH, D);
  _winHeader(scene, cx, topEdge, levelNum, D);
  _winStars(scene, cx, topEdge, stars, D);
  _winDivider(scene, cx, topEdge, panelW, 295, D);
  _winStatCards(scene, cx, topEdge, panelW, levelNum, totalWaves, hp, hpPct, D);
  _winHpBar(scene, cx, topEdge, panelW, hpPct, D);
  _winDivider(scene, cx, topEdge, panelW, 453, D);
  _winScoreRows(scene, cx, topEdge, objectScore, playerBonus, total, D);
  _winButtons(scene, cx, topEdge, panelW, onNext, onLevels);
};

function _winPanel(scene, cx, cy, topEdge, panelW, panelH, D) {
  scene.add.rectangle(cx, cy, panelW, panelH, 0x0d1b0d, 0.97).setDepth(D + 2);
  scene.add.rectangle(cx, topEdge + 4, panelW, 8, 0x44ff88).setDepth(D + 3);

  const border = scene.add.graphics().setDepth(D + 3);
  border.lineStyle(2, 0x44ff88, 0.6);
  border.strokeRect(cx - panelW * 0.5, topEdge, panelW, panelH);
}

function _winHeader(scene, cx, topEdge, levelNum, D) {
  scene.add.text(cx, topEdge + 38, `LEVEL ${levelNum}`, {
    fontFamily: 'Arial, sans-serif', fontSize: '27px',
    fill: '#44ff88', letterSpacing: 4,
  }).setOrigin(0.5, 0).setDepth(D + 4);

  scene.add.text(cx, topEdge + 75, 'YOU WIN!', {
    fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '92px',
    fill: '#44ff88', stroke: '#006633', strokeThickness: 4,
  }).setOrigin(0.5, 0).setDepth(D + 4);
}

function _winStars(scene, cx, topEdge, stars, D) {
  const starGap = 86;
  [-starGap, 0, starGap].forEach((offset, i) => {
    const filled = i < stars;
    scene.add.text(cx + offset, topEdge + 220, '★', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '56px',
      fill: filled ? '#ffd700' : '#2a2a2a',
      stroke: filled ? '#b8860b' : '#444444',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(D + 4);
  });
}

function _winDivider(scene, cx, topEdge, panelW, offsetY, D) {
  const g = scene.add.graphics().setDepth(D + 3);
  g.lineStyle(1, 0x44ff88, 0.25);
  g.lineBetween(cx - panelW * 0.41, topEdge + offsetY, cx + panelW * 0.41, topEdge + offsetY);
}

function _winStatCards(scene, cx, topEdge, panelW, levelNum, totalWaves, hp, hpPct, D) {
  const cardW = panelW * 0.28;
  const cardH = 90;
  const cardGap = panelW * 0.34;
  const cardY = topEdge + 355;
  const hpColor = hpPct >= 0.5 ? '#44ff88' : hpPct >= 0.25 ? '#ffcc00' : '#ff5555';

  [
    { label: 'LEVEL', value: `${levelNum}`, color: '#aaaaaa' },
    { label: 'WAVES', value: `${totalWaves}/${totalWaves}`, color: '#44ccff' },
    { label: 'HP LEFT', value: `${hp}`, color: hpColor },
  ].forEach((card, i) => {
    window.HUDFactory._overlayStatCard(
      scene, cx + (i - 1) * cardGap, cardY,
      cardW, cardH, 0x1a2e1a, 0x44ff88, 22, 38,
      card.label, card.value, '#778877', card.color, D + 3
    );
  });
}

function _winHpBar(scene, cx, topEdge, panelW, hpPct, D) {
  const barY = topEdge + 425;
  const barW = panelW * 0.72;
  const barH = 14;
  const fill = hpPct >= 0.5 ? 0x44ff88 : hpPct >= 0.25 ? 0xffcc00 : 0xff5555;
  const g = scene.add.graphics().setDepth(D + 3);

  g.fillStyle(0x1a2e1a, 1);
  g.fillRect(cx - barW * 0.5, barY - barH * 0.5, barW, barH);
  g.fillStyle(fill, 1);
  g.fillRect(cx - barW * 0.5, barY - barH * 0.5, barW * Math.max(hpPct, 0.02), barH);
  g.lineStyle(1, 0x44ff88, 0.2);
  g.strokeRect(cx - barW * 0.5, barY - barH * 0.5, barW, barH);
}

function _winScoreRows(scene, cx, topEdge, objectScore, playerBonus, total, D) {
  const rowH = 52;
  const startY = topEdge + 485;

  window.HUDFactory._overlayScoreRow(scene, cx, startY, 'Objects', `${objectScore} pts`, '#cccccc', 28, 'normal', D + 4);
  window.HUDFactory._overlayScoreRow(scene, cx, startY + rowH, 'Perfect HP Bonus', playerBonus ? `+${playerBonus}` : '—', playerBonus ? '#ffdd44' : '#555555', 28, 'normal', D + 4);
  window.HUDFactory._overlayScoreRow(scene, cx, startY + rowH * 2, 'Score', `${total} pts`, '#44ff88', 38, 'bold', D + 4);
}

function _winButtons(scene, cx, topEdge, panelW, onNext, onLevels) {
  const btnY = topEdge + 720;

  if (onNext) {
    window.HUDFactory._overlayBtn(scene, cx - panelW * 0.18, btnY, '▶  Next Level', 0x1a5a2a, 0x33aa55, onNext);
    window.HUDFactory._overlayBtn(scene, cx + panelW * 0.18, btnY, '☰  Levels', 0x2a2a2a, 0x555555, onLevels);
  } else {
    window.HUDFactory._overlayBtn(scene, cx, btnY, '☰  Back to Levels', 0x2a2a2a, 0x555555, onLevels);
  }
}


// ── Lose screen ───────────────────────────────────────────────────────────────

window.HUDFactory.showLoseScreen = function (scene, arena, opts) {
  try { window.SfxManager?.muteAll?.(); } catch (e) { }
  try { window.SfxManager?.playFail?.(); } catch (e) { }

  const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = arena;
  const { levelNum, wavesSurvived, totalWaves, onRetry, onLevels } = opts;

  const cx = ARENA_X + ARENA_W * 0.5;
  const cy = ARENA_Y + ARENA_H * 0.5;
  const wavePct = totalWaves > 0 ? wavesSurvived / totalWaves : 0;
  const D = 2000;

  const panelW = 1056;
  const panelH = 650;
  const topEdge = cy - panelH * 0.5;

  _losePanel(scene, cx, cy, topEdge, panelW, panelH, D);
  _loseHeader(scene, cx, topEdge, levelNum, D);
  _loseSkulls(scene, cx, topEdge, D);
  _loseDivider(scene, cx, topEdge, panelW, D);
  _loseStatCards(scene, cx, topEdge, panelW, levelNum, wavesSurvived, totalWaves, wavePct, D);
  _loseWaveBar(scene, cx, topEdge, panelW, wavePct, D);
  _loseButtons(scene, cx, topEdge, panelW, onRetry, onLevels);
};

function _losePanel(scene, cx, cy, topEdge, panelW, panelH, D) {
  scene.add.rectangle(cx, cy, panelW, panelH, 0x1a0505, 0.97).setDepth(D + 2);
  scene.add.rectangle(cx, topEdge + 4, panelW, 8, 0xff3333).setDepth(D + 3);

  const border = scene.add.graphics().setDepth(D + 3);
  border.lineStyle(2, 0xff3333, 0.5);
  border.strokeRect(cx - panelW * 0.5, topEdge, panelW, panelH);
}

function _loseHeader(scene, cx, topEdge, levelNum, D) {
  scene.add.text(cx, topEdge + 38, `LEVEL ${levelNum}`, {
    fontFamily: 'Arial, sans-serif', fontSize: '27px',
    fill: '#ff5555', letterSpacing: 4,
  }).setOrigin(0.5, 0).setDepth(D + 4);

  scene.add.text(cx, topEdge + 75, 'GAME OVER', {
    fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '92px',
    fill: '#ff3333', stroke: '#660000', strokeThickness: 4,
  }).setOrigin(0.5, 0).setDepth(D + 4);
}

function _loseSkulls(scene, cx, topEdge, D) {
  const skullGap = 86;
  ['💀', '💀', '💀'].forEach((icon, i) => {
    scene.add.text(cx + (i - 1) * skullGap, topEdge + 240, icon, {
      fontFamily: 'Arial, sans-serif', fontSize: '52px',
    }).setOrigin(0.5).setDepth(D + 4);
  });
}

function _loseDivider(scene, cx, topEdge, panelW, D) {
  const g = scene.add.graphics().setDepth(D + 3);
  g.lineStyle(1, 0xff3333, 0.25);
  g.lineBetween(cx - panelW * 0.41, topEdge + 305, cx + panelW * 0.41, topEdge + 305);
}

function _loseStatCards(scene, cx, topEdge, panelW, levelNum, wavesSurvived, totalWaves, wavePct, D) {
  const cardW = panelW * 0.28;
  const cardH = 90;
  const cardGap = panelW * 0.34;
  const cardY = topEdge + 368;
  const waveColor = wavePct >= 0.75 ? '#44ff88' : wavePct >= 0.4 ? '#ffcc00' : '#ff5555';

  [
    { label: 'LEVEL', value: `${levelNum}`, color: '#aaaaaa' },
    { label: 'WAVES', value: `${wavesSurvived}/${totalWaves}`, color: waveColor },
    { label: 'HP LEFT', value: '0', color: '#ff5555' },
  ].forEach((card, i) => {
    window.HUDFactory._overlayStatCard(
      scene, cx + (i - 1) * cardGap, cardY,
      cardW, cardH, 0x2e1a1a, 0xff3333, 22, 38,
      card.label, card.value, '#775555', card.color, D + 3
    );
  });
}

function _loseWaveBar(scene, cx, topEdge, panelW, wavePct, D) {
  const barY = topEdge + 478;
  const barW = panelW * 0.72;
  const barH = 16;
  const fill = wavePct >= 0.75 ? 0x44ff88 : wavePct >= 0.4 ? 0xffcc00 : 0xff5555;
  const g = scene.add.graphics().setDepth(D + 3);

  g.fillStyle(0x2e1a1a, 1);
  g.fillRect(cx - barW * 0.5, barY - barH * 0.5, barW, barH);
  g.fillStyle(fill, 1);
  g.fillRect(cx - barW * 0.5, barY - barH * 0.5, barW * Math.max(wavePct, 0.03), barH);
  g.lineStyle(1, 0xff3333, 0.2);
  g.strokeRect(cx - barW * 0.5, barY - barH * 0.5, barW, barH);
}

function _loseButtons(scene, cx, topEdge, panelW, onRetry, onLevels) {
  const btnY = topEdge + 580;
  window.HUDFactory._overlayBtn(scene, cx - panelW * 0.18, btnY, '↺  Try Again', 0x5a1a1a, 0xaa3333, onRetry);
  window.HUDFactory._overlayBtn(scene, cx + panelW * 0.18, btnY, '☰  Levels', 0x2a2a2a, 0x555555, onLevels);
}
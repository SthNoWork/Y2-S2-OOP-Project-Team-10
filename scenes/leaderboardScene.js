// scenes/leaderboardScene.js
// Displays the global leaderboard fetched from Firestore.
// Supports infinite scroll — loads 20 rows at a time via Firestore cursor pagination.
// Falls back to the locally cached snapshot if the network is unavailable.
// The logged-in user's row is highlighted green.

const LB = {
  PAGE:      20,    // rows per fetch
  ROW_H:     58,    // px per row
  FIRST_Y:   210,   // y of first data row (below fixed header)
  COL_RANK:  200,   // x – rank column centre
  COL_NAME:  360,   // x – name column left edge
  COL_SCORE: 1740,  // x – score column right edge
  TABLE_W:   1640,  // width of the full table band
  HEADER_Y:  156,   // y of column-header text
};

class LeaderboardScene extends Phaser.Scene {

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  create() {
    // Scroll state
    this._scrollY   = 0;
    this._maxScroll = 0;
    this._cursor    = null;   // Firestore DocumentSnapshot for next page
    this._hasMore   = false;
    this._loading   = false;
    this._nextRowY  = LB.FIRST_Y;
    this._rowCount  = 0;

    this._drawChrome();
    this._loadMore();

    // ── Mouse-wheel scroll ──
    this.input.on('wheel', (_p, _objs, _dx, dy) => {
      this._setScroll(this._scrollY + dy * 0.8);
    });
  }

  // ── Chrome (fixed, scrollFactor 0) ───────────────────────────────────────

  _drawChrome() {
    const D = 100;

    // Background
    this.add.rectangle(960, 540, 1920, 1080, 0x0b0f0b).setDepth(0).setScrollFactor(0);

    // Thin green accent bar at top
    this.add.rectangle(960, 4, 1920, 8, 0x44ff88, 0.9).setDepth(D).setScrollFactor(0);

    // Title
    this.add.text(960, 28, 'LEADERBOARD', {
      fontFamily:      'Arial Black, Arial, sans-serif',
      fontSize:        '54px',
      fill:            '#44ff88',
      stroke:          '#003322',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(D).setScrollFactor(0);

    // Back button
    window.UIFactory.addBackButton(this, () => window.showHomeScreen())
      .setScrollFactor(0).setDepth(D);

    // Auth hint (shown for logged-out users)
    const uid = window.FirebaseAuth?.currentUser?.uid ?? null;
    if (!uid) {
      this.add.text(960, 100, 'Sign in to save your scores', {
        fontFamily: 'Arial, sans-serif',
        fontSize:   '20px',
        fill:       '#ffcc66',
        backgroundColor: '#181208',
        padding:    { x: 14, y: 7 },
      }).setOrigin(0.5, 0).setDepth(D).setScrollFactor(0);
    }

    // Column headers
    const hStyle = {
      fontFamily:    'Arial, sans-serif',
      fontSize:      '20px',
      fill:          '#44ff88',
      letterSpacing: 3,
    };
    this.add.text(LB.COL_RANK,  LB.HEADER_Y, 'RANK',   hStyle).setOrigin(0.5, 0).setDepth(D).setScrollFactor(0);
    this.add.text(LB.COL_NAME,  LB.HEADER_Y, 'PLAYER', hStyle).setOrigin(0,   0).setDepth(D).setScrollFactor(0);
    this.add.text(LB.COL_SCORE, LB.HEADER_Y, 'SCORE',  hStyle).setOrigin(1,   0).setDepth(D).setScrollFactor(0);

    // Divider under headers
    const g = this.add.graphics().setDepth(D).setScrollFactor(0);
    g.lineStyle(1, 0x44ff88, 0.2);
    g.lineBetween(140, LB.HEADER_Y + 34, 1780, LB.HEADER_Y + 34);

    // Fade-out mask at bottom so rows dissolve before the edge
    const fade = this.add.graphics().setDepth(D + 10).setScrollFactor(0);
    fade.fillGradientStyle(0x0b0f0b, 0x0b0f0b, 0x0b0f0b, 0x0b0f0b, 0, 0, 1, 1);
    fade.fillRect(0, 960, 1920, 120);
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  async _loadMore() {
    if (this._loading || this._loadMoreBtn) {
      this._loadMoreBtn?.destroy();
      this._loadMoreBtn = null;
    }
    this._loading = true;
    this._showSpinner(true);

    const { entries, lastDoc, hasMore } =
      await window.LeaderboardService.fetchScores(LB.PAGE, this._cursor);

    this._cursor  = lastDoc;
    this._hasMore = hasMore;

    this._showSpinner(false);
    this._loading = false;

    if (this._rowCount === 0 && entries.length === 0) {
      this._drawEmpty();
      return;
    }

    entries.forEach((entry) => this._drawRow(entry, this._rowCount++));

    if (hasMore) {
      this._drawLoadMoreBtn();
    } else {
      this._drawEndLabel();
    }

    this._updateMaxScroll();
  }

  // ── Row drawing ───────────────────────────────────────────────────────────

  _drawRow(entry, i) {
    const uid   = window.FirebaseAuth?.currentUser?.uid ?? null;
    const isMe  = entry.uid === uid;
    const rowY  = LB.FIRST_Y + i * LB.ROW_H;
    const cy    = rowY + LB.ROW_H * 0.5;
    const D     = 10;

    // Row background
    const bgAlpha = isMe ? 0.9 : 0.7;
    const bgColor = isMe ? 0x162b1c : (i % 2 === 0 ? 0x0f180f : 0x0b120b);
    this.add.rectangle(960, cy, LB.TABLE_W, LB.ROW_H - 3, bgColor, bgAlpha).setDepth(D);

    // Green left-edge accent for current user
    if (isMe) {
      this.add.rectangle(141, cy, 4, LB.ROW_H - 3, 0x44ff88).setDepth(D + 1);
    }

    // Colours
    const RANK_ICONS = ['🥇', '🥈', '🥉'];
    const accent = isMe ? '#44ff88' : i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#aaaaaa';
    const family = isMe ? 'Arial Black, Arial, sans-serif' : 'Arial, sans-serif';

    const base = { fontFamily: family, fontSize: '26px', fill: accent };

    // Rank
    const rankLabel = i < 3 ? RANK_ICONS[i] : `#${i + 1}`;
    this.add.text(LB.COL_RANK, cy, rankLabel, { ...base, fontSize: i < 3 ? '28px' : '24px' })
      .setOrigin(0.5, 0.5).setDepth(D + 1);

    // Name
    const name = this._truncate(entry.displayName || 'Anonymous', 34);
    this.add.text(LB.COL_NAME, cy, name, { ...base, fill: isMe ? '#44ff88' : '#cccccc' })
      .setOrigin(0, 0.5).setDepth(D + 1);

    // Score
    const scoreLabel = `${(entry.total_score ?? 0).toLocaleString()} pts`;
    this.add.text(LB.COL_SCORE, cy, scoreLabel, { ...base, fontFamily: 'Arial Black, Arial, sans-serif' })
      .setOrigin(1, 0.5).setDepth(D + 1);

    this._nextRowY = rowY + LB.ROW_H;
    this._updateMaxScroll();
  }

  // ── Load More button ──────────────────────────────────────────────────────

  _drawLoadMoreBtn() {
    const y = this._nextRowY + 40;
    this._loadMoreBtn = this.add.text(960, y, 'Load More', {
      fontFamily:      'Arial, sans-serif',
      fontSize:        '26px',
      fill:            '#44ff88',
      backgroundColor: '#162b1c',
      padding:         { x: 36, y: 12 },
    })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => this._loadMoreBtn?.setStyle({ backgroundColor: '#1e3d28' }))
      .on('pointerout',   () => this._loadMoreBtn?.setStyle({ backgroundColor: '#162b1c' }))
      .on('pointerdown',  () => this._loadMore());

    this._nextRowY = y + 60;
    this._updateMaxScroll();
  }

  _drawEndLabel() {
    const y = this._nextRowY + 32;
    this.add.text(960, y, '— end of leaderboard —', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '20px',
      fill:       '#334433',
    }).setOrigin(0.5, 0).setDepth(10);
    this._nextRowY = y + 40;
  }

  _drawEmpty() {
    this.add.text(960, 500, 'No scores yet — play a level to get on the board!', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '30px',
      fill:       '#334433',
    }).setOrigin(0.5).setDepth(10);
  }

  // ── Spinner ───────────────────────────────────────────────────────────────

  _showSpinner(visible) {
    if (visible) {
      this._spinner = this.add.text(960, this._nextRowY + 30, 'Loading…', {
        fontFamily: 'Arial, sans-serif',
        fontSize:   '26px',
        fill:       '#334433',
      }).setOrigin(0.5, 0).setDepth(20);
    } else {
      this._spinner?.destroy();
      this._spinner = null;
    }
  }

  // ── Scroll helpers ────────────────────────────────────────────────────────

  _updateMaxScroll() {
    // Content height minus the visible window (minus fixed header area)
    this._maxScroll = Math.max(0, this._nextRowY - 1080 + 160);
  }

  _setScroll(y) {
    this._scrollY = Phaser.Math.Clamp(y, 0, this._maxScroll);
    this.cameras.main.setScrollY(this._scrollY);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _truncate(str, max) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }
}
// scenes/leaderboardScene.js
// Displays the top-10 global leaderboard fetched from Firestore.
// Falls back to the locally cached snapshot if the network is unavailable.
// The logged-in user's row is highlighted green.

class LeaderboardScene extends Phaser.Scene {

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  create() {
    this._drawChrome();

    // Show a loading indicator while the async fetch runs.
    this._loadingText = this.add.text(960, 540, 'Loading scores…', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '36px',
      fill:       '#666666',
    }).setOrigin(0.5).setDepth(1);

    window.LeaderboardService.fetchTopScores(10).then((entries) => {
      if (this._loadingText?.active) this._loadingText.destroy();
      this._drawTable(entries);
    });
  }

  // ── Static chrome (background, title, back button) ────────────────────────

  _drawChrome() {
    // Dark background
    this.add.rectangle(960, 540, 1920, 1080, 0x080e08).setDepth(0);

    // Accent bar across the top
    this.add.rectangle(960, 6, 1920, 12, 0x44ff88).setDepth(1);

    // Title
    this.add.text(960, 32, 'LEADERBOARD', {
      fontFamily:      'Arial Black, Arial, sans-serif',
      fontSize:        '72px',
      fill:            '#44ff88',
      stroke:          '#004422',
      strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(1);

    // Back button (top-left, matching other scenes)
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());
  }

  // ── Table ─────────────────────────────────────────────────────────────────

  _drawTable(entries) {
    const currentUid = window.FirebaseAuth?.currentUser?.uid ?? null;

    // ── Column x-positions (canvas = 1920) ──────────────────────────────
    const LEFT    = 180;
    const COL = {
      rank:  LEFT,
      name:  LEFT + 160,
      score: LEFT + 1460,
    };

    // ── Header row ───────────────────────────────────────────────────────
    const HEADER_Y = 148;
    const headerStyle = {
      fontFamily:    'Arial, sans-serif',
      fontSize:      '26px',
      fill:          '#44ff88',
      letterSpacing: 3,
    };

    this.add.text(COL.rank,  HEADER_Y, 'RANK',   headerStyle).setOrigin(0.5, 0).setDepth(1);
    this.add.text(COL.name,  HEADER_Y, 'PLAYER', headerStyle).setOrigin(0,   0).setDepth(1);
    this.add.text(COL.score, HEADER_Y, 'SCORE',  headerStyle).setOrigin(1,   0).setDepth(1);

    if (!currentUid) {
      this.add.text(960, 102, 'Sign in to save your scores. Logged-out runs stay local on this device only.', {
        fontFamily: 'Arial, sans-serif',
        fontSize:   '24px',
        fill:       '#ffcc66',
        backgroundColor: 'rgba(24, 20, 8, 0.7)',
        padding:    { x: 16, y: 10 },
      }).setOrigin(0.5, 0.5).setDepth(2);
    }

    // Divider under header
    const hDiv = this.add.graphics().setDepth(1);
    hDiv.lineStyle(1, 0x44ff88, 0.35);
    hDiv.lineBetween(LEFT - 60, HEADER_Y + 38, COL.score + 60, HEADER_Y + 38);

    // ── Data rows ────────────────────────────────────────────────────────
    const ROW_H    = 68;
    const FIRST_Y  = HEADER_Y + 58;
    const RANK_ICONS = ['🥇', '🥈', '🥉'];

    if (entries.length === 0) {
      this.add.text(960, 540, 'No scores yet — play a level to get on the board!', {
        fontFamily: 'Arial, sans-serif',
        fontSize:   '34px',
        fill:       '#444444',
      }).setOrigin(0.5).setDepth(1);
      return;
    }

    entries.forEach((entry, i) => {
      const rowY  = FIRST_Y + i * ROW_H;
      const isMe  = entry.uid === currentUid;

      // Row background — alternate shades, highlight current user
      const bgCol = isMe
        ? 0x173317
        : i % 2 === 0 ? 0x0d160d : 0x0a110a;

      this.add.rectangle(960, rowY + ROW_H * 0.5 - 2, 1640, ROW_H - 6, bgCol, 0.85)
        .setDepth(1);

      // Green left-edge accent for current user's row
      if (isMe) {
        this.add.rectangle(LEFT - 56, rowY + ROW_H * 0.5 - 2, 6, ROW_H - 6, 0x44ff88)
          .setDepth(2);
      }

      // Text colour: gold/silver/bronze for top 3, green for self, default grey
      const nameColor = isMe
        ? '#44ff88'
        : i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#cccccc';

      const rowStyle = {
        fontFamily: isMe
          ? 'Arial Black, Arial, sans-serif'
          : 'Arial, sans-serif',
        fontSize: '30px',
        fill:     nameColor,
      };

      const cy = rowY + ROW_H * 0.5 - 2;

      // Rank
      const rankLabel = i < 3 ? RANK_ICONS[i] : `#${i + 1}`;
      this.add.text(COL.rank, cy, rankLabel, { ...rowStyle, fontSize: '32px' })
        .setOrigin(0.5, 0.5).setDepth(2);

      // Name (truncate long names so they don't overflow)
      const name = this._truncate(entry.displayName || 'Anonymous', 32);
      this.add.text(COL.name, cy, name, rowStyle)
        .setOrigin(0, 0.5).setDepth(2);

      // Total score — bold
      const scoreStyle = { ...rowStyle, fontFamily: 'Arial Black, Arial, sans-serif' };
      const scoreLabel = `${(entry.total_score ?? 0).toLocaleString()} pts`;
      this.add.text(COL.score, cy, scoreLabel, scoreStyle)
        .setOrigin(1, 0.5).setDepth(2);
    });

    // Bottom note
    this.add.text(960, 1040, currentUid
      ? 'Top 10 global scores  •  Updates after each completed level'
      : 'Top 10 global scores  •  Sign in to keep your scores across sessions', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '22px',
      fill:       '#334433',
    }).setOrigin(0.5, 1).setDepth(1);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _truncate(str, max) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }
}
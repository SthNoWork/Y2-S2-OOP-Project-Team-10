// scenes/profileScene.js
class ProfileScene extends Phaser.Scene {
  constructor() { super('ProfileScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#0d0d1a');
    window.UIFactory.addBackground(this, 'asset/background/5.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());

    const cx = 960;
    const cy = 540;
    const user = window.FirebaseAuth?.currentUser;

    if (!user) {
      this._showLoggedOut(cx, cy);
    } else {
      this._showProfile(cx, cy, user);
    }
  }

  // ── Logged-out view ───────────────────────────────────────────────────────

  _showLoggedOut(cx, cy) {
    this.add.text(cx, cy - 60, 'Not signed in', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '40px',
      fill: '#888888',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(cx, cy + 14, 'Sign in to save your progress and scores.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      fill: '#666666',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(cx, cy + 100, 'Sign in with Google', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      fill: '#ffffff',
      backgroundColor: '#4285f4',
      padding: { x: 34, y: 14 },
    })
      .setOrigin(0.5).setDepth(10)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => window.FirebaseAuth?.login());
  }

  // ── Logged-in view ────────────────────────────────────────────────────────

  _showProfile(cx, cy, user) {
    const scores      = window.GameData.getServerCache();
    const totalLevels = Object.keys(window.Levels ?? {}).length || 1;

    const panelW  = 860;
    const panelH  = Math.min(760, 160 + totalLevels * 54 + 160);
    const topEdge = cy - panelH * 0.5;
    const D       = 10;

    // ── Panel ──
    this.add.rectangle(cx, cy, panelW, panelH, 0x0d1b2e, 0.97).setDepth(D);
    const border = this.add.graphics().setDepth(D);
    border.lineStyle(2, 0x4488ff, 0.5);
    border.strokeRect(cx - panelW * 0.5, topEdge, panelW, panelH);
    this.add.rectangle(cx, topEdge + 4, panelW, 8, 0x4488ff).setDepth(D + 1);

    // ── Name + email ──
    this.add.text(cx, topEdge + 52, user.displayName || 'Player', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize:   '46px',
      fill:       '#ffffff',
    }).setOrigin(0.5).setDepth(D + 1);

    this.add.text(cx, topEdge + 108, user.email || '', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '24px',
      fill:       '#7799bb',
    }).setOrigin(0.5).setDepth(D + 1);

    // ── Divider ──
    this._hline(cx, topEdge + 144, panelW * 0.8, 0x4488ff, 0.25, D + 1);

    // ── Level score rows ──
    const rowH   = 54;
    const startY = topEdge + 172;

    for (let i = 1; i <= totalLevels; i++) {
      const score  = scores[`level_${i}`] || 0;
      const beaten = score > 0;
      const y      = startY + (i - 1) * rowH;

      // Alternate row tint
      if (i % 2 === 0) {
        this.add.rectangle(cx, y, panelW - 4, rowH - 2, 0x112233, 0.4).setDepth(D);
      }

      this.add.text(cx - 280, y, `Level ${i}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize:   '28px',
        fill:       beaten ? '#ccddff' : '#444466',
      }).setOrigin(0, 0.5).setDepth(D + 1);

      const scoreLabel = beaten ? `${score.toLocaleString()} pts` : '—';
      this.add.text(cx + 280, y, scoreLabel, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize:   '28px',
        fill:       beaten ? '#44ccff' : '#333355',
      }).setOrigin(1, 0.5).setDepth(D + 1);
    }

    // ── Total score ──
    const divY = startY + totalLevels * rowH + 6;
    this._hline(cx, divY, panelW * 0.8, 0x4488ff, 0.2, D + 1);

    const total = scores.total_score || 0;
    this.add.text(cx - 280, divY + 38, 'Total Score', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '32px',
      fill:       '#4488ff',
    }).setOrigin(0, 0.5).setDepth(D + 1);

    this.add.text(cx + 280, divY + 38, `${total.toLocaleString()} pts`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize:   '32px',
      fill:       '#44ffaa',
    }).setOrigin(1, 0.5).setDepth(D + 1);

    // ── Sign-out button ──
    this.add.text(cx, topEdge + panelH - 46, 'Sign Out', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '30px',
      fill:       '#ffffff',
      backgroundColor: '#882222',
      padding: { x: 34, y: 12 },
    })
      .setOrigin(0.5).setDepth(D + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        await window.FirebaseAuth?.logout();
        window.showHomeScreen();
      });
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  _hline(cx, y, w, color, alpha, depth) {
    const g = this.add.graphics().setDepth(depth);
    g.lineStyle(1, color, alpha);
    g.lineBetween(cx - w * 0.5, y, cx + w * 0.5, y);
  }
}
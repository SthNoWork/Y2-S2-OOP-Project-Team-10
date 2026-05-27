// scenes/profileScene.js
class ProfileScene extends Phaser.Scene {
  constructor() { super('ProfileScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#0d0d1a');
    window.UIFactory.addBackground(this, 'asset/background/5.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());

    this._renderables = [];
    this._render();

    // Re-render immediately whenever auth state resolves (login popup, logout, etc.)
    this._onAuth = () => this._refresh();
    window.addEventListener('authStateChanged', this._onAuth);

    // Clean up the listener when the scene stops
    this.events.once('shutdown', () => window.removeEventListener('authStateChanged', this._onAuth));
    this.events.once('destroy',  () => window.removeEventListener('authStateChanged', this._onAuth));
  }

  // ── Render lifecycle ──────────────────────────────────────────────────────

  _refresh() {
    this._renderables.forEach(o => { try { if (o?.active) o.destroy(); } catch (e) {} });
    this._renderables = [];
    this._render();
  }

  // Push any number of Phaser objects into the tracked list. Returns the first.
  _track(...objs) {
    for (const o of objs) if (o) this._renderables.push(o);
    return objs[0];
  }

  _render() {
    const user = window.FirebaseAuth?.currentUser;
    if (user) {
      this._showProfile(user);
    } else {
      this._showLoggedOut();
    }
  }

  // ── Logged-out view ───────────────────────────────────────────────────────

  _showLoggedOut() {
    const cx = 960, cy = 540;
    const pw = 680, ph = 400;
    const top = cy - ph / 2;
    const D = 10;

    // Panel
    this._track(this.add.rectangle(cx, cy, pw, ph, 0x080f1c, 0.97).setDepth(D));

    const borderGfx = this.add.graphics().setDepth(D);
    borderGfx.lineStyle(2, 0x2a3f5f, 0.8);
    borderGfx.strokeRect(cx - pw / 2, top, pw, ph);
    this._track(borderGfx);

    // Blue accent bar at top
    this._track(this.add.rectangle(cx, top + 4, pw, 8, 0x4488ff).setDepth(D + 1));

    // Avatar placeholder
    const avatarGfx = this.add.graphics().setDepth(D + 1);
    avatarGfx.fillStyle(0x162030, 1);
    avatarGfx.fillCircle(cx, top + 90, 48);
    avatarGfx.lineStyle(2, 0x2a4060, 0.8);
    avatarGfx.strokeCircle(cx, top + 90, 48);
    this._track(avatarGfx);

    this._track(this.add.text(cx, top + 90, '?', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '46px',
      fill: '#334d6e',
    }).setOrigin(0.5).setDepth(D + 2));

    // Heading
    this._track(this.add.text(cx, top + 168, 'Not signed in', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '36px',
      fill: '#7799bb',
    }).setOrigin(0.5).setDepth(D + 1));

    // Sub text
    this._track(this.add.text(cx, top + 218, 'Sign in to save your progress and see your scores', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fill: '#334d66',
    }).setOrigin(0.5).setDepth(D + 1));

    // Google sign-in button
    const btn = this.add.text(cx, top + 310, '  Sign in with Google  ', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#ffffff',
      backgroundColor: '#2d5fcc',
      padding: { x: 40, y: 15 },
    })
      .setOrigin(0.5).setDepth(D + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setStyle({ backgroundColor: '#1a48aa' }))
      .on('pointerout',  () => btn.setStyle({ backgroundColor: '#2d5fcc' }))
      .on('pointerdown', async () => {
        btn.setText('Signing in…').setStyle({ backgroundColor: '#112a6e' });
        btn.disableInteractive();
        try {
          await window.FirebaseAuth?.login();
          // authStateChanged fires → _refresh() runs → this scene re-renders
        } catch {
          btn.setText('  Sign in with Google  ')
            .setStyle({ backgroundColor: '#2d5fcc' })
            .setInteractive({ useHandCursor: true });
        }
      });
    this._track(btn);
  }

  // ── Logged-in view ────────────────────────────────────────────────────────

  _showProfile(user) {
    const cx = 960, cy = 540;
    const scores      = window.GameData.getServerCache();
    const totalLevels = Object.keys(window.Levels ?? {}).length || 1;
    const D = 10;

    // Panel sizing — grows with level count
    const panelW  = 860;
    const rowH    = 52;
    const headerH = 280;   // avatar + name + email + divider
    const footerH = 100;   // total row + sign-out
    const panelH  = Math.min(920, Math.max(660, headerH + totalLevels * rowH + footerH));
    const topEdge = cy - panelH / 2;

    // ── Panel chrome ──────────────────────────────────────────────────────
    this._track(this.add.rectangle(cx, cy, panelW, panelH, 0x0b1828, 0.97).setDepth(D));

    const borderGfx = this.add.graphics().setDepth(D);
    borderGfx.lineStyle(2, 0x4488ff, 0.4);
    borderGfx.strokeRect(cx - panelW / 2, topEdge, panelW, panelH);
    this._track(borderGfx);

    this._track(this.add.rectangle(cx, topEdge + 4, panelW, 8, 0x4488ff).setDepth(D + 1));

    // ── Avatar + identity ─────────────────────────────────────────────────
    const avatarR = 54;
    const avatarY = topEdge + 68 + avatarR;
    this._loadAvatar(user, cx, avatarY, avatarR, D + 1);

    const nameY = avatarY + avatarR + 22;
    this._track(this.add.text(cx, nameY, user.displayName || 'Player', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '38px',
      fill: '#ddeeff',
    }).setOrigin(0.5).setDepth(D + 2));

    this._track(this.add.text(cx, nameY + 48, user.email || '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fill: '#4a6888',
    }).setOrigin(0.5).setDepth(D + 2));

    // ── Divider ───────────────────────────────────────────────────────────
    const divY1 = nameY + 86;
    this._hline(cx, divY1, panelW * 0.82, 0x4488ff, 0.18, D + 1);

    // ── Level score rows ──────────────────────────────────────────────────
    const rowsY = divY1 + 16;

    for (let i = 1; i <= totalLevels; i++) {
      const score  = scores[`level_${i}`] || 0;
      const beaten = score > 0;
      const rowMid = rowsY + (i - 1) * rowH + rowH / 2;

      // Alternate row tint
      if (i % 2 === 0) {
        this._track(
          this.add.rectangle(cx, rowMid, panelW - 8, rowH, 0x0a1825, 0.65).setDepth(D)
        );
      }

      // Level label with status icon
      const icon = beaten ? '✓' : '·';
      this._track(this.add.text(cx - 330, rowMid, `${icon}  Level ${i}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        fill: beaten ? '#99bbdd' : '#2a3d52',
      }).setOrigin(0, 0.5).setDepth(D + 2));

      // Score
      const label = beaten ? `${score.toLocaleString()} pts` : '—';
      this._track(this.add.text(cx + 330, rowMid, label, {
        fontFamily: beaten ? 'Arial Black, Arial, sans-serif' : 'Arial, sans-serif',
        fontSize: '25px',
        fill: beaten ? '#44ccff' : '#1e3040',
      }).setOrigin(1, 0.5).setDepth(D + 2));
    }

    // ── Total score ───────────────────────────────────────────────────────
    const totalSectionY = rowsY + totalLevels * rowH + 14;
    this._hline(cx, totalSectionY, panelW * 0.82, 0x4488ff, 0.14, D + 1);

    const total = scores.total_score || 0;
    this._track(this.add.text(cx - 330, totalSectionY + 32, 'Total Score', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '27px',
      fill: '#4488ff',
    }).setOrigin(0, 0.5).setDepth(D + 2));

    this._track(this.add.text(cx + 330, totalSectionY + 32, `${total.toLocaleString()} pts`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '27px',
      fill: '#44ffaa',
    }).setOrigin(1, 0.5).setDepth(D + 2));

    // ── Sign-out button ───────────────────────────────────────────────────
    const signOut = this.add.text(cx, topEdge + panelH - 44, 'Sign Out', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      fill: '#ffffff',
      backgroundColor: '#6b1a1a',
      padding: { x: 34, y: 12 },
    })
      .setOrigin(0.5).setDepth(D + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => signOut.setStyle({ backgroundColor: '#992222' }))
      .on('pointerout',  () => signOut.setStyle({ backgroundColor: '#6b1a1a' }))
      .on('pointerdown', async () => {
        await window.FirebaseAuth?.logout();
        window.showHomeScreen();
      });
    this._track(signOut);
  }

  // ── Google avatar ─────────────────────────────────────────────────────────

  _loadAvatar(user, cx, cy, r, depth) {
    const photoURL = user.photoURL;
    const key      = `pfp_${user.uid}`;

    const drawPhoto = () => {
      const img = this.add.image(cx, cy, key)
        .setDisplaySize(r * 2, r * 2)
        .setDepth(depth);

      // Circular clip mask
      const maskGfx = this.make.graphics({ add: false });
      maskGfx.fillStyle(0xffffff);
      maskGfx.fillCircle(cx, cy, r);
      img.setMask(maskGfx.createGeometryMask());

      // Accent ring
      const ring = this.add.graphics().setDepth(depth + 1);
      ring.lineStyle(3, 0x4488ff, 0.85);
      ring.strokeCircle(cx, cy, r + 2);

      this._track(img, maskGfx, ring);
    };

    const drawInitials = () => {
      const gfx = this.add.graphics().setDepth(depth);
      gfx.fillStyle(0x162840, 1);
      gfx.fillCircle(cx, cy, r);
      gfx.lineStyle(3, 0x4488ff, 0.75);
      gfx.strokeCircle(cx, cy, r);
      this._track(gfx);

      const initials = (user.displayName || 'P')
        .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

      this._track(this.add.text(cx, cy, initials, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: `${Math.round(r * 0.72)}px`,
        fill: '#6699cc',
      }).setOrigin(0.5).setDepth(depth + 1));
    };

    if (!photoURL) { drawInitials(); return; }

    if (this.textures.exists(key)) { drawPhoto(); return; }

    this.load.image(key, photoURL);
    this.load.once('complete', () => {
      if (!this.scene.isActive('ProfileScene')) return;
      drawPhoto();
    });
    this.load.once('loaderror', () => {
      if (!this.scene.isActive('ProfileScene')) return;
      drawInitials();
    });
    this.load.start();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _hline(cx, y, w, color, alpha, depth) {
    const g = this.add.graphics().setDepth(depth);
    g.lineStyle(1, color, alpha);
    g.lineBetween(cx - w / 2, y, cx + w / 2, y);
    this._track(g);
  }
}
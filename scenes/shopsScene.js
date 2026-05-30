// scenes/shopsScene.js
class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    window.UIFactory.addBackground(this, 'asset/background/4.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());

    this._renderables = [];
    this._onAuth = () => this._refresh();
    window.addEventListener('authStateChanged', this._onAuth);
    this.events.once('shutdown', () => window.removeEventListener('authStateChanged', this._onAuth));
    this.events.once('destroy',  () => window.removeEventListener('authStateChanged', this._onAuth));

    this._render();
  }

  _refresh() {
    this._renderables.forEach(o => { try { if (o?.active) o.destroy(); } catch (e) {} });
    this._renderables = [];
    this._render();
  }

  _track(...objs) {
    for (const o of objs) if (o) this._renderables.push(o);
    return objs[0];
  }

  _render() {
    const user = window.FirebaseAuth?.currentUser;
    if (user) {
      this._showShop(user);
    } else {
      this._showLoginPrompt();
    }
  }

  _showLoginPrompt() {
    const cx = 960, cy = 540;
    const pw = 700, ph = 400;
    const top = cy - ph / 2;
    const D = 10;

    // Panel
    this._track(this.add.rectangle(cx, cy, pw, ph, 0x0d0d1a, 0.97).setDepth(D));

    const borderGfx = this.add.graphics().setDepth(D);
    borderGfx.lineStyle(2, 0xff6b6b, 0.8);
    borderGfx.strokeRect(cx - pw / 2, top, pw, ph);
    this._track(borderGfx);

    // Red accent bar
    this._track(this.add.rectangle(cx, top + 4, pw, 8, 0xff6b6b).setDepth(D + 1));

    // Heading
    this._track(this.add.text(cx, top + 100, 'Shop', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '48px',
      fill: '#ff6b6b',
    }).setOrigin(0.5).setDepth(D + 1));

    // Message
    this._track(this.add.text(cx, top + 180, 'Please sign in to buy skins', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fill: '#aa8888',
    }).setOrigin(0.5).setDepth(D + 1));

    // Sign-in button
    const btn = this.add.text(cx, top + 280, '  Sign in with Google  ', {
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
        btn.setText('Signing in…').setStyle({ backgroundColor: '#112a6e' }).disableInteractive();
        try {
          await window.FirebaseAuth?.login();
        } catch {
          btn.setText('  Sign in with Google  ')
            .setStyle({ backgroundColor: '#2d5fcc' })
            .setInteractive({ useHandCursor: true });
        }
      });
    this._track(btn);
  }

  _showShop(user) {
    const cx = 960, cy = 540;
    const D = 10;

    // Title
    this._track(this.add.text(cx, 80, 'SHOP', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '56px',
      fill: '#44ff88',
    }).setOrigin(0.5).setDepth(D + 2));

    // Equipped skin section
    this._showEquippedSkin(cx, 140);

    // Skins data
    const skins = [
      { id: 'skin_1', name: 'Classic', key: 'skin_1', cost: 0, x: 420, y: 400 },
      { id: 'skin_2', name: 'Skin 2', key: 'skin_2', cost: 500, x: 960, y: 400 },
      { id: 'skin_3', name: 'Skin 3', key: 'skin_3', cost: 500, x: 1500, y: 400 },
    ];

    // Display each skin
    skins.forEach(skin => this._displaySkinCard(skin, cx));
  }

  _showEquippedSkin(cx, y) {
    const D = 10;
    const pw = 400, ph = 50;

    // Background panel
    this._track(this.add.rectangle(cx, y, pw, ph, 0x0a1825, 0.9).setDepth(D));

    // Border
    const borderGfx = this.add.graphics().setDepth(D);
    borderGfx.lineStyle(2, 0xffaa00, 0.7);
    borderGfx.strokeRect(cx - pw / 2, y - ph / 2, pw, ph);
    this._track(borderGfx);

    // Get equipped skin
    const equippedId = window.GameData.getEquippedSkin();
    const skinNames = { 'skin_1': 'Classic', 'skin_2': 'Skin 2', 'skin_3': 'Skin 3' };
    const skinName = skinNames[equippedId] || 'Unknown';

    // Label + skin name combined
    this._track(this.add.text(cx, y, `Equipped: ${skinName}`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '22px',
      fill: '#44ff88',
    }).setOrigin(0.5, 0.5).setDepth(D + 1));
  }

  _displaySkinCard(skin, cx) {
    const { id, name, key, cost, x, y } = skin;
    const D = 10;
    const cardW = 300, cardH = 380;

    // Card background
    this._track(this.add.rectangle(x, y, cardW, cardH, 0x0a1825, 0.85).setDepth(D));

    // Card border
    const borderGfx = this.add.graphics().setDepth(D);
    borderGfx.lineStyle(2, 0x44ff88, 0.6);
    borderGfx.strokeRect(x - cardW / 2, y - cardH / 2, cardW, cardH);
    this._track(borderGfx);

    // Skin name
    this._track(this.add.text(x, y - 160, name, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      fill: '#44ff88',
    }).setOrigin(0.5).setDepth(D + 1));

    // Skin image
    const skinImg = this.add.image(x, y - 40, key);
    skinImg.setScale(0.4);
    skinImg.setDepth(D + 1);
    this._track(skinImg);

    // Check if purchased
    const isPurchased = window.GameData.isSkinPurchased(id);
    const isEquipped = window.GameData.getEquippedSkin() === id;
    const currentScore = window.GameData.getActiveScores().total_score || 0;
    const canAfford = currentScore >= cost;

    // Status or button
    if (isPurchased) {
      // Show equip button for owned skins
      const btnColor = isEquipped ? '#44ff88' : '#4488ff';
      const btnText = isEquipped ? '✓ EQUIPPED' : 'EQUIP';
      const btnTextColor = isEquipped ? '#000000' : '#ffffff';
      const btn = this.add.text(x, y + 100, btnText, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '20px',
        fill: btnTextColor,
        backgroundColor: btnColor,
        padding: { x: 30, y: 10 },
      })
        .setOrigin(0.5).setDepth(D + 1)
        .setInteractive({ useHandCursor: !isEquipped })
        .on('pointerover', () => {
          if (!isEquipped) btn.setStyle({ backgroundColor: '#2266ff' });
        })
        .on('pointerout', () => {
          if (!isEquipped) btn.setStyle({ backgroundColor: '#4488ff' });
        })
        .on('pointerdown', () => {
          if (!isEquipped) {
            window.GameData.setEquippedSkin(id);
            this._refresh();
          }
        });
      this._track(btn);
    } else if (cost === 0) {
      // Free skin - show equip button
      const btnColor = isEquipped ? '#44ff88' : '#4488ff';
      const btnText = isEquipped ? '✓ EQUIPPED' : 'EQUIP';
      const btnTextColor = isEquipped ? '#000000' : '#ffffff';
      const btn = this.add.text(x, y + 100, btnText, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '20px',
        fill: btnTextColor,
        backgroundColor: btnColor,
        padding: { x: 30, y: 10 },
      })
        .setOrigin(0.5).setDepth(D + 1)
        .setInteractive({ useHandCursor: !isEquipped })
        .on('pointerover', () => {
          if (!isEquipped) btn.setStyle({ backgroundColor: '#2266ff' });
        })
        .on('pointerout', () => {
          if (!isEquipped) btn.setStyle({ backgroundColor: '#4488ff' });
        })
        .on('pointerdown', () => {
          if (!isEquipped) {
            window.GameData.setEquippedSkin(id);
            this._refresh();
          }
        });
      this._track(btn);
    } else {
      // Cost display
      this._track(this.add.text(x, y + 80, `Cost: ${cost}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fill: canAfford ? '#ffff44' : '#aa4444',
      }).setOrigin(0.5).setDepth(D + 1));

      // Buy button - shows confirmation dialog
      const btnColor = canAfford ? '#4488ff' : '#664444';
      const btnTextColor = canAfford ? '#ffffff' : '#aaaaaa';
      const btn = this.add.text(x, y + 130, 'BUY', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '20px',
        fill: btnTextColor,
        backgroundColor: btnColor,
        padding: { x: 30, y: 10 },
      })
        .setOrigin(0.5).setDepth(D + 1)
        .setInteractive({ useHandCursor: canAfford })
        .on('pointerover', () => {
          if (canAfford) btn.setStyle({ backgroundColor: '#2266ff' });
        })
        .on('pointerout', () => {
          if (canAfford) btn.setStyle({ backgroundColor: '#4488ff' });
        })
        .on('pointerdown', () => {
          if (canAfford) this._showConfirmDialog(id, cost, name);
        });
      this._track(btn);
    }
  }

  _showConfirmDialog(skinId, cost, skinName) {
    const cx = 960, cy = 540;
    const D = 100;
    const pw = 500, ph = 280;
    const top = cy - ph / 2;
    const confirmElements = [];

    // Dim overlay
    const overlay = this.add.rectangle(cx, cy, 1920, 1080, 0x000000, 0.6).setDepth(D).setInteractive();
    confirmElements.push(overlay);
    this._track(overlay);

    // Dialog panel
    const panel = this.add.rectangle(cx, cy, pw, ph, 0x0d0d1a, 0.98).setDepth(D + 1);
    confirmElements.push(panel);
    this._track(panel);

    // Dialog border
    const borderGfx = this.add.graphics().setDepth(D + 1);
    borderGfx.lineStyle(2, 0x44ff88, 0.8);
    borderGfx.strokeRect(cx - pw / 2, top, pw, ph);
    confirmElements.push(borderGfx);
    this._track(borderGfx);

    // Dialog title
    const title = this.add.text(cx, top + 40, 'Confirm Purchase', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '32px',
      fill: '#44ff88',
    }).setOrigin(0.5).setDepth(D + 2);
    confirmElements.push(title);
    this._track(title);

    // Skin name
    const skinText = this.add.text(cx, top + 90, skinName, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#aabbcc',
    }).setOrigin(0.5).setDepth(D + 2);
    confirmElements.push(skinText);
    this._track(skinText);

    // Cost display
    const costText = this.add.text(cx, top + 140, `Cost: ${cost} score`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      fill: '#ffff44',
    }).setOrigin(0.5).setDepth(D + 2);
    confirmElements.push(costText);
    this._track(costText);

    // Helper to destroy all confirm dialog elements
    const destroyConfirmDialog = () => {
      confirmElements.forEach(el => {
        try { el.destroy(); } catch (e) {}
      });
      this._renderables = this._renderables.filter(o => !confirmElements.includes(o));
    };

    // Cancel button
    const cancelBtn = this.add.text(cx - 130, top + 200, 'Cancel', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      fill: '#ffffff',
      backgroundColor: '#664444',
      padding: { x: 25, y: 12 },
    })
      .setOrigin(0.5).setDepth(D + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => cancelBtn.setStyle({ backgroundColor: '#885555' }))
      .on('pointerout', () => cancelBtn.setStyle({ backgroundColor: '#664444' }))
      .on('pointerdown', () => destroyConfirmDialog());
    confirmElements.push(cancelBtn);
    this._track(cancelBtn);

    // Buy button
    const buyBtn = this.add.text(cx + 130, top + 200, 'Buy', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      fill: '#ffffff',
      backgroundColor: '#4488ff',
      padding: { x: 30, y: 12 },
    })
      .setOrigin(0.5).setDepth(D + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => buyBtn.setStyle({ backgroundColor: '#2266ff' }))
      .on('pointerout', () => buyBtn.setStyle({ backgroundColor: '#4488ff' }))
      .on('pointerdown', () => {
        destroyConfirmDialog();
        this._completePurchase(skinId, cost, skinName);
      });
    confirmElements.push(buyBtn);
    this._track(buyBtn);
  }

  _completePurchase(skinId, cost, skinName) {
    const currentScore = window.GameData.getActiveScores().total_score || 0;
    
    if (currentScore < cost) {
      console.log('Not enough score!');
      return;
    }

    // Get scores once and modify them
    const scores = window.GameData.getActiveScores();
    const newScore = scores.total_score - cost;
    
    // Deduct score
    scores.total_score = newScore;
    if (!scores.purchased_skins) {
      scores.purchased_skins = [];
    }
    if (!scores.purchased_skins.includes(skinId)) {
      scores.purchased_skins.push(skinId);
    }
    scores.equipped_skin = skinId;

    // Save to local storage
    if (window.FirebaseAuth?.currentUser) {
      window.GameData.setServerCache(scores);
      // Also push to Firebase to ensure server is updated
      window.FirebaseStore.recordPurchase(
        window.FirebaseAuth.currentUser.uid,
        newScore,
        scores.purchased_skins,
        skinId
      ).catch(e => console.warn('Failed to sync purchase to Firebase', e));
    } else {
      try {
        localStorage.setItem(window.GameData.OFFLINE_KEY, JSON.stringify(scores));
      } catch (e) {
        console.warn('Failed to save score', e);
      }
    }

    // Show success dialog
    this._showSuccessDialog(skinName, cost, newScore);
  }

  _showSuccessDialog(skinName, cost, newScore) {
    const cx = 960, cy = 540;
    const D = 100;
    const pw = 500, ph = 320;
    const top = cy - ph / 2;
    const successElements = [];

    // Dim overlay
    const overlay = this.add.rectangle(cx, cy, 1920, 1080, 0x000000, 0.6).setDepth(D).setInteractive();
    successElements.push(overlay);
    this._track(overlay);

    // Dialog panel
    const panel = this.add.rectangle(cx, cy, pw, ph, 0x0d0d1a, 0.98).setDepth(D + 1);
    successElements.push(panel);
    this._track(panel);

    // Dialog border
    const borderGfx = this.add.graphics().setDepth(D + 1);
    borderGfx.lineStyle(2, 0x44ff88, 0.8);
    borderGfx.strokeRect(cx - pw / 2, top, pw, ph);
    successElements.push(borderGfx);
    this._track(borderGfx);

    // Success icon / title
    const titleText = this.add.text(cx, top + 50, '✓ PURCHASED!', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '36px',
      fill: '#44ff88',
    }).setOrigin(0.5).setDepth(D + 2);
    successElements.push(titleText);
    this._track(titleText);

    // Skin name
    const skinText = this.add.text(cx, top + 110, skinName, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#aabbcc',
    }).setOrigin(0.5).setDepth(D + 2);
    successElements.push(skinText);
    this._track(skinText);

    // Cost deducted
    const costText = this.add.text(cx, top + 160, `-${cost} Score`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      fill: '#ffaa00',
    }).setOrigin(0.5).setDepth(D + 2);
    successElements.push(costText);
    this._track(costText);

    // Remaining score
    const scoreText = this.add.text(cx, top + 210, `Your Score: ${newScore}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fill: '#ffff44',
    }).setOrigin(0.5).setDepth(D + 2);
    successElements.push(scoreText);
    this._track(scoreText);

    // Helper to destroy all success dialog elements
    const destroySuccessDialog = () => {
      successElements.forEach(el => {
        try { el.destroy(); } catch (e) {}
      });
      this._renderables = this._renderables.filter(o => !successElements.includes(o));
    };

    // Close button
    const closeBtn = this.add.text(cx, top + 270, 'OK', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      fill: '#ffffff',
      backgroundColor: '#44ff88',
      padding: { x: 40, y: 12 },
    })
      .setOrigin(0.5).setDepth(D + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setStyle({ backgroundColor: '#66ff99' }))
      .on('pointerout', () => closeBtn.setStyle({ backgroundColor: '#44ff88' }))
      .on('pointerdown', () => {
        destroySuccessDialog();
        this._refresh();
      });
    successElements.push(closeBtn);
    this._track(closeBtn);
  }
}
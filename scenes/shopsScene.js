// scenes/shopsScene.js
class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.cameras.main.setBounds(0, 0, 1920, 2400);
    this.cameras.main.setScroll(0, 0);
    window.UIFactory.addBackground(this, 'asset/background/4.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());

    this._renderables = [];
    this._onAuth = () => this._refresh();
    this._onKeyDown = (event) => {
      const key = event.key || '';
      if (key === 'PageUp' || key === 'PageDown') {
        event.preventDefault();
        const direction = key === 'PageUp' ? -1 : 1;
        const amount = 220 * direction;
        const cam = this.cameras.main;
        const maxScroll = Math.max(0, 2400 - this.scale.height);
        cam.setScroll(0, Phaser.Math.Clamp(cam.scrollY + amount, 0, maxScroll));
      }
    };
    window.addEventListener('authStateChanged', this._onAuth);
    window.addEventListener('keydown', this._onKeyDown);
    this.events.once('shutdown', () => {
      window.removeEventListener('authStateChanged', this._onAuth);
      window.removeEventListener('keydown', this._onKeyDown);
    });
    this.events.once('destroy',  () => {
      window.removeEventListener('authStateChanged', this._onAuth);
      window.removeEventListener('keydown', this._onKeyDown);
    });

    this._render();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.pageUpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PAGE_UP);
    this.pageDownKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PAGE_DOWN);

    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.PAGE_UP,
      Phaser.Input.Keyboard.KeyCodes.PAGE_DOWN,
    ]);

    this._scrollSpeed = 900;
    this._onWheel = (pointer, gameObject, deltaX, deltaY) => {
      const maxScroll = Math.max(0, 2400 - this.scale.height);
      const nextScroll = Phaser.Math.Clamp(
        this.cameras.main.scrollY - deltaY * 0.9,
        0,
        maxScroll
      );
      this.cameras.main.setScroll(0, nextScroll);
    };
    this.input.on('wheel', this._onWheel, this);
    this.events.once('shutdown', () => this.input.off('wheel', this._onWheel, this));
    this.events.once('destroy', () => this.input.off('wheel', this._onWheel, this));
  }

update(time, delta) {
    const cam = this.cameras.main;
    const dt = delta / 1000;
    const maxScroll = Math.max(0, 2400 - this.scale.height);

    if (this.cursors.up.isDown || this.upKey.isDown || this.pageUpKey.isDown) {
      cam.scrollY -= this._scrollSpeed * dt;
    } else if (this.cursors.down.isDown || this.downKey.isDown || this.pageDownKey.isDown) {
      cam.scrollY += this._scrollSpeed * dt;
    }

    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, maxScroll);
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

    // Power-up section
    this._track(this.add.text(cx, 620, 'Power-ups', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '36px',
      fill: '#44ff88',
    }).setOrigin(0.5).setDepth(D + 1));

    // Equipped power section
    this._showEquippedPower(cx, 670);

    const powers = [
      { id: 'power_heal', name: 'Heal', frame: 'Heal', cost: 0, x: 420, y: 950, type: 'power' },
      { id: 'power_double_item', name: 'Double Item', frame: 'Skill2', cost: 1000, x: 960, y: 950, type: 'power' },
      { id: 'power_shield_5s', name: 'Shield 5 sec', frame: 'Skill3', cost: 1000, x: 1500, y: 950, type: 'power' },
    ];

    powers.forEach(power => this._displayPowerCard(power));
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

  _showEquippedPower(cx, y) {
    const D = 10;
    const pw = 400, ph = 50;

    // Background panel
    this._track(this.add.rectangle(cx, y, pw, ph, 0x0a1825, 0.9).setDepth(D));

    // Border
    const borderGfx = this.add.graphics().setDepth(D);
    borderGfx.lineStyle(2, 0x00aaff, 0.7);
    borderGfx.strokeRect(cx - pw / 2, y - ph / 2, pw, ph);
    this._track(borderGfx);

    // Get equipped power
    const equippedId = window.GameData.getEquippedPower() || 'power_heal';
    const powerNames = {
      'power_heal': 'Heal',
      'power_double_item': 'Double Item',
      'power_shield_5s': 'Shield 5 sec'
    };
    const powerName = powerNames[equippedId] || 'Unknown';

    // Label + power name combined
    this._track(this.add.text(cx, y, `Equipped: ${powerName}`, {
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
        .setOrigin(0.5).setDepth(D + 1);

      if (!isEquipped) {
        btn
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => btn.setStyle({ backgroundColor: '#2266ff' }))
          .on('pointerout', () => btn.setStyle({ backgroundColor: '#4488ff' }))
          .on('pointerdown', () => {
            window.GameData.setEquippedSkin(id);
            this._refresh();
          });
      }
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
        .setOrigin(0.5).setDepth(D + 1);

      if (!isEquipped) {
        btn
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => btn.setStyle({ backgroundColor: '#2266ff' }))
          .on('pointerout', () => btn.setStyle({ backgroundColor: '#4488ff' }))
          .on('pointerdown', () => {
            window.GameData.setEquippedSkin(id);
            this._refresh();
          });
      }
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
          if (canAfford) this._showConfirmDialog({ id, name, cost, type: 'skin' });
        });
      this._track(btn);
    }
  }

  _displayPowerCard(power) {
    const { id, name, frame, cost, x, y } = power;
    const D = 10;
    const cardW = 300, cardH = 380;

    // Card background
    this._track(this.add.rectangle(x, y, cardW, cardH, 0x0a1825, 0.85).setDepth(D));

    // Card border
    const borderGfx = this.add.graphics().setDepth(D);
    borderGfx.lineStyle(2, 0x44ff88, 0.6);
    borderGfx.strokeRect(x - cardW / 2, y - cardH / 2, cardW, cardH);
    this._track(borderGfx);

    // Power name
    this._track(this.add.text(x, y - 160, name, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      fill: '#44ff88',
    }).setOrigin(0.5).setDepth(D + 1));

    // Power icon
    const icon = this.add.image(x, y - 40, 'item_atlas', frame);
    icon.setScale(4);
    icon.setDepth(D + 1);
    this._track(icon);

    const isPurchased = window.GameData.isPowerPurchased(id) || id === 'power_heal';
    const isEquipped = window.GameData.getEquippedPower() === id;
    const currentScore = window.GameData.getActiveScores().total_score || 0;
    const canAfford = currentScore >= cost || id === 'power_heal';

    if (isPurchased) {
      // Status text
      this._track(this.add.text(x, y + 60, 'OWNED', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '18px',
        fill: '#44ff88',
      }).setOrigin(0.5).setDepth(D + 1));

      // Equip/Unequip button
      const btnColor = isEquipped ? '#44ff88' : '#4488ff';
      const btnText = isEquipped ? '✓ EQUIPPED' : 'EQUIP';
      const btnTextColor = isEquipped ? '#000000' : '#ffffff';
      const btn = this.add.text(x, y + 130, btnText, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '18px',
        fill: btnTextColor,
        backgroundColor: btnColor,
        padding: { x: 25, y: 10 },
      })
        .setOrigin(0.5).setDepth(D + 1);

      if (!isEquipped) {
        btn
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            try {
              if (btn?.active) btn.setStyle({ backgroundColor: '#2266ff' });
            } catch (e) { console.warn('[Shop] Equip button hover error:', e); }
          })
          .on('pointerout', () => {
            try {
              if (btn?.active) btn.setStyle({ backgroundColor: '#4488ff' });
            } catch (e) { console.warn('[Shop] Equip button out error:', e); }
          })
          .on('pointerdown', () => {
            try {
              window.GameData.setEquippedPower(id);
              // Notify PowerUpManager if game scene is running
              if (window.PowerUpManager?.updateEquippedPower) {
                window.PowerUpManager.updateEquippedPower(id);
              }
              if (window.FirebaseAuth?.currentUser) {
                const scores = window.GameData.getActiveScores();
                if (window.FirebaseStore?.recordPurchase) {
                  window.FirebaseStore.recordPurchase(
                    window.FirebaseAuth.currentUser.uid,
                    scores.total_score || 0,
                    scores.purchased_skins || [],
                    scores.equipped_skin || 'skin_1',
                    scores.purchased_powers || [],
                    id
                  ).catch(e => console.warn('Failed to sync equipped power', e));
                }
              }
              // Refresh after a brief delay to ensure state updates
              setTimeout(() => { if (this?._refresh) this._refresh(); }, 50);
            } catch (e) {
              console.error('[Shop] Equip button click error:', e);
            }
          });
      }
      this._track(btn);
    } else {
      this._track(this.add.text(x, y + 60, `Cost: ${cost}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fill: canAfford ? '#ffff44' : '#aa4444',
      }).setOrigin(0.5).setDepth(D + 1));

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
          if (canAfford) this._showConfirmDialog({ id, name, cost, type: 'power' });
        });
      this._track(btn);
    }
  }

  _showConfirmDialog(item) {
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

    // Item name
    const itemText = this.add.text(cx, top + 90, item.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fill: '#aabbcc',
    }).setOrigin(0.5).setDepth(D + 2);
    confirmElements.push(itemText);
    this._track(itemText);

    // Cost display
    const costText = this.add.text(cx, top + 140, `Cost: ${item.cost} score`, {
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
        this._completePurchase(item);
      });
    confirmElements.push(buyBtn);
    this._track(buyBtn);
  }

  _completePurchase(item) {
    const activeScores = window.GameData.getActiveScores();
    const currentScore = activeScores.total_score || 0;

    if (currentScore < item.cost) {
      console.log('Not enough score!');
      return;
    }

    const scores = activeScores;
    const newScore = currentScore - item.cost;
    scores.total_score = newScore;

    if (item.type === 'skin') {
      if (!scores.purchased_skins) {
        scores.purchased_skins = [];
      }
      if (!scores.purchased_skins.includes(item.id)) {
        scores.purchased_skins.push(item.id);
      }
      scores.equipped_skin = item.id;
    } else if (item.type === 'power') {
      if (!scores.purchased_powers) {
        scores.purchased_powers = [];
      }
      if (!scores.purchased_powers.includes(item.id)) {
        scores.purchased_powers.push(item.id);
      }
    }

    if (window.FirebaseAuth?.currentUser) {
      window.GameData.setServerCache(scores);
      window.FirebaseStore.recordPurchase(
        window.FirebaseAuth.currentUser.uid,
        newScore,
        scores.purchased_skins || [],
        scores.equipped_skin || 'skin_1',
        scores.purchased_powers || [],
        scores.equipped_power || null
      ).catch(e => console.warn('Failed to sync purchase to Firebase', e));
    } else {
      try {
        localStorage.setItem(window.GameData.OFFLINE_KEY, JSON.stringify(scores));
      } catch (e) {
        console.warn('Failed to save score', e);
      }
    }

    this._showSuccessDialog(item.name, item.cost, newScore);
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
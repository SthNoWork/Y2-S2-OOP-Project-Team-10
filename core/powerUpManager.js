// core/powerUpManager.js
// Manages power-up buttons shown in GameScene.
//
// Rules:
//   • One use per level visit — once used, the button is disabled for the rest
//     of that level run (even on wave-running state).
//   • Button appearance depends on equipped power: Heal, Double Item, or Shield.
//   • Positioned at the bottom-right of the arena.

window.PowerUpManager = {

  HEAL_AMOUNT: 50,
  DOUBLE_ITEM_DURATION: 15000,    // 15 seconds
  SHIELD_DURATION: 5000,            // 5 seconds
  SHIELD_HEALTH_BONUS: 60,          // extra health granted

  _scene:    null,
  _arena:    null,
  _used:     false,   // resets each time init() is called (= each level load)
  _equippedPower: null,  // tracks current equipped power

  // ── Sprite references ────────────────────────────────────────────────────

  _iconSprite: null,
  _bgRect:     null,
  _labelText:  null,
  _coolText:   null,
  _shieldBubble:   null,
  _pickerElements: [],
  _pickerHovered:  false,
  _cycleBg:    null,
  _cycleText:  null,


  // ── Public API ────────────────────────────────────────────────────────────

  // Call once from GameScene.create() after the arena is ready.
  init(scene, arena) {
    this._scene  = scene;
    this._arena  = arena;
    this._used   = false;   // fresh state for every new level
    this._equippedPower = window.GameData?.getEquippedPower() || null;

    this._createButton();
  },

  // Update equipped power (called from shop when user equips a power)
  updateEquippedPower(powerId) {
    this._equippedPower = powerId;
    // Recreate button to reflect the new equipped power
    this._destroyButton();
    this._createButton();
  },

  _destroyButton() {
    [this._bgRect, this._iconSprite, this._labelText, this._coolText, this._cycleBg, this._cycleText].forEach(o => {
      try { if (o?.active) o.destroy(); } catch (_) {}
    });
    this._bgRect     = null;
    this._iconSprite = null;
    this._labelText  = null;
    this._coolText   = null;
    this._cycleBg    = null;
    this._cycleText  = null;

    this._hideSkillPicker();

    try { if (this._shieldBubble?.active) this._shieldBubble.destroy(); } catch (_) {}
    this._shieldBubble = null;
  },

  // Destroys all Phaser objects owned by this manager (called on scene shutdown).
  destroy() {
    this._destroyButton();
    this._scene      = null;
  },


  // ── Button creation ───────────────────────────────────────────────────────

  _createButton() {
  const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this._arena;

  const BTN_W  = 108;
  const BTN_H  = 108;
  const MARGIN = 24;
  const cx = ARENA_X + ARENA_W - MARGIN - BTN_W / 2;
  const cy = ARENA_Y + ARENA_H - MARGIN - BTN_H / 2 - 60;

  const DEPTH = 1500;

  // ── Background panel ──
  this._bgRect = this._scene.add
    .rectangle(cx, cy, BTN_W, BTN_H, this._used ? 0x1a1a1a : 0x0d1f0d, 0.92)
    .setDepth(DEPTH)
    .setStrokeStyle(2, this._used ? 0x444444 : 0x44ff88, 0.9);

  // ── Icon ──
  let iconFrame = 'Heal';
  let label = '+50 HP';
  if (this._equippedPower === 'power_double_item') { iconFrame = 'Skill2'; label = '2x Items'; }
  else if (this._equippedPower === 'power_shield_5s') { iconFrame = 'Skill3'; label = 'Shield'; }

  this._iconSprite = this._scene.add
    .image(cx, cy - 10, 'item_atlas', iconFrame)
    .setScale(3.2)
    .setDepth(DEPTH + 1);

  if (this._used) {
    this._iconSprite.setTint(0x555555);
  }

  this._labelText = this._scene.add.text(cx, cy + 38, label, {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '17px',
    fill: this._used ? '#555555' : '#44ff88',
  }).setOrigin(0.5).setDepth(DEPTH + 1);

  this._coolText = this._scene.add.text(cx, cy, 'USED', {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '22px',
    fill: '#ff4444',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5).setDepth(DEPTH + 2).setVisible(this._used);

  // ── Hit area ──
  const hit = this._scene.add
    .rectangle(cx, cy, BTN_W, BTN_H, 0x000000, 0)
    .setDepth(DEPTH + 3)
    .setInteractive({ useHandCursor: !this._used });

  hit.on('pointerover', () => {
    this._onHover(true);
  });
  hit.on('pointerout', () => {
    this._onHover(false);
  });
  hit.on('pointerdown', () => this._onPress());

  // ── Cycle Button ──
  const cycleW = 100;
  const cycleH = 44;
  this._cycleBg = this._scene.add
    .rectangle(cx, cy - BTN_H / 2 - 28, cycleW, cycleH, this._used ? 0x1a1a1a : 0x0a1f3d, 0.92)
    .setDepth(DEPTH)
    .setStrokeStyle(2, this._used ? 0x444444 : 0x4488ff, 0.9);

  this._cycleText = this._scene.add.text(cx, cy - BTN_H / 2 - 28, 'CYCLE 🔄', {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '14px',
    fill: this._used ? '#555555' : '#4488ff',
  }).setOrigin(0.5).setDepth(DEPTH + 1);

  const cycleHit = this._scene.add
    .rectangle(cx, cy - BTN_H / 2 - 28, cycleW, cycleH, 0x000000, 0)
    .setDepth(DEPTH + 3)
    .setInteractive({ useHandCursor: !this._used });

  cycleHit.on('pointerover', () => {
    if (!this._used) this._cycleBg.setFillStyle(0x1a3a5a, 0.92);
  });
  cycleHit.on('pointerout', () => {
    if (!this._used) this._cycleBg.setFillStyle(0x0a1f3d, 0.92);
  });
  cycleHit.on('pointerdown', () => {
    if (!this._used) this.cyclePowerUp();
  });
},

// ── Skill picker popup ────────────────────────────────────────────────────

_showSkillPicker(btnCx, btnCy, DEPTH) {
  if (this._pickerElements.length > 0) return; // already showing

  const skills = [
    { id: 'power_heal',        frame: 'Heal',   label: 'Heal',     desc: '+50 HP' },
    { id: 'power_double_item', frame: 'Skill2', label: '2x Items', desc: '15s' },
    { id: 'power_shield_5s',   frame: 'Skill3', label: 'Shield',   desc: '5s' },
  ];

  const itemW = 90;
  const itemH = 100;
  const gap   = 8;
  const totalW = skills.length * itemW + (skills.length - 1) * gap;
  const popX  = btnCx - totalW / 2 - itemW / 2;
  const popY  = btnCy - 130;

  // Check which powers are purchased
  const purchased = window.GameData?.getActiveScores()?.purchased_powers || [];

  skills.forEach((skill, i) => {
    const x = popX + i * (itemW + gap) + itemW / 2;
    const y = popY;

    const isEquipped  = this._equippedPower === skill.id ||
      (skill.id === 'power_heal' && !this._equippedPower);
    const isOwned     = skill.id === 'power_heal' || purchased.includes(skill.id);

    // Card background
    const cardColor = isEquipped ? 0x1a3a1a : (isOwned ? 0x0d1f2d : 0x1a1a1a);
    const borderCol = isEquipped ? 0x44ff88 : (isOwned ? 0x4488ff : 0x444444);

    const card = this._scene.add.rectangle(x, y, itemW, itemH, cardColor, 0.95)
      .setDepth(DEPTH + 10)
      .setStrokeStyle(2, borderCol, 1);

    // Icon
    const icon = this._scene.add.image(x, y - 18, 'item_atlas', skill.frame)
      .setScale(2.5)
      .setDepth(DEPTH + 11);

    // Label
    const lbl = this._scene.add.text(x, y + 22, skill.label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '13px',
      fill: isEquipped ? '#44ff88' : (isOwned ? '#ffffff' : '#555555'),
    }).setOrigin(0.5).setDepth(DEPTH + 11);

    // Desc
    const desc = this._scene.add.text(x, y + 38, skill.desc, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fill: '#aaaaaa',
    }).setOrigin(0.5).setDepth(DEPTH + 11);

    // Equipped badge
    if (isEquipped) {
      const badge = this._scene.add.text(x, y - 42, '✓ ON', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '11px',
        fill: '#44ff88',
      }).setOrigin(0.5).setDepth(DEPTH + 12);
      this._pickerElements.push(badge);
    }

    // Hit area for owned skills
    if (isOwned && !isEquipped) {
      const cardHit = this._scene.add
        .rectangle(x, y, itemW, itemH, 0x000000, 0)
        .setDepth(DEPTH + 12)
        .setInteractive({ useHandCursor: true });

      cardHit.on('pointerover', () => {
        this._pickerHovered = true;
        card.setFillStyle(0x1a2a3a, 0.95);
      });
      cardHit.on('pointerout', () => {
        card.setFillStyle(cardColor, 0.95);
        this._scene.time.delayedCall(150, () => {
          // Check if still hovering any picker element
          this._pickerHovered = false;
        });
      });
      cardHit.on('pointerdown', () => {
        // Equip this skill instantly
        window.GameData.setEquippedPower(skill.id);
        this._equippedPower = skill.id;

        // Sync to Firebase in background
        if (window.FirebaseAuth?.currentUser) {
          const scores = window.GameData.getActiveScores();
          window.FirebaseStore?.recordPurchase?.(
            window.FirebaseAuth.currentUser.uid,
            scores.total_score || 0,
            scores.purchased_skins || [],
            scores.equipped_skin || 'skin_1',
            scores.purchased_powers || [],
            skill.id
          ).catch(e => console.warn('Failed to sync equipped power', e));
        }

        this._hideSkillPicker();
        // Rebuild button to show new skill
        this._destroyButton();
        this._createButton();
      });

      this._pickerElements.push(cardHit);
    }

    this._pickerElements.push(card, icon, lbl, desc);
  });
},

_hideSkillPicker() {
  this._pickerElements.forEach(o => {
    try { if (o?.active) o.destroy(); } catch (_) {}
  });
  this._pickerElements = [];
  this._pickerHovered  = false;
},


  // ── Interaction callbacks ─────────────────────────────────────────────────

  _onHover(isOver) {
    if (this._used) return;
    this._bgRect?.setFillStyle(isOver ? 0x1a3a1a : 0x0d1f0d, 0.92);
  },

  _onPress() {
    if (this._used) return;

    // Hide skill picker immediately when skill is activated
    this._hideSkillPicker();

    const player = window.GameLogic?.player;
    if (!player?.active) return;

    // Route to the appropriate power effect
    if (this._equippedPower === 'power_double_item') {
      this._activateDoubleItem();
    } else if (this._equippedPower === 'power_shield_5s') {
      this._activateShield(player);
    } else {
      // Default: heal
      this._activateHeal(player);
    }

    this._markUsed();
  },

  _activateHeal(player) {
    const baseMax = player.maxHealth
                 ?? window.ObjectConfig?.internalTypes?.player?.health
                 ?? 100;
    const healCap    = baseMax + this.HEAL_AMOUNT;
    const before     = player.health ?? 0;
    player.health    = Math.min(healCap, before + this.HEAL_AMOUNT);
    player.maxHealth = healCap;

    try {
      window.SfxManager?.play?.('mixkit-game-level-completed-2059.wav', { trimMs: 300, volume: 0.4 });
    } catch (_) {}

    this._showFloatingText(player, `+${this.HEAL_AMOUNT} HP`);
  },

  _activateDoubleItem() {
  const allowed = window.LevelManager?.levelCfg?.allowedBuildings || {};
  const originalCounts = {};

    // Double maxCount for each allowed building type and refresh the UI label
    for (const type of Object.keys(allowed)) {
      const cfg = window.ObjectConfig?.placeableTypes?.[type];
      if (cfg && typeof cfg.maxCount === 'number') {
        originalCounts[type] = cfg.maxCount;
        cfg.maxCount = cfg.maxCount * 2;
        // Refresh the inventory button label immediately
        window.BuildingManager._refreshInventoryLabel(type);
      }
    }

    try {
      window.SfxManager?.play?.('mixkit-game-level-completed-2059.wav', { trimMs: 300, volume: 0.5 });
    } catch (_) {}

    const player = window.GameLogic?.player;
    if (player) {
      this._showFloatingText(player, '2x ITEMS! +' + this.DOUBLE_ITEM_DURATION / 1000 + 's');
    }

    // Restore original maxCounts and refresh labels again after duration
    if (this._scene) {
      this._scene.time.delayedCall(this.DOUBLE_ITEM_DURATION, () => {
        for (const [type, original] of Object.entries(originalCounts)) {
          const cfg = window.ObjectConfig?.placeableTypes?.[type];
          if (cfg) {
            cfg.maxCount = original;
            window.BuildingManager._refreshInventoryLabel(type);
          }
        }
      });
    }
  },
  // Add this new method to update the bubble position each frame.
  updateShieldBubble() {
  if (!this._shieldBubble || !this._shieldBubble.active) return;
  const player = window.GameLogic?.player;
  if (!player?.active) return;
  this._shieldBubble.setPosition(player.x, player.y);
  },
  _activateShield(player) {
    if (!player?.active) return;

    // Grant only +20 HP (no maxHealth change, no damage reduction)
  const baseMax = player.maxHealth ?? window.ObjectConfig?.internalTypes?.player?.health ?? 100;
  const healCap    = baseMax + 20;
  const before     = player.health ?? 0;
  player.health    = Math.min(healCap, before + 20);
  player.maxHealth = healCap;

    // Set shield flag — blocks ALL incoming damage while active
    player._shielded = true;
    player._shieldEnd = Date.now() + this.SHIELD_DURATION;

    // ── Bubble VFX ──────────────────────────────────────────────────────────
    const radius = Math.max(
      (player._bodyW ?? 40),
      (player._bodyH ?? 40)
    ) * 1.4;

    // Outer glow ring
    this._shieldBubble = this._scene.add.graphics();
    this._shieldBubble.setDepth(2000);
    this._shieldBubble.lineStyle(4, 0x44aaff, 0.9);
    this._shieldBubble.fillStyle(0x88ccff, 0.15);
    this._shieldBubble.strokeCircle(0, 0, radius);
    this._shieldBubble.fillCircle(0, 0, radius);
    this._shieldBubble.setPosition(player.x, player.y);

    // Pulse tween: breathes in/out for visual feedback
    this._scene.tweens.add({
      targets: this._shieldBubble,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0.7,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    try {
      window.SfxManager?.play?.('mixkit-game-level-completed-2059.wav', { trimMs: 300, volume: 0.5 });
    } catch (_) {}

    this._showFloatingText(player, 'SHIELD! +20 HP');

    // Remove shield and bubble after duration
    this._scene.time.delayedCall(this.SHIELD_DURATION, () => {
      player._shielded = false;

      if (this._shieldBubble?.active) {
        // Fade out then destroy
        this._scene?.tweens?.add({
          targets: this._shieldBubble,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            try { this._shieldBubble?.destroy(); } catch (_) {}
            this._shieldBubble = null;
          },
        });
      }
    });
  },

  _markUsed() {
    this._used = true;

    // Dim the button visually.
    this._bgRect?.setFillStyle(0x1a1a1a, 0.85).setStrokeStyle(2, 0x444444, 0.6);
    this._iconSprite?.setTint(0x555555);
    this._labelText?.setStyle({ fill: '#555555' });
    this._coolText?.setVisible(true);

    // Dim cycle button as well.
    this._cycleBg?.setFillStyle(0x1a1a1a, 0.85).setStrokeStyle(2, 0x444444, 0.6);
    this._cycleText?.setStyle({ fill: '#555555' });
  },

  cyclePowerUp() {
    if (this._used) return;

    // Get purchased powers
    const purchased = window.GameData?.getActiveScores()?.purchased_powers || [];
    
    // All possible powers in order
    const skills = [
      { id: 'power_heal' },
      { id: 'power_double_item' },
      { id: 'power_shield_5s' }
    ];

    // Filter to only owned powers (heal is always owned)
    const owned = skills.filter(s => s.id === 'power_heal' || purchased.includes(s.id));
    if (owned.length <= 1) {
      const player = window.GameLogic?.player;
      if (player) {
        this._showFloatingText(player, 'NO OTHER POWERUPS');
      }
      return;
    }

    // Find index of current power
    const currentId = this._equippedPower || 'power_heal';
    let idx = owned.findIndex(s => s.id === currentId);
    if (idx === -1) idx = 0;

    // Get next power
    const nextIdx = (idx + 1) % owned.length;
    const nextPower = owned[nextIdx].id;

    // Equip it
    window.GameData.setEquippedPower(nextPower);
    this._equippedPower = nextPower;

    // Sync to Firebase in background
    if (window.FirebaseAuth?.currentUser) {
      const scores = window.GameData.getActiveScores();
      window.FirebaseStore?.recordPurchase?.(
        window.FirebaseAuth.currentUser.uid,
        scores.total_score || 0,
        scores.purchased_skins || [],
        scores.equipped_skin || 'skin_1',
        scores.purchased_powers || [],
        nextPower
      ).catch(e => console.warn('Failed to sync equipped power', e));
    }

    // Rebuild button to show new power
    this._destroyButton();
    this._createButton();
  },


  // ── Floating feedback text ────────────────────────────────────────────────

  _showFloatingText(player, text) {
    if (!this._scene) return;

    const floatX = player.x;
    const floatY = player.y - 60;

    const txt = this._scene.add.text(floatX, floatY, text, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize:   '36px',
      fill:       '#44ff88',
      stroke:     '#003300',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3000);

    // Tween: float upward and fade out over 1.2 s then destroy.
    this._scene.tweens.add({
      targets:  txt,
      y:        floatY - 80,
      alpha:    0,
      duration: 1200,
      ease:     'Power1',
      onComplete: () => { try { txt.destroy(); } catch (_) {} },
    });
  },
};
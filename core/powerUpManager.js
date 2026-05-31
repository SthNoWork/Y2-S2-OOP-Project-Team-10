// core/powerUpManager.js
// Manages the Heal power-up button shown in GameScene.
//
// Rules:
//   • One use per level visit — once used, the button is disabled for the rest
//     of that level run (even on wave-running state).
//   • Heals the player by HEAL_AMOUNT HP. If the player is at full HP,
//     it grants an overheal (max becomes 150).
//   • Uses the 'Heal' frame from item_atlas as the button icon.
//   • Positioned at the bottom-right of the arena.

window.PowerUpManager = {

  HEAL_AMOUNT: 50,

  _scene:    null,
  _arena:    null,
  _used:     false,   // resets each time init() is called (= each level load)

  // ── Sprite references ────────────────────────────────────────────────────

  _iconSprite: null,
  _bgRect:     null,
  _labelText:  null,
  _coolText:   null,


  // ── Public API ────────────────────────────────────────────────────────────

  // Call once from GameScene.create() after the arena is ready.
  init(scene, arena) {
    this._scene  = scene;
    this._arena  = arena;
    this._used   = false;   // fresh state for every new level

    this._createButton();
  },

  // Destroys all Phaser objects owned by this manager (called on scene shutdown).
  destroy() {
    [this._bgRect, this._iconSprite, this._labelText, this._coolText].forEach(o => {
      try { if (o?.active) o.destroy(); } catch (_) {}
    });
    this._bgRect     = null;
    this._iconSprite = null;
    this._labelText  = null;
    this._coolText   = null;
    this._scene      = null;
  },


  // ── Button creation ───────────────────────────────────────────────────────

  _createButton() {
    const { ARENA_X, ARENA_Y, ARENA_W, ARENA_H } = this._arena;

    // Position: bottom-right corner of the arena, above the inventory bar.
    const BTN_W  = 108;
    const BTN_H  = 108;
    const MARGIN = 24;
    const cx = ARENA_X + ARENA_W - MARGIN - BTN_W / 2;
    const cy = ARENA_Y + ARENA_H - MARGIN - BTN_H / 2 - 60; // -60 to sit above inventory

    const DEPTH = 1500;

    // ── Background panel ──
    this._bgRect = this._scene.add
      .rectangle(cx, cy, BTN_W, BTN_H, 0x0d1f0d, 0.92)
      .setDepth(DEPTH)
      .setStrokeStyle(2, 0x44ff88, 0.9);

    // ── 'H' heal icon from item_atlas ──
    // The sprite is tiny (22×20 px) so we scale it up to fill the button nicely.
    this._iconSprite = this._scene.add
      .image(cx, cy - 10, 'item_atlas', 'Heal')
      .setScale(3.2)
      .setDepth(DEPTH + 1);

    // ── Label underneath ──
    this._labelText = this._scene.add.text(cx, cy + 38, '+50 HP', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize:   '17px',
      fill:       '#44ff88',
    }).setOrigin(0.5).setDepth(DEPTH + 1);

    // ── "USED" overlay text (hidden until activated) ──
    this._coolText = this._scene.add.text(cx, cy, 'USED', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize:   '22px',
      fill:       '#ff4444',
      stroke:     '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH + 2).setVisible(false);

    // ── Hit area ──
    const hit = this._scene.add
      .rectangle(cx, cy, BTN_W, BTN_H, 0x000000, 0)
      .setDepth(DEPTH + 3)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover',  () => this._onHover(true));
    hit.on('pointerout',   () => this._onHover(false));
    hit.on('pointerdown',  () => this._onPress());
  },


  // ── Interaction callbacks ─────────────────────────────────────────────────

  _onHover(isOver) {
    if (this._used) return;
    this._bgRect?.setFillStyle(isOver ? 0x1a3a1a : 0x0d1f0d, 0.92);
  },

  _onPress() {
    if (this._used) return;

    const player = window.GameLogic?.player;
    if (!player?.active) return;

    // ── KEY FIX ──────────────────────────────────────────────────────────
    // maxHealth is 100 (the player's base HP). Simply capping at maxHealth
    // means a full-HP player gets no benefit. Instead we allow the heal to
    // push HP up to baseMax + HEAL_AMOUNT (i.e. up to 150).
    const baseMax = player.maxHealth
                 ?? window.ObjectConfig?.internalTypes?.player?.health
                 ?? 100;
    const healCap    = baseMax + this.HEAL_AMOUNT;   // 150
    const before     = player.health ?? 0;
    player.health    = Math.min(healCap, before + this.HEAL_AMOUNT);
    player.maxHealth = healCap;   // keep maxHealth in sync so HUD bar looks right
    // ─────────────────────────────────────────────────────────────────────

    // Play a light sound if available.
    try {
      window.SfxManager?.play?.('mixkit-game-level-completed-2059.wav', { trimMs: 300, volume: 0.4 });
    } catch (_) {}

    // Flash a "+50 HP" floating text near the player for feedback.
    this._showFloatingText(player);

    this._markUsed();
  },

  _markUsed() {
    this._used = true;

    // Dim the button visually.
    this._bgRect?.setFillStyle(0x1a1a1a, 0.85).setStrokeStyle(2, 0x444444, 0.6);
    this._iconSprite?.setTint(0x555555);
    this._labelText?.setStyle({ fill: '#555555' });
    this._coolText?.setVisible(true);
  },


  // ── Floating feedback text ────────────────────────────────────────────────

  _showFloatingText(player) {
    if (!this._scene) return;

    const floatX = player.x;
    const floatY = player.y - 60;

    const txt = this._scene.add.text(floatX, floatY, `+${this.HEAL_AMOUNT} HP`, {
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
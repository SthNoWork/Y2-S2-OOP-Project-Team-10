// scenes/gameScene.js
// Main gameplay scene: sets up the arena, loads the level, and runs the game loop.

class GameScene extends BaseScene {

  constructor() {
    super('GameScene');
    this.arena = null;
    this.player = null;
  }

  clear() {
    try { window.PowerUpManager?.destroy?.(); } catch (e) { }
    try { window.PillboxManager?.destroy?.(); } catch (e) { }
    try { window.MortarManager?.destroy?.(); } catch (e) { }
    try { window.BuildingManager?._removeExistingHandlers?.(); } catch (e) { }
    try { window.GameLogic?._detachCollisionListener?.(); } catch (e) { }
    try { window.LevelManager?._resetLevelState?.(); } catch (e) { }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    const bgChoices = [
      'asset/background/1.jpg',
      'asset/background/3.jpg',
      'asset/background/5.jpg',
    ];
    const pick = bgChoices[Math.floor(Math.random() * bgChoices.length)];
    window.UIFactory.addBackground(this, pick);

    this.arena = {
      ARENA_X: 96,
      ARENA_Y: 81,
      ARENA_W: 1728,
      ARENA_H: 972,
    };

    // Extend physics bounds beyond the visible area so objects don't teleport or hit an invisible roof.
    // The top bound is raised significantly (-3000) to allow high 75-degree mortar arcs.
    this.matter.world.setBounds(-1920, -3000, 5760, 4080, 32);

    // Combat state and tracking are now handled natively by the OOP entities and window.EntityManager.

    const levelNum = window._currentLevel;
    this.player = window.LevelManager.load(this, this.arena, levelNum);

    window.BuildingManager.init(this, this.arena);

    // ── Power-up heal button (bottom-right, one use per level) ────────────
    window.PowerUpManager.init(this, this.arena);

    this._createActionButtons();
    window.UIFactory.addBackButton(this, () => window.startScene('LevelSelectScene'));

    if (this.matter?.world) {
      this.matter.world.drawDebug = !!window.SHOW_HITBOXES;
      if (this.matter.world.debugGraphic) {
        this.matter.world.debugGraphic.setVisible(!!window.SHOW_HITBOXES);
      }
    }

    // Clean up PowerUpManager when the scene shuts down.
    this.events.once('shutdown', () => window.PowerUpManager.destroy());
    this.events.once('destroy', () => window.PowerUpManager.destroy());
  }

  update(_time, delta) {
    window.GameLogic.update(delta);
    window.LevelManager.update(delta);
    window.PowerUpManager.updateShieldBubble(); 
    this._updatePlayerSkin(); 


    const placed = window.BuildingManager.getPlacedBuildings();
    const prePlaced = window.LevelManager._prePlaced;
    window.ObjectFactory.updateDebugLabels([...placed, ...prePlaced]);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _createActionButtons() {
    const { ARENA_X, ARENA_W, ARENA_Y } = this.arena;
    const btnX = ARENA_X + ARENA_W - 19;
    const btnY = ARENA_Y + 22;
    const btnGap = 86;

    window.UIFactory.createButton(this, btnX, btnY, 'Start', () => window.LevelManager.startWave());
    window.UIFactory.createButton(this, btnX, btnY + btnGap, 'Reset', () => this.reload());

  }

  _logDebugInfo() {
    const placed = window.BuildingManager.getPlacedBuildings();
    console.log(`[Debug] placedBuildings count: ${placed.length}`);
    placed.forEach((b, i) => {
      const inWorld = this.matter?.world?.localWorld?.bodies?.includes(b.body) ?? '?';
      console.log(`  [${i}] type=${b.buildingType} active=${b.active} visible=${b.visible} x=${Math.round(b.x)} y=${Math.round(b.y)} health=${b.health} ghostRemoved=${b._ghostRemoved} inWorld=${inWorld}`);
    });
    console.log('[Debug] buildingCounts:', JSON.stringify(window.BuildingManager.buildingCounts));
    console.log('[Debug] GameLogic.buildings count:', window.GameLogic.buildings.length);
    window.GameLogic.buildings.forEach((b, i) => {
      console.log(`  [GL ${i}] type=${b.buildingType} active=${b.active} x=${Math.round(b.x)} y=${Math.round(b.y)} health=${b.health}`);
    });
  }

  _updatePlayerSkin() {
    const player = window.GameLogic?.player;
    if (!player?.active) return;

    const equippedSkin = player._equippedSkin
                      ?? window.GameData?.getEquippedSkin?.()
                      ?? 'skin_1';
    const hp        = player.health ?? 0;
    const isDamaged = hp < 50;

    let targetTexture;
    if (equippedSkin === 'skin_1') {
      targetTexture = isDamaged ? 'skin_1' : 'skin_1_happy';
    } else if (equippedSkin === 'skin_2') {
      targetTexture = isDamaged ? 'skin_2_damage' : 'skin_2';  // no happy/damage variant
    } else if (equippedSkin === 'skin_3') {
      targetTexture = isDamaged ? 'skin_3' : 'skin_3_happy';
    } else {
      targetTexture = equippedSkin;
    }

    // Only call setTexture when state actually changes
    if (player._currentSkinTexture !== targetTexture) {
      player._currentSkinTexture = targetTexture;
      try { player.setTexture(targetTexture); } catch (e) {}
    }
  }
}
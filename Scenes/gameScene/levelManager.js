// ========================================
// LEVEL MANAGER
// ========================================
// Owns level reset and win/lose coordination.
// Knows about all managers and orchestrates a clean slate between attempts.
// Does NOT own: physics, UI creation, building config, game logic rules.

window.LevelManager = {

  // ========================================
  // STATE
  // ========================================

  scene:         null,
  arena:         null,
  _gameOverText: null,
  _healthText:   null,

  // ========================================
  // INITIALIZATION
  // ========================================

  // Bind to the active scene and arena. Call once in GameScene.create().
  init(scene, arena) {
    this.scene         = scene;
    this.arena         = arena;
    this._gameOverText = null;
    this._healthText   = null;
  },

  // Store a reference to the health text object so this manager can update it.
  setHealthText(textObj) {
    this._healthText = textObj;
  },

  // ========================================
  // RESET
  // ========================================

  // Tear down all active gameplay objects and reinitialise everything for a fresh attempt.
  reset(player) {
    // -- Stop bombing run and clear bombs --
    window.GameLogic.resetRun();

    // -- Destroy all placed buildings --
    for (const building of window.BuildingManager.getPlacedBuildings().slice()) {
      try { window.BuildingManager.destroyBuilding(building); } catch (e) {}
    }

    // -- Clear building manager state (counts, placed list) --
    window.BuildingManager.resetState();

    // -- Dismiss game-over overlay if present --
    if (this._gameOverText) {
      try { this._gameOverText.destroy(); } catch (e) {}
      this._gameOverText = null;
    }

    // -- Reposition or recreate the player --
    const px = this.arena.ARENA_X + this.arena.ARENA_W / 2;
    const py = this.arena.ARENA_Y + this.arena.ARENA_H / 2;

    if (!player || !player.active) {
      player = window.ObjectFactory.createPlayer(this.scene, px, py, this.arena);
    } else {
      if (player.body) {
        try {
          Phaser.Physics.Matter.Matter.Body.setPosition(player.body, { x: px, y: py });
          Phaser.Physics.Matter.Matter.Body.setVelocity(player.body,  { x: 0,  y: 0  });
        } catch (e) {}
      }
    }

    // -- Re-init GameLogic: fresh collision listener and reset PlayerState --
    window.GameLogic.init(this.scene, player, this.arena);

    // -- Refresh health display --
    this._refreshHUD();

    return player;
  },

  // ========================================
  // HUD UPDATES
  // ========================================

  // Update the health text with the current PlayerState value.
  _refreshHUD() {
    if (this._healthText) {
      this._healthText.setText(`Health: ${window.GameLogic.playerState.health}`);
    }
  },

  // Called from GameScene.update() each frame to keep HUD and overlays current.
  update() {
    this._refreshHUD();
    this._checkGameOver();
  },

  // Show the game-over overlay once when the player dies.
  _checkGameOver() {
    if (!window.GameLogic.playerState.gameOver || this._gameOverText) return;

    const fontSize = Math.round(this.scene.scale.height * 0.1);
    this._gameOverText = this.scene.add.text(
      this.arena.ARENA_X + this.arena.ARENA_W * 0.5,
      this.arena.ARENA_Y + this.arena.ARENA_H * 0.5,
      'GAME OVER',
      {
        fontSize: `${fontSize}px`,
        fill:     '#ff0000',
        align:    'center',
      }
    ).setOrigin(0.5).setDepth(1000);
  },

};

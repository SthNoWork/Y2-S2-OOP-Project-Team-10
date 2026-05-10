// ========================================
// GAME SCENE: Main orchestrator for gameplay
// ========================================
// Manages arena setup, bombing runs, bomb lifecycle, and reset flow.

class GameScene extends Phaser.Scene {
  // Constructor: set up empty scene state.
  constructor() {
    super('GameScene');
    this.arena = null;
    this.arenaBorder = null;
    this.runState = null;
    this.activeBombs = [];
    this.player = null;
    this.healthText = null;
    this.gameOverTitle = null;
  }

  // ========================================
  // SCENE_SETUP
  // ========================================

  // Initialize arena, player, managers, and UI controls.
  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    const ARENA_X = W * 0.05;
    const ARENA_Y = H * 0.075;
    const ARENA_W = W * 0.9;
    const ARENA_H = H * 0.9;
    const PHYSICS_X = -W;
    const PHYSICS_Y = ARENA_Y;
    const PHYSICS_W = 3 * W;
    const PHYSICS_H = ARENA_H;

    this.arena = { W, H, ARENA_X, ARENA_Y, ARENA_W, ARENA_H, PHYSICS_X, PHYSICS_Y, PHYSICS_W, PHYSICS_H };
    this.runState = null;
    this.activeBombs = [];

    this.cameras.main.setBackgroundColor('#808080');
    // Extend physics bounds: left screen width beyond visible, right screen width beyond visible.
    this.matter.world.setBounds(PHYSICS_X, PHYSICS_Y, PHYSICS_W, PHYSICS_H, 32);

    this.drawArenaBorder();

    this.scale.off('resize', this.onResize, this);
    this.scale.on('resize', this.onResize, this);

    window.PlayerState.init();

    this.player = window.GameSceneObjectFactory.createPlayer(
      this, ARENA_X + ARENA_W / 2, ARENA_Y + ARENA_H / 2, this.arena
    );

    window.BuildingManager.init(this, this.arena);
    window.GameLogic.init(this, this.player, window.BuildingManager.getPlacedBuildings());

    // Building spawn controls — bottom of arena, percent-based
    let controlX = ARENA_X + ARENA_W * 0.02;
    const controlY = ARENA_Y + ARENA_H * 0.94;
    const controlSpacing = ARENA_W * 0.12;

    Object.keys(window.GameSceneObjectConfig.buildingTypes).forEach((type) => {
      window.BuildingManager.spawnBuildingControl(controlX, controlY, type);
      controlX += controlSpacing;
    });

    // UI buttons — top-right of arena, percent-based spacing
    const btnX = ARENA_X + ARENA_W * 0.99;
    const btnY = ARENA_Y + ARENA_H * 0.02;
    const btnGap = ARENA_H * 0.055;

    window.GameSceneObjectFactory.createButton(this, btnX, btnY, '% start', () => {
      // Plane always starts at the left physics border and flies right.
      const spawnX = -this.arena.W;
      const spawnY = ARENA_Y + ARENA_H * 0.04;
      this.startBombingRun(
        ARENA_W * 0.35,
        { x: spawnX, y: spawnY },
        1  // always left-to-right
      );
    });

    window.GameSceneObjectFactory.createButton(this, btnX, btnY + btnGap, 'Reset', () => {
      this.resetLevel();
    });

    addBackButton(this, () => window.startScene('LevelSelectScene'));

    const healthFontSize = Math.round(this.scale.height * 0.03);
    this.healthText = this.add.text(ARENA_X + ARENA_W * 0.01, ARENA_Y + ARENA_H * 0.01, '', {
      fontSize: `${healthFontSize}px`,
      fill: '#ffffff',
    });
  }

  // ========================================
  // BOMBING_RUN_CONTROL
  // ========================================

  // Create plane and initialize randomized bomb drop timing.
  startBombingRun(velocityPxPerSec, spawnLocation, direction) {
    const planeCfg = window.GameSceneObjectConfig?.plane || {};

    if (this.runState?.plane?.active) this.runState.plane.destroy();

    const plane = window.GameSceneObjectFactory.createPlane(this, spawnLocation, this.arena);

    this.runState = {
      plane,
      speed: velocityPxPerSec,
      direction,
      planeVelocity: { x: velocityPxPerSec * direction, y: 0 },
      spawnAccumulator: 0,
      nextBombDelay: (() => {
        const range = planeCfg.bombDropDelayRangeSec || { min: 0.18, max: 0.45 };
        const min = range.min ?? 0.18;
        const max = range.max ?? 0.45;
        return min + Math.random() * Math.max(0, max - min);
      })(),
      bombOffsetY: this.arena.H * (planeCfg.bombDropYOffsetRatio ?? 0.04),
      endX: direction > 0 ? this.arena.W * 2 : -this.arena.W,
    };
  }

  // ========================================
  // RESET_AND_CLEANUP
  // ========================================

  // Destroy all objects, clear state, and reinitialize the scene.
  resetLevel() {
    // Stop plane
    if (this.runState?.plane?.active) {
      try { this.runState.plane.destroy(); } catch (e) {}
    }
    this.runState = null;

    // Destroy all active bombs
    for (const bomb of this.activeBombs) {
      if (bomb?.active) {
        try { bomb.destroy(); } catch (e) {}
      }
    }
    this.activeBombs = [];

    // Destroy placed buildings
    for (const building of window.BuildingManager.getPlacedBuildings().slice()) {
      try { window.BuildingManager.destroyBuilding(building); } catch (e) {}
    }

    // Destroy game-over title
    if (this.gameOverTitle) {
      try { this.gameOverTitle.destroy(); } catch (e) {}
      this.gameOverTitle = null;
    }

    // Reset building manager state only — no new input handlers
    window.BuildingManager.resetState();

    // Reset player
    window.PlayerState.init();

    const px = this.arena.ARENA_X + this.arena.ARENA_W / 2;
    const py = this.arena.ARENA_Y + this.arena.ARENA_H / 2;

    if (!this.player || !this.player.active) {
      this.player = window.GameSceneObjectFactory.createPlayer(this, px, py, this.arena);
    } else {
      if (this.player.body) {
        try {
          Phaser.Physics.Matter.Matter.Body.setPosition(this.player.body, { x: px, y: py });
          Phaser.Physics.Matter.Matter.Body.setVelocity(this.player.body, { x: 0, y: 0 });
        } catch (e) {}
      }
    }

    // Re-init game logic — removes old collision listener, adds fresh one
    window.GameLogic.init(this, this.player, window.BuildingManager.getPlacedBuildings());

    if (this.healthText) {
      this.healthText.setText(`Health: ${window.PlayerState.health}`);
    }
  }

  // ========================================
  // BOMB_SPAWNING
  // ========================================

  // Create one bomb with randomized position and inherit plane velocity.
  spawnBomb() {
    if (!this.runState?.plane?.active) return;

    const { plane, planeVelocity, bombOffsetY } = this.runState;
    const planeCfg = window.GameSceneObjectConfig?.plane || {};
    const offsetRange = planeCfg.bombDropOffsetRatioRange || { min: -0.35, max: 0.35 };
    const planeWidth = this.arena.W * (planeCfg.widthRatio || 0.12);
    const offsetX = (offsetRange.min + Math.random() * Math.max(0, offsetRange.max - offsetRange.min)) * planeWidth;

    const bomb = window.GameSceneObjectFactory.createBomb(
      this, plane.x + offsetX, plane.y + bombOffsetY, this.arena
    );

    const matterStepRate = 60;
    Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, {
      x: planeVelocity.x / matterStepRate,
      y: planeVelocity.y / matterStepRate,
    });

    this.activeBombs.push(bomb);
  }

  // ========================================
  // GAME_LOOP
  // ========================================

  // Per-frame update: move plane, trigger bomb spawns, and clean up.
  update(_time, delta) {
    const dt = delta / 1000;

    if (this.runState?.plane?.active) {
      const state = this.runState;
      const prevX = state.plane.x;
      const prevY = state.plane.y;

      state.plane.x += state.speed * state.direction * dt;

      const safeDt = dt > 0 ? dt : 1 / 60;
      state.planeVelocity.x = (state.plane.x - prevX) / safeDt;
      state.planeVelocity.y = (state.plane.y - prevY) / safeDt;

      state.spawnAccumulator += dt;
      const maxDelay = window.GameSceneObjectConfig?.plane?.bombDropDelayRangeSec?.max ?? 0.45;
      const minDelay = window.GameSceneObjectConfig?.plane?.bombDropDelayRangeSec?.min ?? 0.18;
      while (state.spawnAccumulator >= state.nextBombDelay) {
        this.spawnBomb();
        state.spawnAccumulator -= state.nextBombDelay;
        state.nextBombDelay = minDelay + Math.random() * Math.max(0, maxDelay - minDelay);
      }

      const reachedEnd = state.direction > 0
        ? state.plane.x >= state.endX
        : state.plane.x <= state.endX;

      if (reachedEnd) {
        state.plane.destroy();
        this.runState = null;
      }
    }

    if (this.activeBombs.length > 0) {
      const bottom = this.arena.ARENA_Y + this.arena.ARENA_H;

      for (let i = this.activeBombs.length - 1; i >= 0; i--) {
        const bomb = this.activeBombs[i];
        if (!bomb.active || bomb.y >= bottom) {
          if (bomb.active) {
            const radius = Math.max(this.arena.W * 0.06, this.arena.H * 0.06);
            const force = window.GameSceneObjectConfig?.bomb?.blastForce || 50;
            try { window.GameLogic.createBlastRadius(bomb.x, bomb.y, radius, force); } catch (e) {}
            try { bomb.destroy(); } catch (e) {}
          }
          this.activeBombs.splice(i, 1);
        }
      }
    }

    if (this.healthText) {
      this.healthText.setText(`Health: ${window.PlayerState.health}`);
    }

    // Show game-over title only once when player dies
    if (window.PlayerState.gameOver && !this.gameOverTitle) {
      const gameOverFontSize = Math.round(this.scale.height * 0.1);
      this.gameOverTitle = this.add.text(
        this.arena.ARENA_X + this.arena.ARENA_W * 0.5,
        this.arena.ARENA_Y + this.arena.ARENA_H * 0.5,
        'GAME OVER',
        {
          fontSize: `${gameOverFontSize}px`,
          fill: '#ff0000',
          align: 'center',
        }
      ).setOrigin(0.5).setDepth(1000);
    }
  }

  // Redraw the visible arena border so it matches the current screen size.
  drawArenaBorder() {
    if (this.arenaBorder) {
      this.arenaBorder.clear();

    // Show game-over title only once when player dies
    if (window.PlayerState.gameOver && !this.gameOverTitle) {
      this.gameOverTitle = this.add.text(
        this.arena.ARENA_X + this.arena.ARENA_W * 0.5,
        this.arena.ARENA_Y + this.arena.ARENA_H * 0.5,
        'GAME OVER',
        {
          fontSize: '48px',
          fill: '#ff0000',
          align: 'center',
        }
      ).setOrigin(0.5).setDepth(1000);
    }
    } else {
      this.arenaBorder = this.add.graphics();
    }

    const arena = this.arena;
    if (!arena) return;

    this.arenaBorder
      .lineStyle(2, 0xffffff, 1)
      .strokeRect(arena.PHYSICS_X, arena.PHYSICS_Y, arena.PHYSICS_W, arena.PHYSICS_H);
  }

  // Keep the border aligned when the game screen size changes.
  onResize(gameSize) {
    const W = gameSize.width;
    const H = gameSize.height;

    const ARENA_X = W * 0.05;
    const ARENA_Y = H * 0.075;
    const ARENA_W = W * 0.9;
    const ARENA_H = H * 0.9;
    const PHYSICS_X = -W;
    const PHYSICS_Y = ARENA_Y;
    const PHYSICS_W = 3 * W;
    const PHYSICS_H = ARENA_H;

    this.arena = { W, H, ARENA_X, ARENA_Y, ARENA_W, ARENA_H, PHYSICS_X, PHYSICS_Y, PHYSICS_W, PHYSICS_H };
    this.matter.world.setBounds(PHYSICS_X, PHYSICS_Y, PHYSICS_W, PHYSICS_H, 32);
    this.drawArenaBorder();
  }
}
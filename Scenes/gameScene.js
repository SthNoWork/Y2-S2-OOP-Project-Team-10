class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.arena = null;
    this.runState = null;
    this.activeBombs = [];
    this.player = null;
    this.healthText = null;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    const ARENA_X = W * 0.05;
    const ARENA_Y = H * 0.075;
    const ARENA_W = W * 0.9;
    const ARENA_H = H * 0.9;

    this.arena = { W, H, ARENA_X, ARENA_Y, ARENA_W, ARENA_H };
    this.runState = null;
    this.activeBombs = [];

    this.cameras.main.setBackgroundColor('#808080');
    this.matter.world.setBounds(ARENA_X, ARENA_Y, ARENA_W, ARENA_H, 32);

    this.add.graphics()
      .lineStyle(2, 0xffffff, 1)
      .strokeRect(ARENA_X, ARENA_Y, ARENA_W, ARENA_H);

    window.PlayerState.init();

    this.player = window.GameSceneObjectFactory.createPlayer(
      this, ARENA_X + ARENA_W / 2, ARENA_Y + ARENA_H / 2, this.arena
    );

    window.BuildingManager.init(this, this.arena);
    window.GameLogic.init(this, this.player, window.BuildingManager.getPlacedBuildings());

    // Building spawn controls — bottom of arena
    let controlX = ARENA_X + ARENA_W * 0.02;
    const controlY = ARENA_Y + ARENA_H - H * 0.06;
    const controlSpacing = ARENA_W * 0.12;

    Object.keys(window.GameSceneObjectConfig.buildingTypes).forEach((type) => {
      window.BuildingManager.spawnBuildingControl(controlX, controlY, type);
      controlX += controlSpacing;
    });

    // UI buttons — top-right of arena, consistent spacing
    const btnX = ARENA_X + ARENA_W - 10;
    const btnY = ARENA_Y + 10;
    const btnGap = 50;

    window.GameSceneObjectFactory.createButton(this, btnX, btnY, '% start', () => {
      this.startBombingRun(
        0.3,
        ARENA_W * 0.35,
        { x: ARENA_X + ARENA_W * 0.02, y: ARENA_Y + ARENA_H * 0.04 },
        1
      );
    });

    window.GameSceneObjectFactory.createButton(this, btnX, btnY + btnGap, 'Reset', () => {
      this.resetLevel();
    });

    addBackButton(this, () => window.startScene('LevelSelectScene'));

    this.healthText = this.add.text(ARENA_X + 10, ARENA_Y + 10, '', {
      fontSize: '16px',
      fill: '#ffffff',
    });
  }

  startBombingRun(tickSec, velocityPxPerSec, spawnLocation, direction) {
    const { ARENA_X, ARENA_W, H } = this.arena;

    if (this.runState?.plane?.active) this.runState.plane.destroy();

    const plane = window.GameSceneObjectFactory.createPlane(this, spawnLocation, this.arena);

    this.runState = {
      plane,
      tickSec,
      speed: velocityPxPerSec,
      direction,
      planeVelocity: { x: velocityPxPerSec * direction, y: 0 },
      bombsLeft: 10,
      spawnAccumulator: 0,
      bombOffsetY: H * 0.04,
      endX: direction > 0 ? ARENA_X + ARENA_W - 20 : ARENA_X + 20,
    };
  }

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

  spawnBomb() {
    if (!this.runState?.plane?.active) return;

    const { plane, planeVelocity, bombOffsetY } = this.runState;

    const bomb = window.GameSceneObjectFactory.createBomb(
      this, plane.x, plane.y + bombOffsetY, this.arena
    );

    const matterStepRate = 60;
    Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, {
      x: planeVelocity.x / matterStepRate,
      y: planeVelocity.y / matterStepRate,
    });

    this.activeBombs.push(bomb);
    window.GameLogic.addBomb(bomb);
  }

  update(_time, delta) {
    if (!window.PlayerState.isAlive()) return;

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
      while (state.spawnAccumulator >= state.tickSec && state.bombsLeft > 0) {
        this.spawnBomb();
        state.spawnAccumulator -= state.tickSec;
        state.bombsLeft -= 1;
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
            const radius = Math.max(80, this.scale.width * 0.06);
            const force = window.GameSceneObjectConfig?.bomb?.blastForce || 50;
            try { window.GameLogic.createBlastRadius(bomb.x, bomb.y, radius, force); } catch (e) {}
            try { bomb.destroy(); } catch (e) {}
          }
          window.GameLogic.removeBomb(bomb);
          this.activeBombs.splice(i, 1);
        }
      }
    }

    if (this.healthText) {
      this.healthText.setText(`Health: ${window.PlayerState.health}`);
    }
  }
}
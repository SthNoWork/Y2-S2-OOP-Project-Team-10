// core/game1v1States.js
// Turn-based state subclasses representing different phases of the 1v1 game mode.

class Game1v1State {
  constructor(scene) {
    this.scene = scene;
  }
  get phase() { return ''; }
  enter() {}
  exit() {}
  update(time, delta) {}
  detonateBomb(bomb) {}
}

class P1BuildState extends Game1v1State {
  get phase() { return 'P1_BUILD'; }

  enter() {
    this.scene.turnText.setText("PLAYER 1: BUILD PHASE");
    this.scene.turnText.setFill('#00ffff');
    this.scene.readyBtn.setVisible(true);
    this.scene.readyBtn.setText("Ready (Next Turn)");
    this.scene.readyBtn.setBackgroundColor('#00aa00');
    this.scene.resetBtn.setVisible(true);
    this.scene.refreshInventoryUI();
  }
}

class P2BuildState extends Game1v1State {
  get phase() { return 'P2_BUILD'; }

  enter() {
    this.scene.turnText.setText("PLAYER 2: BUILD PHASE");
    this.scene.turnText.setFill('#ff00ff');
    this.scene.readyBtn.setVisible(true);
    this.scene.readyBtn.setText("Start Game ⚔️");
    this.scene.readyBtn.setBackgroundColor('#aa0000');
    this.scene.resetBtn.setVisible(true);
    this.scene.refreshInventoryUI();
  }
}

class ActionState extends Game1v1State {
  get phase() { return 'ACTION'; }

  enter() {
    this.scene.turnText.setText("FIGHT!");
    this.scene.turnText.setFill('#ffaa00');
    this.scene.readyBtn.setVisible(false);
    this.scene.resetBtn.setVisible(false);
    this.scene.hasFiredOnce = false;

    // Disable inventory button displays
    this.scene.inventoryButtons.forEach(btn => btn.destroy());
    this.scene.inventoryButtons = [];

    // Make all placed static structures dynamic and activate them
    this.scene.placedObjects.forEach(obj => {
      if (obj && obj.body) {
        obj.setStatic(false);
      }
      if (typeof obj.activate === 'function') {
        const isP1 = obj.x < 960;
        const target = isP1 ? this.scene.player2 : this.scene.player1;
        obj.activate(target, {
          collisionCategory: isP1 ? window.CollisionLayers.EXPLOSIVE_P1 : window.CollisionLayers.EXPLOSIVE_P2,
          collisionMask: window.CollisionLayers.DEFAULT | window.CollisionLayers.PLAYER_1 | window.CollisionLayers.PLAYER_2 | window.CollisionLayers.STRUCTURE
        });
      }
    });

    // Spawn divider explosion particles/flash for action start
    try { window.SfxManager?.playCoin?.(); } catch (e) {}
  }

  update(time, delta) {
    this.handlePlayerMovement();
    this.checkWinCondition();

    // Check if all placed weapon structures are out of ammo and there are no active projectiles left in the air
    const anyWeaponsPlaced = this.scene.placedObjects.some(obj => obj.active && typeof obj.activate === 'function');
    const anyWeaponHasAmmo = window.GameLogicHelper?.anyWeaponHasAmmo?.(this.scene);
    const bombsExist = window.GameLogicHelper?.hasActiveBombs?.(this.scene);

    let canEndRound = false;
    if (anyWeaponsPlaced) {
      canEndRound = this.scene.hasFiredOnce && !anyWeaponHasAmmo && !bombsExist;
    } else {
      canEndRound = !bombsExist;
    }

    if (canEndRound) {
      // Both players survived the firing phase! Transition back to build phase for next round.
      // Clean active bombs lists
      this.scene.activeBombs = [];

      // Settle all structures back to normal gravity behavior during build phase so players can re-drag them
      this.scene.placedObjects.forEach(obj => {
        if (obj && obj.body) {
          obj.setStatic(false);
        }
      });

      try { window.SfxManager?.playDmgShield?.(); } catch (e) {}

      // Transition to reward selection phase for P1, then P2, then P1 build
      this.scene.changeState(new ChooseRewardState(this.scene, 1));
    }
  }

  handlePlayerMovement() {
    const SPEED = 5;
    const JUMP_FORCE = -11;

    // Player 1 (Left side) Movement
    if (this.scene.player1?.active && this.scene.player1.body) {
      let vx = 0;
      if (this.scene.keys.a.isDown) vx = -SPEED;
      else if (this.scene.keys.d.isDown) vx = SPEED;
      
      this.scene.matter.body.setVelocity(this.scene.player1.body, { x: vx, y: this.scene.player1.body.velocity.y });

      // Jump when standing on ground/barrier with low vertical velocity
      const isGrounded = Math.abs(this.scene.player1.body.velocity.y) < 0.05;
      if ((this.scene.keys.w.isDown || this.scene.keys.space.isDown) && isGrounded) {
        this.scene.matter.body.setVelocity(this.scene.player1.body, { x: vx, y: JUMP_FORCE });
      }
    }

    // Player 2 (Right side) Movement
    if (this.scene.player2?.active && this.scene.player2.body) {
      let vx = 0;
      if (this.scene.keys.left.isDown) vx = -SPEED;
      else if (this.scene.keys.right.isDown) vx = SPEED;

      this.scene.matter.body.setVelocity(this.scene.player2.body, { x: vx, y: this.scene.player2.body.velocity.y });

      const isGrounded = Math.abs(this.scene.player2.body.velocity.y) < 0.05;
      if (this.scene.keys.up.isDown && isGrounded) {
        this.scene.matter.body.setVelocity(this.scene.player2.body, { x: vx, y: JUMP_FORCE });
      }
    }
  }

  checkWinCondition() {
    const p1Hp = this.scene.player1 ? Math.max(0, this.scene.player1.health) : 0;
    const p2Hp = this.scene.player2 ? Math.max(0, this.scene.player2.health) : 0;

    this.scene.p1HpText.setText(`P1 HP: ${p1Hp}`);
    this.scene.p2HpText.setText(`P2 HP: ${p2Hp}`);

    if (p1Hp <= 0 || p2Hp <= 0) {
      this.scene.changeState(new window.GameOverState(this.scene));
    }
  }

  detonateBomb(bomb) {
    if (!bomb || !bomb.active || bomb._dying) return;
    bomb._dying = true;

    const type = bomb.buildingType || bomb.objectType;
    const cfg = window.ObjectConfig.placeableTypes[type] || window.ObjectConfig.internalTypes[type] || window.ObjectConfig.levelTypes[type] || {};

    try {
      const cmd = new window.ExplosionCommand(this.scene, {
        x: bomb.x,
        y: bomb.y,
        explosiveCfg: cfg,
        sourceBomb: bomb
      });
      cmd.execute();
    } catch (e) {
      console.error('Error executing ExplosionCommand in detonateBomb:', e);
    }

    try {
      this.scene.activeBombs = this.scene.activeBombs.filter(b => b !== bomb);
      this.scene.placedObjects = this.scene.placedObjects.filter(b => b !== bomb);
      window.ObjectFactory.destroy(bomb);
    } catch(e){}
  }
}

class ChooseRewardState extends Game1v1State {
  get phase() { return 'CHOOSE_REWARD'; }

  constructor(scene, playerNum) {
    super(scene);
    this.playerNum = playerNum; // 1 or 2
    this.cards = [];
  }

  enter() {
    this.scene.readyBtn.setVisible(false);
    this.scene.resetBtn.setVisible(false);

    const isP1 = this.playerNum === 1;
    const sideName = isP1 ? "PLAYER 1" : "PLAYER 2";
    const sideColor = isP1 ? "#00ffff" : "#ff00ff";

    this.scene.turnText.setText(`${sideName}: CHOOSE REWARD`);
    this.scene.turnText.setFill(sideColor);

    // Pick 3 random rewards
    const options = [
      { key: 'shortPlank', count: 2, label: '+2 Short Planks' },
      { key: 'longPlank', count: 2, label: '+2 Long Planks' },
      { key: 'pillar', count: 2, label: '+2 Pillars' },
      { key: 'cube', count: 3, label: '+3 Cubes' },
      { key: 'trampoline1v1', count: 2, label: '+2 Trampolines' },
      { key: 'pillbox1v1', count: 1, label: '+1 Pillbox' },
      { key: 'mortar1v1', count: 1, label: '+1 Mortar' }
    ];

    // Shuffle options and pick 3
    const shuffled = options.sort(() => 0.5 - Math.random()).slice(0, 3);

    // Render cards as clickable graphics
    const cx = isP1 ? 480 : 1440;
    const cy = 400;

    shuffled.forEach((opt, idx) => {
      const yOffset = (idx - 1) * 110;

      const card = window.UIFactory.createCardButton(this.scene, {
        x: cx,
        y: cy + yOffset,
        width: 340,
        height: 80,
        label: opt.label,
        strokeColor: isP1 ? 0x00ffff : 0xff00ff,
        onClick: () => {
          // Add item to inventory
          const pKey = isP1 ? 'p1' : 'p2';
          this.scene.inventories[pKey][opt.key] = (this.scene.inventories[pKey][opt.key] || 0) + opt.count;

          try { window.SfxManager?.playCoin?.(); } catch (e) {}
          this.exit();

          if (isP1) {
            this.scene.changeState(new ChooseRewardState(this.scene, 2));
          } else {
            this.scene.changeState(new window.P1BuildState(this.scene));
          }
        }
      });

      this.cards.push(card.background, card.text);
    });
  }

  exit() {
    this.cards.forEach(c => {
      try { c.destroy(); } catch (e) {}
    });
    this.cards = [];
  }
}

class GameOverState extends Game1v1State {
  get phase() { return 'GAME_OVER'; }

  enter() {
    this.scene.readyBtn.setVisible(false);
    this.scene.resetBtn.setVisible(false);

    const p1Hp = this.scene.player1 ? Math.max(0, this.scene.player1.health) : 0;
    const p2Hp = this.scene.player2 ? Math.max(0, this.scene.player2.health) : 0;

    const p1Won = p2Hp <= 0 && p1Hp > 0;
    const winnerName = p1Won ? "PLAYER 1" : "PLAYER 2";
    const fillColor = p1Won ? "#00ffff" : "#ff00ff";

    this.scene.turnText.setText(`${winnerName} WINS! 🏆`);
    this.scene.turnText.setFill(fillColor);

    // Create retry and exit UI
    const cx = 960;
    const cy = 400;

    const retryBtn = window.UIFactory.createLabelButton(this.scene, {
      x: cx - 150,
      y: cy,
      label: "Retry",
      backgroundColor: '#00aa00',
      onClick: () => {
        retryBtn.destroy();
        menuBtn.destroy();
        this.scene.reload();
      }
    });

    const menuBtn = window.UIFactory.createLabelButton(this.scene, {
      x: cx + 150,
      y: cy,
      label: "Menu",
      backgroundColor: '#555555',
      onClick: () => {
        retryBtn.destroy();
        menuBtn.destroy();
        if (window.htmlBackBtn) window.htmlBackBtn.classList.remove('active');
        window.showHomeScreen();
      }
    });
  }
}

window.P1BuildState = P1BuildState;
window.P2BuildState = P2BuildState;
window.ActionState = ActionState;
window.ChooseRewardState = ChooseRewardState;
window.GameOverState = GameOverState;

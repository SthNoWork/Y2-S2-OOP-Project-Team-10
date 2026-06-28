class Game1v1State {
  constructor(scene) {
    this.scene = scene;
  }
  enter() {}
  exit() {}
  update(time, delta) {}
}

class P1BuildState extends Game1v1State {
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
  enter() {
    this.scene.turnText.setText("FIGHT!");
    this.scene.turnText.setFill('#ffaa00');
    this.scene.readyBtn.setVisible(false);
    this.scene.resetBtn.setVisible(false);
    this.scene.hasFiredOnce = false;

    // Disable inventory button displays
    this.scene.inventoryButtons.forEach(btn => btn.destroy());
    this.scene.inventoryButtons = [];

    // Make all placed static structures dynamic, but keep pillboxes and mortars static and activate them
    this.scene.placedObjects.forEach(obj => {
      if (obj && obj.body) {
        if (obj.buildingType === 'pillbox1v1' || obj.buildingType === 'mortar1v1') {
          obj.setStatic(true);
        } else {
          obj.setStatic(false);
        }
      }
      if (typeof obj.activate === 'function') {
        const isP1 = obj.x < 960;
        const target = isP1 ? this.scene.player2 : this.scene.player1;
        obj.activate(target, {
          collisionCategory: isP1 ? 0x0010 : 0x0020,
          collisionMask: 0x0001 | 0x0002 | 0x0004 | 0x0008
        });
      }
    });

    // Spawn divider explosion particles/flash for action start
    try { window.SfxManager?.playCoin?.(); } catch (e) {}
  }

  update(time, delta) {
    this.scene.handlePlayerMovement();
    this.scene.checkWinCondition();

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
}

class ChooseRewardState extends Game1v1State {
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

      const cardBg = this.scene.add.rectangle(cx, cy + yOffset, 340, 80, 0x0a1825, 0.95)
        .setDepth(2100)
        .setStrokeStyle(3, isP1 ? 0x00ffff : 0xff00ff, 0.8)
        .setInteractive({ useHandCursor: true });

      const cardText = this.scene.add.text(cx, cy + yOffset, opt.label, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '22px',
        fill: '#ffffff'
      }).setOrigin(0.5).setDepth(2101).setInteractive({ useHandCursor: true });

      this.cards.push(cardBg, cardText);

      const selectReward = () => {
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
      };

      cardBg.on('pointerdown', selectReward);
      cardText.on('pointerdown', selectReward);
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

    const retryBtn = this.scene.add.text(cx - 150, cy, "Retry", {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '32px',
      fill: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setDepth(2100).setInteractive({ useHandCursor: true });

    const menuBtn = this.scene.add.text(cx + 150, cy, "Menu", {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '32px',
      fill: '#ffffff',
      backgroundColor: '#555555',
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setDepth(2100).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      retryBtn.destroy();
      menuBtn.destroy();
      this.scene.scene.restart();
    });

    menuBtn.on('pointerdown', () => {
      retryBtn.destroy();
      menuBtn.destroy();
      if (window.htmlBackBtn) window.htmlBackBtn.classList.remove('active');
      window.showHomeScreen();
    });
  }
}

window.P1BuildState = P1BuildState;
window.P2BuildState = P2BuildState;
window.ActionState = ActionState;
window.ChooseRewardState = ChooseRewardState;
window.GameOverState = GameOverState;

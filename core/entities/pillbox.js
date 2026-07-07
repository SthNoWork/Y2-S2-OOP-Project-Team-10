// core/entities/pillbox.js
// Pillbox enemy entity that fires bombs.

class Pillbox extends Attacker {
  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);
  }

  // Alias activate to shoot for backwards compatibility
  activate(target, options = {}) {
    this.shoot(target, options);
  }

  shoot(target, options = {}) {
    if (!this.active || this._dying || !this.scene) return;
    if (this._weaponTimer) {
      try { this._weaponTimer.destroy(); } catch (e) {}
    }

    this.isOutOfAmmo = false;
    let shotsFired = 0;
    const cfg = this.buildingConfig || window.ObjectConfig.internalTypes.pillbox;
    const weapon = cfg?.weapon;
    if (!weapon) return;

    const fireCycle = () => {
      if (!this.active || this._dying || this.health <= 0 || !target || !target.active || target.health <= 0) {
        if (this._weaponTimer) {
          try { this._weaponTimer.destroy(); } catch (e) {}
        }
        return;
      }

      if (weapon.ammo !== undefined && shotsFired >= weapon.ammo) {
        this.isOutOfAmmo = true;
        return;
      }

      const bombType = weapon.bomb || 'smallBomb';
      const spread = weapon.spreadAngleDeg ?? 5;
      const speedSpread = weapon.speedSpreadRatio ?? 0.15;
      const minAngle = weapon.minAngleDeg ?? 75;
      const fireRate = weapon.fireRateMs ?? 2500;

      const { x: spawnX, y: spawnY } = window.GameLogicHelper.getSafeSpawnPosition(this, target, 0.85);
      const dx = target.x - spawnX;
      const dy = target.y - spawnY;

      const bomb = window.GameLogicHelper.fireHighArcBomb(this.scene, {
        bombType,
        spawnX,
        spawnY,
        dx,
        dy,
        target,
        owner: this,
        spreadAngleDeg: spread,
        speedSpreadRatio: speedSpread,
        minAngleDeg: minAngle
      });

      if (bomb) {
        bomb.isBomb = true;
        if (window.EntityManager) window.EntityManager.registerEntity(bomb);
        if (bomb.body) {
          if (options.collisionCategory !== undefined) {
            bomb.body.collisionFilter.category = options.collisionCategory;
          }
          if (options.collisionMask !== undefined) {
            bomb.body.collisionFilter.mask = options.collisionMask;
          }
        }
      }

      shotsFired++;
      if (weapon.ammo !== undefined && shotsFired >= weapon.ammo) {
        this.isOutOfAmmo = true;
        return;
      }

      const nextDelay = fireRate + Math.random() * (weapon.randomDelayMs ?? 500);
      this._weaponTimer = this.scene.time.delayedCall(nextDelay, fireCycle);
    };

    const initDelay = (weapon.initialDelayMs ?? 1000) + Math.random() * (weapon.randomDelayMs ?? 500);
    this._weaponTimer = this.scene.time.delayedCall(initDelay, fireCycle);
  }
}

window.Pillbox = Pillbox;

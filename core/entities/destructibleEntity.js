// core/entities/destructibleEntity.js
// Base class for all gameplay entities that have health, take damage, and can die.

class DestructibleEntity extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);
    this.health = 0;
    this.maxHealth = 0;
    this._hpLabel = null;
    this._dying = false;
    scene.add.existing(this);
  }

  setHealth(health) {
    this.health = health;
    this.maxHealth = health;
    this.updateHpLabel();
  }

  takeDamage(amount) {
    if (!this.active || this._dying) return false;
    if (this.maxHealth < 0) return false; // Indestructible
    this.health = Math.max(0, this.health - amount);
    this.updateHpLabel();
    if (this.health <= 0) {
      this._dying = true;
      this.onDeath();
      return true;
    }
    return false;
  }

  updateHpLabel() {
    if (!this.active || this._dying) {
      this.destroyHpLabel();
      return;
    }

    if (!window.SHOW_HITBOXES) {
      this.destroyHpLabel();
      return;
    }

    if (!this._hpLabel?.active) {
      this._hpLabel = this.scene.add.text(this.x, this.y, `HP:${Math.max(0, Math.round(this.health))}`, {
        fontSize: '18px',
        fill: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 3, y: 2 },
      });
      this._hpLabel.setOrigin(0.5, 1);
      this._hpLabel.setDepth(3000);
    }

    this._hpLabel.x = this.x;
    this._hpLabel.y = this.y - (this.displayHeight ?? 0) * 0.5;
    this._hpLabel.setText(`HP:${Math.max(0, Math.round(this.health))}`);
  }

  destroyHpLabel() {
    if (this._hpLabel?.active) {
      this._hpLabel.destroy();
    }
    this._hpLabel = null;
  }

  onDeath() {
    const cfg = this.buildingConfig || window.ObjectConfig?.internalTypes?.[this.objectType] || window.ObjectConfig?.placeableTypes?.[this.objectType] || window.ObjectConfig?.levelTypes?.[this.objectType] || {};
    const shouldExplode = cfg.onDeath === 'explode' && cfg.explosion;
    
    if (shouldExplode && window.EntityManager) {
      window.EntityManager.queueChainExplosion({
        cfg,
        x: this.x,
        y: this.y,
        sourceBomb: this
      });
    }
    this.destroy();
  }

  destroy(fromScene) {
    this.destroyHpLabel();
    
    // Clean up Matter constraints attached to this body
    if (this.body && this.body._constraints && this.scene && this.scene.matter?.world) {
      for (const c of this.body._constraints) {
        try { this.scene.matter.world.removeConstraint(c); } catch (e) {}
        const other = c.bodyA === this.body ? c.bodyB : c.bodyA;
        if (other && other._constraints) {
          other._constraints = other._constraints.filter(x => x !== c);
        }
      }
      this.body._constraints = [];
    }

    // Unregister from the EntityManager
    if (window.EntityManager) {
      try { window.EntityManager.unregisterEntity(this); } catch (e) {}
    }

    super.destroy(fromScene);
  }
}

window.DestructibleEntity = DestructibleEntity;

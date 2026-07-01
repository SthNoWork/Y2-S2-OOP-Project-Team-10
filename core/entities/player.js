// core/entities/player.js
// Player entity class.

class Player extends DestructibleEntity {
  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);
    this._equippedSkin = '';
    this._shielded = false;
    this._shieldEnd = 0;
  }

  takeDamage(amount) {
    // Shield active — absorb the hit completely, no HP reduction
    if (this._shielded && this._shieldEnd && Date.now() < this._shieldEnd) {
      return false;
    }
    return super.takeDamage(amount);
  }

  onDeath() {
    const playerCfg = window.ObjectConfig?.internalTypes?.player || {};
    const shouldExplode = playerCfg.onDeath === 'explode' && playerCfg.explosion;
    
    if (shouldExplode && window.EntityManager) {
      window.EntityManager.queueChainExplosion({
        cfg: playerCfg,
        x: this.x,
        y: this.y,
        sourceBomb: this
      });
    }

    if (window.GameLogic && window.GameLogic.player === this) {
      window.GameLogic._triggerGameOver();
    }
    
    super.onDeath();
  }
}

window.Player = Player;

// core/gameLogic.helper.js
// Trajectory and pooling helper functions for bomb revamped logic.
// Kept separate to keep the main gameLogic.js file focused and readable.

window.ObjectFactory = window.ObjectFactory || {};
window.ObjectFactory._bombPool = window.ObjectFactory._bombPool || [];
window.ObjectFactory._poolCleanupRegistered = window.ObjectFactory._poolCleanupRegistered || new Set();

window.GameLogicHelper = {

  // Solves the ballistic launch angle to hit (dx, dy) under gravity g and speed v.
  // Coordinates are standard 2D with y-downwards and g-downwards (g > 0).
  solveBallistic(dx, dy, v, g) {
    if (Math.abs(g) < 0.001) {
      return Math.atan2(dy, dx);
    }
    const v2 = v * v;
    const discriminant = v2 * v2 - g * (g * dx * dx + 2 * dy * v2);
    if (discriminant < 0) {
      // Out of range, aim directly at target
      return Math.atan2(dy, dx);
    }
    const root = Math.sqrt(discriminant);
    // low trajectory angle: atan2(v^2 - root, g * x)
    return Math.atan2(v2 - root, g * dx);
  },

  // Pulls a matching deactivated bomb from the ObjectFactory pool.
  getPooledBomb(scene, bombTypeKey) {
    const pool = window.ObjectFactory._bombPool;
    const idx = pool.findIndex(b => b.objectType === bombTypeKey && b.scene === scene);
    if (idx !== -1) {
      const bomb = pool.splice(idx, 1)[0];
      bomb.setActive(true);
      bomb.setVisible(true);
      if (bomb.body) {
        try { scene.matter.world.add(bomb.body); } catch (e) { }
      }
      return bomb;
    }
    return null;
  },

  // Registers a listener on scene shutdown to clean up its pooled sprites.
  registerPoolCleanup(scene) {
    const registered = window.ObjectFactory._poolCleanupRegistered;
    if (!registered.has(scene)) {
      registered.add(scene);
      scene.events.once('shutdown', () => {
        registered.delete(scene);
        if (window.ObjectFactory._bombPool) {
          window.ObjectFactory._bombPool.forEach(b => {
            if (b.scene === scene) {
              if (b.originalDestroy) {
                try { b.originalDestroy(); } catch (e) { }
              } else {
                try { Phaser.GameObjects.Sprite.prototype.destroy.call(b); } catch (e) { }
              }
            }
          });
          window.ObjectFactory._bombPool = window.ObjectFactory._bombPool.filter(b => b.scene !== scene);
        }
      });
    }
  },

  // Overrides a poolable bomb's .destroy() method to recycle it instead of completely freeing it.
  setupPoolableBomb(bomb, bombCfg) {
    const poolable = bombCfg.poolable !== undefined ? bombCfg.poolable : false;
    if (poolable && !bomb.originalDestroy) {
      bomb.originalDestroy = bomb.destroy;
      bomb.destroy = function() {
        if (!this.active) return;

        // Cancel any active lifetime timer
        if (this._lifetimeTimer) {
          this._lifetimeTimer.destroy();
          this._lifetimeTimer = null;
        }

        // Cleanup HP debug label if active
        if (window.ObjectFactory.destroyDebugLabel) {
          try { window.ObjectFactory.destroyDebugLabel(this); } catch (e) { }
        }

        this.setActive(false);
        this.setVisible(false);
        if (this.body) {
          try { this.scene.matter.world.remove(this.body); } catch (e) { }
        }

        // Ensure bomb is removed from the active bombs list immediately
        if (window.GameLogic?._activeBombs) {
          window.GameLogic._activeBombs = window.GameLogic._activeBombs.filter(b => b !== this);
        }

        window.ObjectFactory._bombPool.push(this);
      };
    }
  }

};

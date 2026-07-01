// core/entities/attacker.js
// Base class for entities that can shoot, spawn, and handle their own lifecycle.

class Attacker extends DestructibleEntity {
  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);
  }

  spawn() {
    // Post-spawn initialization hook
  }

  shoot(target, options = {}) {
    // Abstract method to be overridden by subclasses
  }

  preDestroy() {
    if (this._weaponTimer) {
      try { this._weaponTimer.destroy(); } catch (e) {}
      this._weaponTimer = null;
    }
  }

  destroy(fromScene) {
    this.preDestroy();
    super.destroy(fromScene);
  }
}

window.Attacker = Attacker;

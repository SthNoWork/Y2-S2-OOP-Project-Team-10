// core/entities/plane.js
// Plane enemy entity that flies and drops bombs.

class Plane extends Attacker {
  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);
    this._blade = null;
    this._updateHandler = null;
    this._bombTimerEvent = null;
  }

  startFlight(speed, direction, bombType) {
    if (!this.active || !this.scene) return;

    const scene = this.scene;
    const cfg = this.buildingConfig || window.ObjectConfig.internalTypes.plane;

    // Create rotor blade
    const blade = scene.add.sprite(this.x, this.y, 'plane_atlas', 'plane_blade_1');
    if (cfg.bladeScale !== undefined) blade.setScale(cfg.bladeScale);
    blade.setDepth((this.depth || 0) + 1);
    blade.setFlipX(direction > 0);
    this.setFlipX(direction > 0);
    if (scene.anims.exists('plane_blades')) blade.play('plane_blades');
    this._blade = blade;

    // Calculate exit coordinate
    const exitX = direction > 0 ? 2200 : -300;

    // Set up update handler for movement and blade synchronization
    const updateHandler = (time, delta) => {
      if (!this.active) {
        scene.events.off('update', updateHandler);
        if (this._blade?.active) this._blade.destroy();
        return;
      }

      const dt = delta / 1000;
      this.x += speed * direction * dt;

      if (this._blade && this._blade.active) {
        const bladeOffsetY = cfg.bladeOffsetY * this.displayHeight;
        this._blade.x = this.x + (cfg.bladeOffsetX * direction);
        this._blade.y = this.y + bladeOffsetY;
      }

      // Check boundary exit
      const exited = direction > 0 ? this.x >= exitX : this.x <= exitX;
      if (exited) {
        scene.events.off('update', updateHandler);
        if (this._blade?.active) this._blade.destroy();
        
        if (window.GameLogic && window.GameLogic._run?.plane === this) {
          window.GameLogic._run = null;
        }

        this.destroy();
        try { window.SfxManager?.stopAll?.(); } catch (e) { }
      }
    };

    this._updateHandler = updateHandler;
    scene.events.on('update', updateHandler);

    // Set up periodic bomb dropping cycle
    const { min, max } = cfg.bombDropDelayRangeSec;
    const spawnBombCycle = () => {
      if (!this.active) return;

      this.shoot(null, { bombType, cfg });

      const nextDelay = (min + Math.random() * Math.max(0, max - min)) * 1000;
      this._bombTimerEvent = scene.time.delayedCall(nextDelay, spawnBombCycle);
    };

    const initDelay = (min + Math.random() * Math.max(0, max - min)) * 1000;
    this._bombTimerEvent = scene.time.delayedCall(initDelay, spawnBombCycle);
  }

  shoot(target, options = {}) {
    const cfg = options.cfg || this.buildingConfig || window.ObjectConfig.internalTypes.plane;
    const bombTypeKey = options.bombType || cfg.bomb || 'bomb';
    
    const offsetRange = cfg.bombDropOffsetRatioRange;
    const planeHalfW = this.displayWidth * 0.5;
    const planeHalfH = this.displayHeight * 0.5;
    const offsetX = (offsetRange.min + Math.random() * Math.max(0, offsetRange.max - offsetRange.min)) * planeHalfW;

    const spawnX = this.x + offsetX;
    const spawnY = this.y + planeHalfH;

    const bomb = window.spawnBomb(this.scene, bombTypeKey, spawnX, spawnY, 90, null, this);
    if (bomb) {
      bomb.setPosition(bomb.x, this.y + planeHalfH + bomb.displayHeight * 0.5);
    }
  }

  preDestroy() {
    super.preDestroy();
    if (this._updateHandler && this.scene) {
      try { this.scene.events.off('update', this._updateHandler); } catch (e) {}
    }
    if (this._bombTimerEvent) {
      try { this._bombTimerEvent.destroy(); } catch (e) {}
      this._bombTimerEvent = null;
    }
    if (this._blade?.active) {
      try { this._blade.destroy(); } catch (e) {}
      this._blade = null;
    }
  }
}

window.Plane = Plane;

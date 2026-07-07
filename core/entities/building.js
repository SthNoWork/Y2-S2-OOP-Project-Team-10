// core/entities/building.js
// Building entity class. Handles placement, validation, and special capabilities like bouncing.

class Building extends DestructibleEntity {
  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);
    this.isBuilding = true;
    this.isDragging = false;
    this.spawnedFromInventory = false;
    this._dragOrigin = { x, y };
    this._ghostRemoved = false;
    this.buildingType = '';
    this.buildingConfig = null;
  }

  // Trampoline bounce logic
  bounce(bombBody) {
    if (!this.active || !bombBody || !bombBody.gameObject) return;

    const cfg = this.buildingConfig || {};
    const bounceForce = cfg.bounceForce ?? 28;
    const velocityCap = cfg.bounceVelocityCap ?? 30;

    // Get the angle of the trampoline surface
    const angle = this.body?.angle ?? this.angle ?? 0;

    // Normal vector pointing "upward" from the surface
    const nx = Math.sin(angle);
    const ny = -Math.cos(angle);

    const cv = bombBody.velocity;

    // Decompose current velocity into normal component
    const vn = cv.x * nx + cv.y * ny;

    // We only bounce if the bomb is moving towards the trampoline surface (vn < 0)
    if (vn >= 0) return;

    // Mirror incoming velocity across the normal vector
    const rx_mirror = cv.x - 2 * vn * nx;
    const ry_mirror = cv.y - 2 * vn * ny;

    const mirrorSpeed = Math.sqrt(rx_mirror * rx_mirror + ry_mirror * ry_mirror);

    let rx, ry;
    if (mirrorSpeed > 0.0001) {
      let outgoingSpeed = mirrorSpeed + bounceForce;
      outgoingSpeed = Math.min(outgoingSpeed, velocityCap);

      rx = (rx_mirror / mirrorSpeed) * outgoingSpeed;
      ry = (ry_mirror / mirrorSpeed) * outgoingSpeed;
    } else {
      let outgoingSpeed = Math.min(bounceForce, velocityCap);
      rx = nx * outgoingSpeed;
      ry = ny * outgoingSpeed;
    }

    // Apply bounce velocity
    Phaser.Physics.Matter.Matter.Body.setVelocity(bombBody, { x: rx, y: ry });

    // Handle 1v1 specific owner reflection and collision category toggle
    if (this.scene && (this.scene.player1 || this.scene.player2)) {
      if (this.x < 960) {
        // Player 1 side: make it P1's projectile!
        if (bombBody.gameObject) {
          bombBody.gameObject.owner = this.scene.player1;
          bombBody.collisionFilter.category = window.CollisionLayers.EXPLOSIVE_P1;
          bombBody.collisionFilter.mask = window.CollisionLayers.DEFAULT | window.CollisionLayers.PLAYER_1 | window.CollisionLayers.PLAYER_2 | window.CollisionLayers.STRUCTURE;
        }
      } else {
        // Player 2 side: make it P2's projectile!
        if (bombBody.gameObject) {
          bombBody.gameObject.owner = this.scene.player2;
          bombBody.collisionFilter.category = window.CollisionLayers.EXPLOSIVE_P2;
          bombBody.collisionFilter.mask = window.CollisionLayers.DEFAULT | window.CollisionLayers.PLAYER_1 | window.CollisionLayers.PLAYER_2 | window.CollisionLayers.STRUCTURE;
        }
      }
    } else {
      // Single player mode: take ownership
      if (window.GameLogic && window.GameLogic.player && bombBody.gameObject) {
        bombBody.gameObject.owner = window.GameLogic.player;
      }
    }

    // Play SFX
    window.SfxManager?.playBounce?.();

    // Play spring bounce animation
    try {
      if (typeof this.stop === 'function') this.stop();
      if (this.scene.anims?.exists('trampoline_spring')) {
        this.play('trampoline_spring');
      }
    } catch (e) {}

    // Reduce the impulse (linear and angular velocity) received by the trampoline by half
    if (this.body) {
      Phaser.Physics.Matter.Matter.Body.setVelocity(this.body, {
        x: this.body.velocity.x * 0.5,
        y: this.body.velocity.y * 0.5
      });
      Phaser.Physics.Matter.Matter.Body.setAngularVelocity(this.body, this.body.angularVelocity * 0.5);
    }
  }

  onDeath() {
    const cfg = this.buildingConfig || window.ObjectConfig.placeableTypes[this.objectType] || window.ObjectConfig.levelTypes[this.objectType] || {};
    const shouldExplode = cfg.onDeath === 'explode' && cfg.explosion;
    
    if (shouldExplode && window.EntityManager) {
      window.EntityManager.queueChainExplosion({
        cfg,
        x: this.x,
        y: this.y,
        sourceBomb: this
      });
    }

    // Unregister from building counts
    if (window.BuildingManager) {
      try {
        const type = this.buildingType;
        if (window.BuildingManager.buildingCounts[type] > 0) {
          window.BuildingManager.buildingCounts[type]--;
        }
      } catch (e) {}
    }

    super.onDeath();
  }
}

window.Building = Building;

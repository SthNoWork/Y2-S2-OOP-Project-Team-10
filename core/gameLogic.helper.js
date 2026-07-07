// core/gameLogic.helper.js
// Trajectory and pooling helper functions for bomb revamped logic.
// Kept separate to keep the main gameLogic.js file focused and readable.

window.ObjectFactory = window.ObjectFactory || {};
window.ObjectFactory._bombPool = window.ObjectFactory._bombPool || [];
window.ObjectFactory._poolCleanupRegistered = window.ObjectFactory._poolCleanupRegistered || new Set();

window.GameLogicHelper = {

  // Solves the ballistic launch angle to hit (dx, dy) under gravity g and speed v.
  // Coordinates are standard 2D with y-downwards and g-downwards (g > 0).
  solveBallistic(dx, dy, v, g, useHighArc = false) {
    if (Math.abs(g) < 0.001) {
      return Math.atan2(dy, dx);
    }
    const v2 = v * v;
    // Correct discriminant for y-down coordinates
    const discriminant = v2 * v2 - g * (g * dx * dx - 2 * dy * v2);
    if (discriminant < 0) {
      // Out of range, aim directly at target
      return Math.atan2(dy, dx);
    }
    const root = Math.sqrt(discriminant);
    // For Phaser, y is down. An upward arc requires a negative y-velocity.
    const vyTerm = useHighArc ? (v2 + root) : (v2 - root);
    return Math.atan2(-vyTerm, g * dx);
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
        if (window.EntityManager?.bombs) {
          window.EntityManager.bombs = window.EntityManager.bombs.filter(b => b !== this);
        }

        window.ObjectFactory._bombPool.push(this);
      };
    }
  },

  // Solves for launch speed and angle to hit target (dx, dy) under gravity g,
  // forcing a high-arc (at least minAngleDeg elevation).
  // Returns { speed, angleDeg } where angleDeg is screen-space degrees.
  solveHighArcSpeedAndAngle(dx, dy, g, minAngleDeg = 75) {
    const x_std = Math.abs(dx);
    const y_std = -dy; // Invert Y because Phaser Y is down, standard math Y is up

    const directAngle = Math.atan2(y_std, x_std);
    // At least minAngleDeg, but if target is higher, aim slightly above it
    const elevationAngle = Math.max(minAngleDeg * Math.PI / 180, directAngle + 5 * Math.PI / 180);

    const tanTheta = Math.tan(elevationAngle);
    const cosTheta = Math.cos(elevationAngle);
    const denominator = x_std * tanTheta - y_std;

    let speed = 200;
    if (denominator > 0) {
      speed = Math.sqrt((g * x_std * x_std) / (2 * cosTheta * cosTheta * denominator));
    }

    // Convert elevation angle to Phaser screen-space degrees
    let angleDeg;
    if (dx < 0) {
      angleDeg = -180 + Phaser.Math.RadToDeg(elevationAngle); // Aim left and up
    } else {
      angleDeg = -Phaser.Math.RadToDeg(elevationAngle); // Aim right and up
    }

    return { speed, angleDeg };
  },

  // Fires a bomb with a high-arc trajectory towards a target, applying randomization to angle and speed.
  // Consolidates duplicated physics/trajectory/spawning setup from pillboxManager.js and mortarManager.js.
  fireHighArcBomb(scene, {
    bombType,
    spawnX,
    spawnY,
    dx,
    dy,
    target,
    owner = {},
    spreadAngleDeg = 5,
    speedSpreadRatio = 0.15,
    minAngleDeg = 75,
    logPrefix = null
  }) {
    const bombCfg = window.ObjectConfig.internalTypes[bombType] || window.ObjectConfig.placeableTypes[bombType] || window.ObjectConfig.levelTypes[bombType] || window.ObjectConfig.internalTypes.bomb || window.ObjectConfig.internalTypes.smallBomb;
    
    // Resolve gravity
    const gravityObj = scene.matter?.world?.localWorld?.gravity || scene.matter?.world?.engine?.gravity;
    const worldGravity = (gravityObj && gravityObj.y !== undefined && gravityObj.scale !== undefined)
      ? (gravityObj.y * gravityObj.scale * 1000000)
      : 1000;
    const g = bombCfg?.gravity !== undefined ? bombCfg.gravity : worldGravity;

    // Calculate trajectory
    const { speed: solvedSpeed, angleDeg: solvedAngle } = this.solveHighArcSpeedAndAngle(dx, dy, g, minAngleDeg);
    let speed = solvedSpeed;
    let baseAngleDeg = solvedAngle;

    // Apply angle spread randomization
    if (spreadAngleDeg > 0) {
      const angleOffset = (Math.random() * 2 - 1) * spreadAngleDeg;
      baseAngleDeg += angleOffset;
    }

    // Apply speed randomization for range spattering
    if (speedSpreadRatio > 0) {
      const speedMultiplier = 1 + ((Math.random() * 2 - 1) * speedSpreadRatio);
      speed *= speedMultiplier;
    }

    // Spawn the bomb
    const bomb = window.spawnBomb(scene, bombType, spawnX, spawnY, baseAngleDeg, target, owner);
    if (bomb) {
      // Ensure owner reference is set
      bomb.owner = owner;

      if (bomb.body) {
        const vx = (speed / 60) * Math.cos(Phaser.Math.DegToRad(baseAngleDeg));
        const vy = (speed / 60) * Math.sin(Phaser.Math.DegToRad(baseAngleDeg));
        Phaser.Physics.Matter.Matter.Body.setVelocity(bomb.body, { x: vx, y: vy });
        bomb.body.frictionAir = 0;

        if (logPrefix) {
          console.log(`[${logPrefix}] ID: ${bomb.body.id} | Spawn: (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}) | Target at shoot: (${target.x.toFixed(1)}, ${target.y.toFixed(1)}) | Velocity: (${vx.toFixed(2)}, ${vy.toFixed(2)})`);
        }
      }
    }
    return bomb;
  },

  // Calculates a safe spawn position offset radially from the shooter's center towards the target,
  // preventing the spawned bomb from instantly colliding with the shooter's own physics body.
  getSafeSpawnPosition(shooter, target, scaleMultiplier = 0.8) {
    if (!shooter) return { x: 0, y: 0 };
    if (!target) return { x: shooter.x, y: shooter.y };

    const roughAngleRad = Math.atan2(target.y - shooter.y, target.x - shooter.x);
    const spawnDist = Math.max(shooter.displayWidth || 120, shooter.displayHeight || 80) * scaleMultiplier;
    
    // Always offset Y upwards (negative Y in Phaser) since mortars/pillboxes shoot high-arc bombs upwards.
    // This prevents bombs from spawning below/inside elevated platforms.
    return {
      x: shooter.x + Math.cos(roughAngleRad) * spawnDist,
      y: shooter.y - Math.abs(Math.sin(roughAngleRad)) * spawnDist
    };
  },

  // Checks the physics world, visual children, and arrays to detect if any active bomb exists in the scene.
  hasActiveBombs(scene) {
    if (window.EntityManager?.bombs && window.EntityManager.bombs.some(b => b && b.active)) return true;

    // 1. Check Matter.js physics bodies
    if (scene.matter?.world?.localWorld?.bodies) {
      const hasPhysicsBomb = scene.matter.world.localWorld.bodies.some(b => b && b.label === 'bomb');
      if (hasPhysicsBomb) return true;
    }

    // 2. Check scene visual children list
    if (scene.children?.list) {
      const hasVisualBomb = scene.children.list.some(child => {
        return child && child.active && (
          child.isBomb || 
          child.objectType === 'bomb' || 
          child.objectType === 'smallBomb' ||
          child.objectType === 'bomb1v1' ||
          child.objectType === 'clusterBomb1v1'
        );
      });
      if (hasVisualBomb) return true;
    }

    return false;
  },

  // Checks both placed (1v1) and level (campaign) objects to detect if any active shooting weapon still has remaining ammo.
  anyWeaponHasAmmo(scene) {
    if (!window.EntityManager) return false;

    return window.EntityManager.attackers.some(obj => {
      if (obj && obj.active) {
        return !obj.isOutOfAmmo;
      }
      return false;
    });
  },

  // Checks if a building's physics placement is valid (no collisions with other solid objects)
  isPlacementValid(scene, building) {
    if (!building?.body) return true;

    const Matter = Phaser.Physics.Matter.Matter;
    const allBodies = scene.matter.world.getAllBodies() || [];
    
    // Filter to targets that are solid/obstacles
    const targets = allBodies.filter(b => {
      // Skip the building's own body and compound parts
      if (b === building.body || b.parent === building.body) return false;
      
      const label = b.label || '';
      return label === 'building' || label === 'trampoline' || label === 'platform' || label === 'player';
    });

    // Matter.js geometry overlap check (supports rotated polygons/circles accurately)
    const collisions = Matter.Query.collides(building.body, targets);
    return collisions.length === 0;
  },

  // Searches for the closest valid placement position if overlapping
  findNearestValidPosition(scene, building, startX, startY) {
    const originalX = building.x;
    const originalY = building.y;
    
    const step = 8;
    const maxSearchDist = 160;
    const rings = Math.ceil(maxSearchDist / step);
    const baseAngle = building.rotation; // Current angle in radians
    
    // Prioritized direction offsets relative to the building's current angle
    const relAngles = [
      -Math.PI / 2, // 1st priority: perpendicular up (out of collision)
      Math.PI / 2,  // 2nd priority: perpendicular down
      0,            // 3rd priority: right along face
      Math.PI,      // 4th priority: left along face
    ];
    
    // Add other diagonal/intermediate angles to cover a full circle
    for (let j = 1; j < 8; j++) {
      const ang = (j / 8) * Math.PI * 2;
      // Filter out duplicate cardinal directions
      if (Math.abs(ang - Math.PI / 2) > 0.01 && 
          Math.abs(ang - Math.PI * 1.5) > 0.01 && 
          Math.abs(ang - Math.PI) > 0.01 && 
          Math.abs(ang) > 0.01) {
        relAngles.push(ang);
      }
    }
    
    for (let r = 1; r <= rings; r++) {
      const distance = r * step;
      
      for (const relAng of relAngles) {
        const testAngle = baseAngle + relAng;
        const testX = startX + Math.cos(testAngle) * distance;
        const testY = startY + Math.sin(testAngle) * distance;
        
        if (building.body) {
          Phaser.Physics.Matter.Matter.Body.setPosition(building.body, { x: testX, y: testY });
        }
        building.x = testX;
        building.y = testY;
        
        if (this.isPlacementValid(scene, building)) {
          return { x: testX, y: testY };
        }
      }
    }
    
    // Revert position if none found
    if (building.body) {
      Phaser.Physics.Matter.Matter.Body.setPosition(building.body, { x: originalX, y: originalY });
    }
    building.x = originalX;
    building.y = originalY;
    return null;
  }

};

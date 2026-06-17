// factories/objectFactory.helpers.js
// Pure helper functions used by objectFactory.js.
// Kept separate so the main factory file stays focused on object creation.


// ── Size calculation ──────────────────────────────────────────────────────────

// Returns { bodyW, bodyH, scaleX, scaleY, radius? } for a given config,
// or null if the texture / frame is missing.
function _computeSize(scene, cfg) {
  const scale = cfg.scale ?? 1;

  if (cfg.collisionSize) {
    const w = cfg.collisionSize.width !== undefined ? cfg.collisionSize.width : cfg.collisionSize[0];
    const h = cfg.collisionSize.height !== undefined ? cfg.collisionSize.height : cfg.collisionSize[1];
    if (cfg.physics?.shape?.type === 'circle') {
      const radius = Math.max(2, Math.round(Math.min(w, h) / 2));
      return { bodyW: radius * 2, bodyH: radius * 2, scaleX: scale, scaleY: scale, radius };
    }
    return { bodyW: w, bodyH: h, scaleX: scale, scaleY: scale };
  }

  if (!scene.textures.exists(cfg.imageKey)) {
    console.error(`[ObjectFactory._computeSize] texture "${cfg.imageKey}" not loaded`);
    return null;
  }

  const frame = cfg.startFrame
    ? scene.textures.getFrame(cfg.imageKey, cfg.startFrame)
    : scene.textures.getFrame(cfg.imageKey);

  if (!frame) {
    console.error(`[ObjectFactory._computeSize] frame "${cfg.startFrame ?? '(base)'}" not found in "${cfg.imageKey}"`);
    return null;
  }

  const texW = frame.realWidth || frame.width;
  const texH = frame.realHeight || frame.height;

  if (!texW || !texH) {
    console.error(`[ObjectFactory._computeSize] frame has zero dimensions`);
    return null;
  }

  if (cfg.physics?.shape?.type === 'circle') {
    return _computeCircleSize(texW, texH, scale, cfg.physics.shape);
  }

  return { bodyW: texW * scale, bodyH: texH * scale, scaleX: scale, scaleY: scale };
}

function _computeCircleSize(texW, texH, scale, shape) {
  const radiusRatio = shape.radiusRatio ?? 1;
  const radius = Math.max(2, Math.round((Math.min(texW, texH) / 2) * scale * radiusRatio));
  return { bodyW: radius * 2, bodyH: radius * 2, scaleX: scale, scaleY: scale, radius };
}


// ── Visual creation ───────────────────────────────────────────────────────────

const _graphicsDrawers = {
  // ── Pillbox: sturdy trapezoidal bunker ──────────────────────────────────
  pillbox(scene, x, y, bodyW, bodyH, cfg) {
    const texKey = '__pillbox_tex';

    if (!scene.textures.exists(texKey)) {
      const g = scene.add.graphics();
      const w = bodyW;
      const h = bodyH;

      // Base bunker
      g.fillStyle(0x3a3a3a, 1);
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(w, h);
      g.lineTo(w * 0.8, h * 0.4);
      g.lineTo(w * 0.2, h * 0.4);
      g.closePath();
      g.fillPath();

      // Gun turret block
      g.fillStyle(0x111111, 1);
      g.fillRect(w * 0.3, 0, w * 0.4, h * 0.5);

      // Gun barrel
      g.fillStyle(0x222222, 1);
      g.fillRect(w * 0.45, -h * 0.2, w * 0.1, h * 0.3);

      g.generateTexture(texKey, Math.ceil(w), Math.ceil(h));
      g.destroy();
    }

    const obj = scene.add.sprite(x, y, texKey);
    obj._factoryScaled = true;
    return obj;
  },

  // ── Pillbox: static bunker ────────────────────────────────────────────────
  pillbox: (scene, x, y, bodyW, bodyH, cfg) => {
    const texKey = '__pillbox_tex';

    if (!scene.textures.exists(texKey)) {
      const g = scene.add.graphics();
      const w = bodyW;
      const h = bodyH;

      // Base bunker
      g.fillStyle(0x333333, 1);
      g.fillRoundedRect(0, 0, w, h, 8);

      // Gun slot
      g.fillStyle(0x111111, 1);
      g.fillRect(w * 0.2, h * 0.3, w * 0.6, h * 0.2);

      // Detail
      g.lineStyle(2, 0x111111, 1);
      g.strokeRoundedRect(0, 0, w, h, 8);

      g.generateTexture(texKey, Math.ceil(w), Math.ceil(h));
      g.destroy();
    }

    const obj = scene.add.sprite(x, y, texKey);
    obj._factoryScaled = true;
    return obj;
  },

  // ── Mortar: tall dark battery with launch tubes ─────────────────────────
  mortar: (scene, x, y, bodyW, bodyH, cfg) => {
    const texKey = '__mortar_tex';

    if (!scene.textures.exists(texKey)) {
      const g = scene.add.graphics();
      const w = bodyW;
      const h = bodyH;

      // Base body — dark grey tall rectangle
      g.fillStyle(0x404040, 1);
      g.fillRect(0, 0, w, h);

      // Add a sturdy base
      g.fillStyle(0x202020, 1);
      g.fillRect(-w * 0.1, h * 0.9, w * 1.2, h * 0.1);

      // Draw 3 vertical launch tubes
      g.fillStyle(0x111111, 1);
      const tubeW = w * 0.2;
      const tubeH = h * 0.6;
      g.fillRect(w * 0.15, h * 0.1, tubeW, tubeH);
      g.fillRect(w * 0.40, h * 0.1, tubeW, tubeH);
      g.fillRect(w * 0.65, h * 0.1, tubeW, tubeH);

      // Warning stripes on the front
      g.fillStyle(0xdba614, 1);
      for (let i = 0; i < 3; i++) {
        g.fillRect(w * 0.1, h * 0.75 + i * h * 0.05, w * 0.8, h * 0.02);
      }

      g.generateTexture(texKey, Math.ceil(w), Math.ceil(h));
      g.destroy();
    }

    const obj = scene.add.sprite(x, y, texKey);
    obj._factoryScaled = true;
    return obj;
  },
};

function _buildVisual(scene, cfg, x, y, bodyW, bodyH, scaleX, scaleY) {
  if (cfg.useGraphics && cfg.graphicsType && _graphicsDrawers[cfg.graphicsType]) {
    const obj = _graphicsDrawers[cfg.graphicsType](scene, x, y, bodyW, bodyH, cfg);
    obj.setScale(scaleX, scaleY);
    return obj;
  }

  const obj = scene.add.sprite(x, y, cfg.imageKey, cfg.startFrame);

  if (cfg.animKey && scene.anims?.exists?.(cfg.animKey)) obj.play(cfg.animKey);

  obj.setScale(scaleX, scaleY);
  obj._factoryScaled = true;
  return obj;
}


// ── Physics attachment ────────────────────────────────────────────────────────

function _addPhysics(scene, obj, cfg, bodyW, bodyH, dims) {
  const p = cfg.physics;
  const shape = _buildPhysicsShape(p, bodyW, bodyH, dims);

  const frictionMult = window.ObjectConfig.globalFrictionMultiplier ?? 3.0;
  const staticFrictionMult = window.ObjectConfig.globalStaticFrictionMultiplier ?? 3.0;

  const scaledFriction = p.friction !== undefined ? p.friction * frictionMult : undefined;
  const scaledFrictionStatic = p.frictionStatic !== undefined 
    ? p.frictionStatic * staticFrictionMult 
    : (p.friction !== undefined ? p.friction * staticFrictionMult * 1.25 : undefined);

  scene.matter.add.gameObject(obj, {
    friction: scaledFriction,
    frictionStatic: scaledFrictionStatic,
    restitution: p.restitution,
    frictionAir: p.frictionAir,
    label: p.label || 'object',
    shape,
    isSensor: !!p.isSensor,
  });

  if (obj.body) {
    _applyMass(obj.body, p.mass);
    _applyCollisionFilter(obj.body, p.collisionFilter);
    if (p.isStatic) obj.setStatic(true);
    if (p.ignoreGravity) obj.setIgnoreGravity(true);
    if (p.isSensor) obj.setSensor(true);
  }
}

function _buildPhysicsShape(p, bodyW, bodyH, dims) {
  if (p?.shape?.type === 'circle') {
    const radius = dims?.radius ?? Math.max(2, Math.round(Math.min(bodyW, bodyH) * 0.5));
    return { type: 'circle', radius };
  }
  return { type: 'rectangle', width: Math.ceil(bodyW), height: Math.ceil(bodyH) };
}

function _applyMass(body, mass) {
  if (mass === undefined) return;
  try { Phaser.Physics.Matter.Matter.Body.setMass(body, mass); } catch (e) { }
}

function _applyCollisionFilter(body, filter) {
  if (!filter || !body.collisionFilter) return;
  body.collisionFilter.category = filter.category;
  body.collisionFilter.mask = filter.mask;
}


// ── Health system ─────────────────────────────────────────────────────────────

// Attaches health, maxHealth, and a takeDamage method to obj.
function _addHealth(obj, cfg) {
  obj.health = cfg.health;
  obj.maxHealth = cfg.health;

  obj.takeDamage = function (amount) {
    if (!this.active) return false;
    // Negative health means indestructible — ignore all damage.
    if (this.maxHealth < 0) return false;
    this.health -= amount;
    _updateHpLabelOnDamage(this);
    return this.health <= 0;
  }.bind(obj);
}

// Updates the floating HP label after damage, or destroys it when health hits zero.
function _updateHpLabelOnDamage(obj) {
  if (!obj._hpLabel?.active) return;

  if (obj.health > 0) {
    obj._hpLabel.setText(`HP:${Math.max(0, Math.round(obj.health))}`);
    obj._hpLabel.x = obj.x;
    obj._hpLabel.y = obj.y - (obj.displayHeight ?? 0) * 0.5;
  } else {
    obj._hpLabel.destroy();
    obj._hpLabel = null;
  }
}


// ── Debug HP labels ───────────────────────────────────────────────────────────

// Creates or updates the floating HP label above obj (debug mode only).
function _updateHpLabel(obj) {
  if (!obj?.active) return;

  if (!window.DEBUG) {
    if (obj._hpLabel?.active) { obj._hpLabel.destroy(); obj._hpLabel = null; }
    return;
  }

  if (!obj._hpLabel?.active) {
    _createHpLabel(obj);
  }

  obj._hpLabel.x = obj.x;
  obj._hpLabel.y = obj.y - (obj.displayHeight ?? 0) * 0.5;
  obj._hpLabel.setText(`HP:${Math.max(0, Math.round(obj.health))}`);
}

function _createHpLabel(obj) {
  if (!obj.scene) return;

  const label = obj.scene.add.text(obj.x, obj.y, `HP:${Math.max(0, Math.round(obj.health))}`, {
    fontSize: '18px',
    fill: '#ffffff',
    backgroundColor: '#000000',
    padding: { x: 3, y: 2 },
  });

  label.setOrigin(0.5, 1);
  label.setDepth(3000);
  obj._hpLabel = label;
}
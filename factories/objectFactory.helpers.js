// factories/objectFactory.helpers.js
// Pure helper functions used by objectFactory.js.
// Kept separate so the main factory file stays focused on object creation.


// ── Size calculation ──────────────────────────────────────────────────────────

// Returns { bodyW, bodyH, scaleX, scaleY, radius? } for a given config,
// or null if the texture / frame is missing.
function _computeSize(scene, cfg) {
  const scale = cfg.scale ?? 1;

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

function _buildVisual(scene, cfg, x, y, bodyW, bodyH, scaleX, scaleY) {
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

  scene.matter.add.gameObject(obj, {
    friction: p.friction,
    restitution: p.restitution,
    frictionAir: p.frictionAir,
    label: p.label || 'object',
    shape,
  });

  if (obj.body) {
    _applyMass(obj.body, p.mass);
    _applyCollisionFilter(obj.body, p.collisionFilter);
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
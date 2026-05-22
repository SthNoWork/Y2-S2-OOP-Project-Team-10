window.UIFactory = {};

window.UIFactory.createButton = function (scene, x, y, label, onClick) {
  return scene.add
    .text(x, y, label, {
      fontSize:        '43px',
      fill:            '#ffffff',
      backgroundColor: '#333333',
      padding:         { x: 38, y: 16 },
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(1000)
    .on('pointerdown', onClick);
};

window.UIFactory.addBackButton = function (scene, onClick) {
  return scene.add
    .text(38, 22, 'Back', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '43px',
      color:      '#000000',
    })
    .setInteractive()
    .setOrigin(0, 0)
    .setDepth(1000)
    .on('pointerdown', onClick);
};

window.UIFactory.addHealthText = function (scene, arena) {
  return scene.add.text(
    arena.ARENA_X + 19,
    arena.ARENA_Y + 11,
    '',
    { fontSize: '32px', fill: '#ffffff' }
  );
};

window.UIFactory.addBackground = function (scene, path) {
  if (!path) return null;

  const key = `bg_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
  if (!scene.textures.exists(key)) {
    window.logDebug?.(`[UIFactory.addBackground] Missing texture: ${key}`);
    return null;
  }

  const img = scene.add.image(960, 540, key).setOrigin(0.5, 0.5);

  const src   = scene.textures.get(key)?.getSourceImage?.();
  const texW  = src?.width  || 1;
  const texH  = src?.height || 1;
  const scale = Math.max(1920 / texW, 1080 / texH);

  img.setScale(scale);
  img.setDepth(-1000);
  img.setScrollFactor(0);
  return img;
};
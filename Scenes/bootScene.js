class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  // ========================================
  // PRELOAD
  // ========================================
  // Load all shared assets here so every scene can use them.

  preload() {
    // Load the Metal Slug items spritesheet as a texture atlas.
    // The bomb_crate frame sits at x=16, y=30, 32×28 px in the sheet.
    this.load.image('metal_slug_items', 'assets/metal_slug_items.png');
  }

  // ========================================
  // CREATE
  // ========================================

  create() {
    // Carve the bomb_crate frame out of the full spritesheet texture
    // so objectFactory can reference it by key 'bomb_crate'.
    const tex = this.textures.get('metal_slug_items');
    tex.add('bomb_crate_frame', 0, 16, 30, 32, 28);

    // Build a standalone 'bomb_crate' texture from that frame so
    // scene.textures.exists('bomb_crate') returns true everywhere.
    const src = this.textures.get('metal_slug_items').getSourceImage();
    const rt  = this.textures.createCanvas('bomb_crate', 32, 28);
    rt.context.drawImage(src, 16, 30, 32, 28, 0, 0, 32, 28);
    rt.refresh();

    // BootScene intentionally waits — index.html calls startScene() externally.
  }
}
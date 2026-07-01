// scenes/baseScene.js
// Common base scene class implementing polymorphic clear and reload mechanisms.
// All game scenes should extend BaseScene instead of Phaser.Scene.

class BaseScene extends Phaser.Scene {
  constructor(config) {
    super(config);
  }

  // Clear scene-specific states, managers, custom event listeners, and timers.
  // Overridden by subclasses.
  clear() {
    // Default empty implementation
  }

  // Reload the scene by completely removing it and adding it back from its constructor.
  // Execution is deferred via setTimeout to prevent crashes when triggered inside physics steps or collision events.
  reload() {
    const key = this.sys.settings.key;
    setTimeout(() => {
      console.log(`[BaseScene] Reloading scene: ${key}`);
      
      // Perform subclass-specific cleanup
      try {
        this.clear();
      } catch (e) {
        console.error(`[BaseScene] Error during clear() for scene ${key}:`, e);
      }

      const game = this.sys.game;
      const sceneClass = this.constructor;
      if (game && sceneClass) {
        try {
          game.scene.remove(key);
          game.scene.add(key, sceneClass, true);
        } catch (e) {
          console.error(`[BaseScene] Error recreating scene ${key}:`, e);
        }
      }
    }, 0);
  }
}

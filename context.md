# Project Context: Y2-S2-OOP-Project-Team-10

## Overview
This is a web-based HTML5 game built using the **Phaser 3** framework and **Firebase** for backend data (authentication, leaderboard, saves). The game appears to be a base-defense or strategy game featuring buildings, mortars, pillboxes, power-ups, and level clusters.

The UI is a mix of traditional HTML/CSS (for the home screen, profile panel, menus) and a Phaser canvas injected into a container for the actual game rendering.

## Directory Structure & Architecture

### `/config/`
Contains configuration files for the game's data.
- `assets.config.js`: Defines paths to image, audio, and other asset files.
- `game.config.js`: The main Phaser game configuration object (physics, scale, scenes).
- `levels.config.js`: Level layout and wave configurations.
- `objects.config.js`: Data for entities like buildings, enemies, and towers.

### `/core/`
The core business logic and manager classes of the game.
- `gameLogic.js` & `gameLogic.helper.js`: Central game loop, state, and rules.
- `levelManager.js`: Handles level progression, loading level configs.
- `buildingManager.js`, `mortarManager.js`, `pillboxManager.js`: Manages specific defensive or functional structures.
- `clusterManager.js`: Handles grouping of entities or map clusters.
- `powerUpManager.js`: Logic for player buffs/abilities.
- `sfxManager.js`: Audio playback and sound effects management.

### `/factories/`
Design pattern implementation for creating game objects consistently.
- `spriteFactory.js`: Spawns visual sprites.
- `hudFactory.js`: Creates Heads-Up Display elements.
- `uiFactory.js`: Creates user interface components within Phaser.
- `objectFactory.js` & `objectFactory.helpers.js`: Centralized object creation (enemies, towers, etc.).

### `/scenes/`
Phaser scenes representing different states of the game.
- `bootScene.js`: Preloads initial assets and shows loading progress.
- `gameScene.js`: The main gameplay scene.
- `levelSelectScene.js`: UI for choosing levels.
- `leaderboardScene.js`: Displays top scores using Firebase.
- `profileScene.js`: User profile management.
- `settingsScene.js`: Audio and game settings.
- `shopsScene.js`: In-game shop or upgrades.

### `/firebase/`
Integration with Google Firebase.
- `init.js`: Firebase initialization and auth setup.
- `gameData.js`: Functions to load/save user progress to Firestore/Realtime DB.

### `/lib/`
External libraries.
- `phaser.min.js` / `phaser.js`: The game engine.

### Root Files
- `index.html`: The main entry point. Sets up the 16:9 responsive shell, HTML UI overlays (Home Screen, Loading), initializes Firebase, handles DOM events, and instantiates the Phaser Game.
- `debug.js`: Utility for debug flags and logging.

## Execution Flow
1. **`index.html`** loads all scripts synchronously.
2. The HTML Home Screen is shown to the user.
3. User clicks "Play" -> triggers `window.startScene('LevelSelectScene')`.
4. The HTML UI hides, and the **Phaser Game** instance is created using `config/game.config.js`.
5. The game moves through its scenes (Boot -> LevelSelect -> GameScene).
6. State and user data are persisted via `/firebase/` scripts.

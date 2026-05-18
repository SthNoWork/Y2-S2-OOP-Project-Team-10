# AI Context (Repo Overview)

This file is for AI assistants to get a quick, accurate picture of the codebase.
Update this file whenever you change behavior, config, or structure.

## High-Level Summary
- Phaser v4 project using Matter physics.
- index.html owns app shell and scene switching (destroys and recreates Phaser.Game each time).
- BootScene preloads assets via SpriteFactory and builds atlases/animations from config.
- GameScene orchestrates managers; GameLogic handles gameplay; LevelManager handles level flow.

## Runtime Flow (Happy Path)
1) index.html -> startScene(sceneKey)
2) new Phaser.Game(config) (Game.js)
3) BootScene runs, prepares textures, then starts sceneKey
4) GameScene.create() -> arena setup, LevelManager.load(), BuildingManager.init(), UIFactory buttons
5) GameScene.update() -> GameLogic.update() + LevelManager.update()

## Phaser + Physics Notes
- Phaser version: v4.x
- Matter physics enabled in Game.js (default: matter).
- fromTexture shape is NOT supported in Phaser v4 (crashes in MatterSprite). Use rectangle bodies.
- Bomb crate texture is trimmed to reduce rectangle hitbox size.
- window.DEBUG + window.logDebug enable gated debug logging.

## Assets and Atlases
- assets.js holds all asset keys/paths and animation definitions.
- spriteFactory.js loads assets and builds atlases/animations from assets.js config.

## Data Schemas (Fields Used)

### TRIM_CONFIGS (BootScene)
- key: output texture key
- sx, sy: source X/Y in the sprite sheet
- sw, sh: source width/height
- alphaThreshold: alpha cutoff for trimming (default 1)

### Levels (levels.js)
- playerSpawn: { xRatio, yRatio }
- platforms: [{ xRatio, yRatio, wRatio, hRatio }]
- prePlaced: [{ type, xRatio, yRatio }]
- allowedBuildings: { [type]: maxCount }
- waves: [{ speedPxPerSec, direction, xRatio, yRatio }]
  - speedPxPerSec is treated as a 1920px-wide baseline and scaled to current arena width

### ScoreConfig (global)
- playerHpWeight
- buildingWeight
- placementPenalty
- runMultiplierStep

### ObjectConfig.placeableTypes (ObjectFactory)
- widthRatio, heightRatio
- color (fallback render)
- physics: { friction, restitution, frictionAir, label, mass, collisionFilter? }
- health, onDeath, maxCount

### ObjectConfig.levelTypes (ObjectFactory)
- widthRatio, heightRatio
- useImage, imageKey, color
- physics: { friction, restitution, frictionAir, label, mass, collisionFilter? }
- health, onDeath
- blast: { radiusRatio, forceRatio, maxDamage } (only if onDeath = explode)

### ObjectConfig.internalTypes (ObjectFactory)
- bomb: widthRatio, heightRatio, color, physics { friction, restitution, frictionAir, label, collisionFilter }, blastRadiusRatio, blastForceRatio, directHitDamage, blastMaxDamage
- plane: widthRatio, heightRatio, color, bombDropDelayRangeSec { min, max }, bombDropOffsetRatioRange { min, max }, bombDropYOffsetRatio
- player: widthRatio, heightRatio, color, physics { friction, restitution, frictionAir, label, mass }, health, onDeath

### UIFactory.config
- button: { fontSizeRatio, fill, backgroundColor, paddingXRatio, paddingYRatio }
- backButton: { fontSizeRatio, color }
- healthText: { fontSizeRatio, fill }
### UIFactory scaling
- UI sizing uses `window.Scale.screenScaleW/screenScaleH` with a 1920x1080 baseline.
### Physics scaling
- `window.Scale.arenaScaleW/arenaScaleH` convert 1920x1080 baseline values to arena pixels.

## Global Objects
- window.ObjectConfig: definitions for placeableTypes, levelTypes, internalTypes.
- window.ObjectFactory: creates game objects (placeable, level, internal).
- window.BuildingManager: drag-drop placement and inventory UI.
- window.GameLogic: bomb runs, collisions, blast damage, game over.
- window.LevelManager: level loading, HUD, waves, score flow.
- window.UIFactory: UI helpers (buttons, back button, health text).
- window.Levels: level data in levels.js.
- window.Scale: single scaling helper for UI and arena-based physics values.
- window.Assets: asset + animation config registry.
- window.SpriteFactory: preload/build helper for assets, atlases, animations.

## ObjectFactory Highlights
- objectConfig.js holds placeableTypes, levelTypes, internalTypes.
- objectFactory.js builds objects from ObjectConfig.
- Use createPlaceable/createLevelObject/createInternal; legacy aliases removed.
- Physics bodies are rectangles sized to arena ratios; image objects use display size.
- fromTexture is disabled; rectangle is used instead.
- Body size computation is cached per arena size.

## LevelManager Highlights
- load() reads window.Levels, spawns platforms and prePlaced objects.
- startWave() -> GameLogic.startBombingRun().
- Tracks score and shows overlays for continue/stop and game over.
- Building score uses overall HP percentage (current/maximum).

## GameLogic Highlights
- Handles bombing runs and bomb drops.
- Collision detection uses Matter collisionstart events.
- Blast radius applies knockback and damage to player and buildings.
- Blast radius/force scale with arena size; wave speeds scale to arena width.

## BuildingManager Highlights
- Handles pointer drag/drop of placeable buildings.
- Ghost mode disables collisions while dragging.
- Validates placement with matter.intersectRect().
- _finaliseDrop() only resets drag state and velocities.
- Drag hit-testing only checks placed buildings; uses cached bounds and a small move threshold.

## UI and Scenes
- index.html contains home screen and profile UI; buttons call window.startScene().
- GameScene is the main gameplay scene.
- LevelSelectScene renders level buttons; only levels with waves exist are clickable.
- SettingsScene, SavesScene, ProfileScene are placeholders with Back button only.

## SpriteDefinitions + AssetLoader
- Removed (unused modules were not loaded by index.html).

## Files Not to Edit
- phaser.js and phaser.min.js are vendor libraries.

## Known Constraints
- Phaser v4 does not support Matter fromTexture hulls; use rectangles or custom polygons.
- Trimming logic is in BootScene; update TRIM_CONFIGS to add new trimmed textures.

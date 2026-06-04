current directory
├── asset
│   ├── background
│   │   ├── background1.jpg
│   │   ├── background2.jpg
│   │   ├── background3.jpg
│   │   ├── background5.jpg
│   │   ├── background.jpg
│   │   ├── menu-theme.png
│   │   └── theme.png
│   ├── block
│   │   ├── block.json
│   │   └── block.png
│   ├── character
│   │   ├── result.png
│   │   ├── Skin2.png
│   │   └── Skin3.png
│   ├── explosion
│   │   ├── explosion.json
│   │   └── explosion.png
│   ├── item
│   │   ├── item.json
│   │   └── item.png
│   ├── music
│   │   ├── Forest Drift (1).mp3
│   │   ├── Forest Drift.mp3
│   │   └── Shield the Sky.mp3
│   ├── plane
│   │   ├── plane.json
│   │   └── plane.png
│   └── soundeffect
│       ├── mixkit-arcade-game-explosion-2759.wav
│       ├── mixkit-casino-bling-achievement-2067.wav
│       ├── mixkit-dense-bomb-impact-2801.wav
│       ├── mixkit-game-level-completed-2059.wav
│       ├── mixkit-player-losing-or-failing-2042.wav
│       └── soundreality-game-explosion-321700.mp3
├── config
│   ├── assets.config.js
│   ├── game.config.js
│   ├── levels.config.js
│   └── objects.config.js
├── core
│   ├── buildingManager.js
│   ├── gameLogic.js
│   ├── levelManager.js
│   ├── powerUpManager.js
│   └── sfxManager.js
├── debug.js
├── factories
│   ├── hudFactory.js
│   ├── objectFactory.helpers.js
│   ├── objectFactory.js
│   ├── spriteFactory.js
│   └── uiFactory.js
├── firebase
│   ├── auth.js
│   ├── config.js
│   ├── firestore.js
│   ├── gameData.js
│   ├── init.js
│   └── leaderboard.js
├── index.html
├── lib
│   └── phaser.js
├── phaser.min.js
├── promt.md
└── scenes
    ├── bootScene.js
    ├── gameScene.js
    ├── leaderboardScene.js
    ├── levelSelectScene.js
    ├── profileScene.js
    ├── settingsScene.js
    └── shopsScene.js

Node: it is phaser.js v4 not v3
can read in the lib/


job:
revamp bomb spawning logic in gameLogic.js


function spawnBomb(scene, bombtype from the objects internal types config, spawnx, spawny, direction(in degrees))

modify the configuration in objects config internal type for plane, and will have a new filed which is called bomb: ...
it will reference to object config internal type for bomb then the new function spawnBomb can use it

bomb death from plane isnt dependant on the plane. they both will be indivitual objects that dies on its own

currently the code hard coded the bomb linking to the plane

-----

What to add for the AI to work better (added below into this file):

1) Config sample
- Add a concrete example of the `objects.config` internal types for `plane` and `bomb` so the AI can safely modify configuration. Include the keys used by factories and the field names exactly as in code.

2) Code callsites
- List files and function names where bombs are currently created or tightly linked to planes (for example: `core/gameLogic.js`, any plane-specific factory or plane update loop where bomb creation occurs). Include path and short code snippet or function name for each callsite.

3) API signature
- Define the exact `spawnBomb` signature and types to implement: for example
- `spawnBomb(scene, bombTypeKey, spawnX, spawnY, directionDeg)` — `directionDeg` measured in degrees.

4) Bomb properties (per-type defaults)
- For each bomb internal type, specify defaults the AI should use when creating bombs:
    - `spriteKey` (string)
    - `speed` (number, pixels/sec)
    - `gravity` (number)
    - `lifetime` (ms)
    - `angularVelocity` (deg/sec)
    - `damage` (number)
    - `collisionSize` (width,height)
    - `explodeOnImpact` (boolean)
    - `poolable` (boolean)

5) Ownership & lifecycle
- State that bombs are independent objects: they manage their own lifetime, collisions, and death/explosion. Describe how death should be emitted (Phaser events, callbacks, or direct function calls). Example: emit `scene.events.emit('bomb:explode', bomb)` on explosion.

6) Spawn rules
- Specify spawn triggers and limits: e.g., spawn interval (fixed or random), spawn offset relative to plane, maximum active bombs, and whether bomb spawns should use pooling.

7) Physics & collision system
- Declare which physics system is used (Arcade, Matter, or custom). List collision groups or target layers (player, terrain, buildings). Specify expected collision responses (destroy, bounce, explode).

8) Assets & animations
- Provide texture keys, atlas/frame names, and the explosion animation key(s) used by bombs so AI can wire animations and particle/sfx.

9) Backward-compatibility / migration notes
- Document current hard-coded linkage (where plane creates and owns bomb). Provide a suggested migration plan: add `plane.bomb` config field referencing a bomb internal type, implement global `spawnBomb`, and add a temporary wrapper `plane.spawnBomb()` that calls `spawnBomb` so existing code keeps working.

10) Acceptance criteria / manual tests
- Short checklist the AI should use to validate behavior after changes:
    - Bomb spawns at intended position and direction.
    - Bomb has independent physics and lifetime (plane death doesn't remove bombs).
    - Bomb explodes on impact or after lifetime and emits `bomb:explode` event.
    - No new console errors; performance is stable with pooling.

Implementation suggestions (concise)
- Add `bomb` field to plane internal type in `config/objects.config.js` referencing a bomb internal type.
- Implement `spawnBomb(scene, bombTypeKey, x, y, directionDeg)` in `core/gameLogic.js` (or a new `bombManager.js`) that:
    - Looks up bomb config by `bombTypeKey`.
    - Uses the object/sprite factory to create or reuse a bomb instance.
    - Configures physics, velocity (derived from `directionDeg` and `speed`), gravity, and angular velocity.
    - Starts a lifetime timer to call explosion if not collided first.
    - Adds its own collision handler that calls `explode()` and emits `scene.events.emit('bomb:explode', bomb)`.
    - Returns the bomb object for callers that want a reference.

Pooling and events
- Prefer reusing bomb sprites via a simple pool inside `objectFactory` or `spawnBomb`. Use `poolable` property in config to decide.
- Emit `bomb:spawn`, `bomb:explode`, and `bomb:destroy` via `scene.events` for SFX/HUD decoupling.

Example config snippet to add to `config/objects.config.js` (paste-friendly):

{
    "plane": {
        "internalType": "plane",
        "spriteKey": "plane",
        "bomb": "smallBomb"
    },

        "smallBomb": {
        "internalType": "smallBomb",
        "spriteKey": "bomb",
        "speed": 200,
        "gravity": 300,
        "lifetime": 5000,
        "damage": 25,
        "scale": 1.0,
        "shape": "circle",
        "explodeOnImpact": true,
        "poolable": true,
        "explosion": {
            "key": "explosion",
            "damage": 50,
            "scale": 1.5,
            "areaShape": "circle"
        }
    }
}

Migration helper (temporary wrapper):

// in plane code during migration
function planeSpawnBomb(scene, x, y, dir) {
    return spawnBomb(scene, planeConfig.bomb, x, y, dir);
}

Notes for the developer/AI:
- Attach exact snippets or file paths where plane-created bombs currently exist so the AI can update them. Include the physics system in use (likely Arcade given Phaser) and any existing factory APIs.

Acceptance manual checks to add to prompt for verification:
- Spawn 1: plane spawns a bomb; bomb falls with gravity and explodes after `lifetime`.
- Plane death: destroy plane while bomb active; bomb remains and explodes independently.
- Collision: bomb collides with building/player and explodes, emitting `bomb:explode`.

-----

Add these sections to this file so the AI has everything it needs to implement `spawnBomb` and safely refactor plane→bomb coupling.

Compatibility: `shootingType` (concise)
- For future compatibility, internal types may include a `shootingType` field (string) describing a specialized aiming/throw behavior, e.g. `"player"`.
- Behavior rules:
    - If an object's internal type has `shootingType: "player"`, the spawner should compute an aim (using ballistic solver or predictive heuristic) toward the player and apply configured `inaccuracy` from the config when calling `spawnBomb`.
    - If `shootingType` is absent, `spawnBomb` should fallback to the simple drop behavior (current plane behavior): spawn the bomb at `(x,y)` and let physics handle it.
    - Config for `shootingType` users should include `inaccuracy` (e.g. `angleDeg`, `speedPct`) and optionally a `preferredSpeed` or `preferredAngle` to guide the solver.

Example config fragment for a tower thrower:

{
    "tower": { "internalType":"tower", "spriteKey":"tower", "bomb":"smallBomb", "shootingType":"player" },
    "smallBomb": { "internalType":"smallBomb", "spriteKey":"bomb", "speed":220, "gravity":300, "lifetime":5000, "damage":25, "shape":"circle", "poolable":true, "inaccuracy": { "angleDeg":6, "speedPct":0.08 } }
}

Notes:
- `spawnBomb` should accept optional `target` or `aim` parameters; if a `target` is provided and the bomb type (or thrower) uses `shootingType`, compute a launch vector toward the `target` with `inaccuracy` applied.
- Keep the drop fallback simple and backward-compatible so existing plane code works without change.


Legacy / existing code references (quick lookup)
- `core/gameLogic.js`:
    - `_spawnBomb()` — current plane bomb creation and setup. See `_spawnBomb` at about line 218. It calls `window.ObjectFactory.createInternal(this.scene, 'bomb', ...)` and sets initial velocity via `Phaser.Physics.Matter.Matter.Body.setVelocity`.
    - `_updateBombs()` — bomb lifecycle cleanup and bottom-of-arena explosion handling. See `_updateBombs` at about line 245.
    - `_handleCollision(bodyA, bodyB)` — handles bomb collisions and triggers `_explodeAt(...)`. See `_handleCollision` at about line 268.

- `factories/objectFactory.js`:
    - `window.ObjectFactory.createInternal(scene, type, x, y, arena, options)` — used by `_spawnBomb` to create bomb game objects. Definition starts at about line 77 in the file.

- `factories/objectFactory.helpers.js`:
    - `_computeSize(scene, cfg)` — computes sprite scale and collision size (useful to ensure `scale`+`shape` logic matches existing behavior). See function at about line 10.
    - `_buildPhysicsShape(p, bodyW, bodyH, dims)` — builds circular or rectangle matter shapes (see around line 82).

- `config/objects.config.js`:
    - `internalTypes.plane` and `internalTypes.bomb` — contains current plane drop settings (`bombDropDelayRangeSec`, `bombDropOffsetRatioRange`, `bombDropYOffsetY`) and bomb physics (`friction`, labels). See `bomb` definition under `internalTypes`.

- `config/assets.config.js`:
    - Animation keys used for bombs and crates: `bomb_ltr`, `bomb_rtl`, `bomb_crate_idle`, etc.

Use these references when updating code or writing the new `spawnBomb` implementation so you can find and migrate existing hard-coded logic quickly.
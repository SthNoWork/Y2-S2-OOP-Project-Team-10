# OOP & Gang of Four Pattern Report — Build to Survive

Codebase reviewed: `Y2-S2-OOP-Project-Team-10.rar`

---

## 1. Inheritance Hierarchies

### 1.1 Entity hierarchy — `core/entities/`

```
Phaser.GameObjects.Sprite
  └─ DestructibleEntity     (core/entities/destructibleEntity.js)
       ├─ Player            (core/entities/player.js)
       ├─ Building          (core/entities/building.js)
       └─ Attacker          (core/entities/attacker.js)
            ├─ Mortar       (core/entities/mortar.js)
            ├─ Pillbox      (core/entities/pillbox.js)
            └─ Plane        (core/entities/plane.js)
```

| File | Class | What it adds |
|---|---|---|
| `destructibleEntity.js` | `DestructibleEntity` | `setHealth()`, `takeDamage()`, `onDeath()`, `updateHpLabel()`, `destroy()` — the shared HP/death lifecycle every gameplay object needs |
| `player.js` | `Player extends DestructibleEntity` | Overrides `takeDamage()` (shield check) and `onDeath()` (triggers game over) |
| `building.js` | `Building extends DestructibleEntity` | Adds `bounce()` (trampoline physics) and overrides `onDeath()` (building-count bookkeeping) |
| `attacker.js` | `Attacker extends DestructibleEntity` | Adds abstract `spawn()` / `shoot()` hooks and weapon-timer cleanup in `preDestroy()` |
| `mortar.js` | `Mortar extends Attacker` | Implements `shoot()` — barrage-fire high-arc bombs |
| `pillbox.js` | `Pillbox extends Attacker` | Implements `shoot()` — single high-arc bomb |
| `plane.js` | `Plane extends Attacker` | Implements `shoot()` + adds `startFlight()` for lateral movement |

**Where polymorphism actually shows up:**
- `DestructibleEntity.onDeath()` (line 67) is overridden by `Building.onDeath()` (line 97) and `Player.onDeath()`, each of which does its own thing *and then* calls `super.onDeath()` — correct use of method overriding + `super`.
- `Attacker.shoot(target, options)` (line ~10 of `attacker.js`) is declared as an empty method with the comment `// Abstract method to be overridden by subclasses` and is implemented differently in `Mortar`, `Pillbox`, and `Plane` — this is runtime polymorphism: `EntityManager` and level code can call `attacker.shoot(...)` on any of the three without knowing which subclass it is.

### 1.2 Scene hierarchy — `scenes/`

```
Phaser.Scene
  └─ BaseScene            (scenes/baseScene.js)
       ├─ BootScene
       ├─ GameScene
       ├─ Game1v1Scene
       ├─ LeaderboardScene
       ├─ LevelSelectScene
       ├─ ProfileScene
       ├─ SettingsScene
       └─ ShopScene
```

`BaseScene` (line 5) defines an empty `clear()` hook and a concrete `reload()` method that calls `this.clear()` internally — every concrete scene overrides `clear()` to do its own teardown. This is the **Template Method** pattern (see §2.5).

### 1.3 State hierarchy — `core/game1v1States.js`

```
Game1v1State
  ├─ P1BuildState
  ├─ P2BuildState
  ├─ ActionState
  ├─ ChooseRewardState
  └─ GameOverState
```
Covered in detail in §2.4.

### 1.4 Factory hierarchy — `factories/objectFactory.js`

```
BaseObjectCreator
  ├─ PlaceableCreator
  ├─ LevelObjectCreator
  └─ InternalObjectCreator
```
Covered in detail in §2.1.

---

## 2. Gang of Four Design Patterns

### 2.1 Factory Method + Template Method — `factories/objectFactory.js`

The file's own header comment states this directly: *"Restructured using the Gang of Four (GoF) Factory Method & Template Method patterns."*

- **`BaseObjectCreator.create(scene, type, x, y, arena, options)`** (line 6) is the **Template Method** — it defines the fixed, ordered algorithm for building any game object:
  `getConfig → resolveSpawnLocation → preVisualBuild → (compute size/build visual) → postVisualBuild → shouldAttachPhysics → setHealth → decorateProperties → register`
- The hook methods `getConfig()` (line 43), `resolveSpawnLocation()` (line 47), `preVisualBuild()`/`postVisualBuild()` (lines 51–52), and `decorateProperties()` (line 62) are overridden by the three subclasses — this is **Factory Method**, since each subclass decides *which kind* of config/object gets produced:
  - `PlaceableCreator.getConfig()` (line 74) → `window.ObjectConfig.placeableTypes[type]`
  - `LevelObjectCreator.getConfig()` (line 92) → `window.ObjectConfig.levelTypes[type]`
  - `InternalObjectCreator.getConfig()` (line 104) → `window.ObjectConfig.internalTypes[type]`
- `window.ObjectFactory` (line 145) exposes `createPlaceable()`, `createLevelObject()`, `createInternal()` as the client-facing API, each delegating to a private singleton instance (`placeableCreator`, `levelObjectCreator`, `internalObjectCreator`, lines 141–143). This object also arguably plays a light **Facade** role — it hides the three creator classes behind one unified interface.

### 2.2 Singleton — five manager classes in `core/`

Every major manager uses the identical, textbook-correct idiom: a **private static `#instance`** field and a **`static getInstance()`** method, ensuring exactly one instance exists per page load.

| File | Class | Singleton line | Responsibility |
|---|---|---|---|
| `core/entityManager.js` | `EntityManager` | line 16–20 (`getInstance`), line ~end `window.EntityManager = EntityManager.getInstance();` | Tracks all live entities, HP sync, chain-explosion queue |
| `core/buildingManager.js` | `BuildingManager` | line 18–22 | Inventory UI, drag-and-drop placement, placement validation |
| `core/powerUpManager.js` | `PowerUpManager` | line 18–22 | Power-up button UI and effects (heal, shield, double-item) |
| `core/sfxManager.js` | `SfxManager` | line 15–19 | Sound-effect playback, volume, muting |
| `core/levelManager.js` | `LevelManager` | line 22–26 | Level loading, wave sequencing, win/lose screens |

Notably these aren't "fake singletons" (a plain object literal assigned to `window`) — they use real **private class fields** (`#scene`, `#buildings`, `#draggingBuilding`, etc., e.g. `entityManager.js` lines 6–13) with public getters that return **defensive copies** rather than live references:
```js
get buildings() { return [...this.#buildings]; }   // entityManager.js
get placedBuildings() { return [...this.#placedBuildings]; } // buildingManager.js
```
This combines Singleton (structural guarantee of one instance) with proper **encapsulation** (external code can read but not directly mutate internal arrays).

### 2.3 Command — `core/explosionCommand.js`

`ExplosionCommand` (line 1) is a textbook **Command** object: it bundles a request ("detonate this explosive at (x, y) with this config") into a single object with one public entry point, `execute()` (line 10), which internally delegates to private step methods:
- `_blastRadiusPx()` (line 52)
- `_spawnExplosionVFX()` (line 74)
- `_drawDebugBlastRadius()` (line 105)
- `_collectBlastBodies()` (line 115)
- `_applyBlastEffects()` (line 174)
- `_spawnClusterBombs()` (line 213)

**Where it's invoked (decoupled from where it's constructed):**
- `EntityManager._processChainExplosions()` (`core/entityManager.js`, line 120) builds and executes a fresh `ExplosionCommand` for every item pulled off the `#chainExplosionQueue`:
  ```js
  const cmd = new window.ExplosionCommand(this.#scene, { x: item.x, y: item.y, explosiveCfg: item.cfg, sourceBomb: item.sourceBomb });
  cmd.execute();
  ```
- `Game1v1State`'s `ActionState.detonateBomb(bomb)` (`core/game1v1States.js`, line ~161) constructs and executes its own `ExplosionCommand` when a bomb is manually detonated during the 1v1 action phase.

Both call sites never know *how* an explosion works internally — they just build a command object with data and call `execute()`. That's the whole point of Command: turning "do this action" into a first-class, queueable, reusable object instead of a direct function call.

### 2.4 State — `core/game1v1States.js` + `scenes/game1v1Scene.js`

- **Abstract state base:** `Game1v1State` (line 4) defines the common interface — `phase` getter, `enter()`, `exit()`, `update(time, delta)`, `detonateBomb(bomb)` — all as no-op defaults.
- **Concrete states:**
  - `P1BuildState` (line 15) — Player 1's build phase UI/logic
  - `P2BuildState` (line 29) — Player 2's build phase UI/logic
  - `ActionState` (line 43) — the "FIGHT!" phase; also implements `detonateBomb()` using the Command pattern (§2.3)
  - `ChooseRewardState` (line 188) — post-round reward selection, with its own `enter()`/`exit()` that build/destroy card UI
  - `GameOverState` (line 264) — end screen
- **Context object:** `Game1v1Scene` (in `scenes/game1v1Scene.js`) holds `this.currentState` and implements the state transition itself:
  ```js
  if (this.currentState) { this.currentState.exit(); }
  this.currentState = newState;
  this.currentState.enter();
  ```
  (`scenes/game1v1Scene.js`, lines ~179–184, inside what the code calls `changeState()`). Per-frame ticking is also delegated polymorphically:
  ```js
  this.currentState.update(time, delta);   // line 558
  ```
  Rather than branching on a `phase` string everywhere, the scene just calls methods on whatever the current state object is — that's the defining trait of the State pattern versus a plain state-machine-with-if-statements.

### 2.5 Template Method — `scenes/baseScene.js`

- `BaseScene.reload()` (line ~14) is the fixed algorithm: grab the scene key → call `this.clear()` → remove and re-add the scene from the game's scene manager.
- `clear()` itself (line 11) is declared as an empty **hook method** with the comment *"Overridden by subclasses"* — every concrete scene (`GameScene`, `Game1v1Scene`, etc.) supplies its own teardown logic (killing timers, managers, listeners) without needing to reimplement the reload machinery itself.

This is a second, independent application of Template Method in the codebase (distinct from the one in `objectFactory.js`), applied at the scene-lifecycle level instead of the object-creation level.

---

## 3. Summary Table

| Pattern | Category | Location(s) |
|---|---|---|
| Factory Method | Creational | `factories/objectFactory.js` — `PlaceableCreator`, `LevelObjectCreator`, `InternalObjectCreator` |
| Template Method | Behavioral | `factories/objectFactory.js` — `BaseObjectCreator.create()`; `scenes/baseScene.js` — `BaseScene.reload()` |
| Singleton | Creational | `EntityManager`, `BuildingManager`, `PowerUpManager`, `SfxManager`, `LevelManager` (all in `core/`) |
| Command | Behavioral | `core/explosionCommand.js` — `ExplosionCommand`, invoked from `entityManager.js` and `game1v1States.js` |
| State | Behavioral | `core/game1v1States.js` + `scenes/game1v1Scene.js` (`currentState` context) |
| Facade *(soft/implicit)* | Structural | `window.ObjectFactory` public API hiding the three internal creator instances |

**Core OOP pillars, where they're demonstrated:**
- **Inheritance:** entity tree (`DestructibleEntity → Attacker/Building/Player`), scene tree (`BaseScene → *Scene`), state tree (`Game1v1State → *State`), factory tree (`BaseObjectCreator → *Creator`)
- **Polymorphism:** `onDeath()`, `takeDamage()`, `shoot()` overrides across entities; `enter()/exit()/update()` overrides across states; `clear()` override across scenes
- **Encapsulation:** private `#fields` in all five manager Singletons, with getters returning copies instead of live references
- **Abstraction:** empty/no-op base methods meant to be overridden — `Attacker.shoot()`, `Game1v1State.enter()`, `BaseScene.clear()`, `BaseObjectCreator.getConfig()`

---

## 4. Suggestions if you want to strengthen the report further

- Note that `Mortar.shoot()` and `Pillbox.shoot()` are near-duplicates of each other — a **Strategy** pattern (weapon behavior injected via config instead of duplicated per-class) would remove that duplication and give you a sixth pattern to discuss.
- `ObjectFactory`'s role hiding three creator instances behind one API is worth explicitly naming as **Facade** in your write-up rather than leaving it implicit.
- Don't claim **Observer** just because Phaser's built-in `scene.events.on/emit` is used throughout (e.g. `entityManager.js` listening for `'shutdown'`) — that's Phaser's own pattern, not one your team implemented, so it's safer to leave it out unless you built a custom emitter/listener system yourselves.
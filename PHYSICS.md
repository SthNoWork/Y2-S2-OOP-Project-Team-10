# Physics touchpoints

## Engine setup
- Matter is enabled and configured (gravity, debug) in [Game.js](Game.js#L44-L49).
- The Matter world bounds are set on scene create and resize in [Scenes/gameScene.js](Scenes/gameScene.js#L27-L31) and [Scenes/gameScene.js](Scenes/gameScene.js#L121-L127).

## Physics bodies added
- Core helper that attaches a Matter body to game objects is `_addPhysics` in [Scenes/gameScene/objectFactory.js](Scenes/gameScene/objectFactory.js#L61-L87).
- Placeable buildings always get physics via `_addPhysics` in [Scenes/gameScene/objectFactory.js](Scenes/gameScene/objectFactory.js#L127-L138).
- Level objects add physics when `cfg.physics` exists in [Scenes/gameScene/objectFactory.js](Scenes/gameScene/objectFactory.js#L166-L178).
- Internal objects (bomb, plane, player) add physics when configured in [Scenes/gameScene/objectFactory.js](Scenes/gameScene/objectFactory.js#L198-L213).
- Platforms are created and given static Matter bodies in [Scenes/gameScene/levelManager.js](Scenes/gameScene/levelManager.js#L323-L334).
- Per-type physics settings (friction, restitution, mass, shape, collision filters) live in [Scenes/gameScene/objectConfig.js](Scenes/gameScene/objectConfig.js#L13-L138).

## Physics interactions (runtime usage)
- Dragging resets and moves Matter bodies in [Scenes/gameScene/buildingManager.js](Scenes/gameScene/buildingManager.js#L70-L112) and [Scenes/gameScene/buildingManager.js](Scenes/gameScene/buildingManager.js#L131-L136).
- Collision callbacks and blast queries use Matter world APIs in [Scenes/gameScene/gameLogic.js](Scenes/gameScene/gameLogic.js#L38-L59) and [Scenes/gameScene/gameLogic.js](Scenes/gameScene/gameLogic.js#L302-L308).
- Bomb spawn velocity is set via Matter body in [Scenes/gameScene/gameLogic.js](Scenes/gameScene/gameLogic.js#L193-L199).

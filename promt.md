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

No need to open browser. just do code and ill open and check
Job:

do we need the pillbox and mortar manager? cant they just be stored in an entity manager?

issue: 
index.html:800 Live reload enabled.
phaser.min.js:1 Phaser v4.0.0 (WebGL | Web Audio) https://phaser.io/v400
explosionCommand.js:24 [Bomb Explode] ID: 21 | Explode Pos: (-29.3, 1054.3)
explosionCommand.js:24 [Bomb Explode] ID: 22 | Explode Pos: (33.1, 926.8)
explosionCommand.js:24 [Bomb Explode] ID: 23 | Explode Pos: (103.1, 937.2)
explosionCommand.js:24 [Bomb Explode] ID: 24 | Explode Pos: (219.8, 935.7)
explosionCommand.js:24 [Bomb Explode] ID: 21 | Explode Pos: (362.9, 931.3)
explosionCommand.js:24 [Bomb Explode] ID: 22 | Explode Pos: (351.5, 937.2)
explosionCommand.js:24 [Bomb Explode] ID: 23 | Explode Pos: (483.1, 935.7)
explosionCommand.js:24 [Bomb Explode] ID: 24 | Explode Pos: (547.7, 931.3)
explosionCommand.js:24 [Bomb Explode] ID: 21 | Explode Pos: (634.1, 937.2)
explosionCommand.js:24 [Bomb Explode] ID: 22 | Explode Pos: (633.9, 926.8)
explosionCommand.js:24 [Bomb Explode] ID: 25 | Explode Pos: (730.6, 935.7)
explosionCommand.js:24 [Bomb Explode] ID: 23 | Explode Pos: (749.0, 786.4)
explosionCommand.js:24 [Bomb Explode] ID: 25 | Explode Pos: (1192.3, 928.3)
explosionCommand.js:24 [Bomb Explode] ID: 26 | Explode Pos: (1220.7, 762.6)
explosionCommand.js:24 [Bomb Explode] ID: 27 | Explode Pos: (1263.1, 606.1)
explosionCommand.js:24 [Bomb Explode] ID: 28 | Explode Pos: (1303.9, 496.2)
explosionCommand.js:24 [Bomb Explode] ID: 24 | Explode Pos: (885.8, 831.9)
explosionCommand.js:24 [Bomb Explode] ID: 26 | Explode Pos: (1448.2, 926.8)
explosionCommand.js:24 [Bomb Explode] ID: 25 | Explode Pos: (1509.3, 928.3)
explosionCommand.js:24 [Bomb Explode] ID: 27 | Explode Pos: (1590.5, 931.6)
explosionCommand.js:24 [Bomb Explode] ID: 28 | Explode Pos: (1692.0, 926.8)
explosionCommand.js:24 [Bomb Explode] ID: 24 | Explode Pos: (1752.3, 937.2)
explosionCommand.js:24 [Bomb Explode] ID: 46 | Explode Pos: (1442.5, 580.4)
explosionCommand.js:24 [Bomb Explode] ID: 47 | Explode Pos: (491.8, 599.9)
explosionCommand.js:24 [Bomb Explode] ID: 46 | Explode Pos: (1446.5, 580.9)
explosionCommand.js:24 [Bomb Explode] ID: 44 | Explode Pos: (30.4, 934.9)
explosionCommand.js:24 [Bomb Explode] ID: 46 | Explode Pos: (1442.7, 580.3)
explosionCommand.js:24 [Bomb Explode] ID: 49 | Explode Pos: (406.3, 503.9)
explosionCommand.js:24 [Bomb Explode] ID: 46 | Explode Pos: (1439.1, 579.7)
explosionCommand.js:24 [Bomb Explode] ID: 50 | Explode Pos: (7.7, 936.2)
explosionCommand.js:24 [Bomb Explode] ID: 45 | Explode Pos: (161.9, 930.4)
explosionCommand.js:24 [Bomb Explode] ID: 60 | Explode Pos: (423.4, 502.7)
explosionCommand.js:24 [Bomb Explode] ID: 51 | Explode Pos: (19.6, 931.8)
explosionCommand.js:24 [Bomb Explode] ID: 52 | Explode Pos: (32.3, 930.7)
explosionCommand.js:24 [Bomb Explode] ID: 53 | Explode Pos: (43.4, 932.4)
explosionCommand.js:24 [Bomb Explode] ID: 54 | Explode Pos: (56.0, 937.8)
explosionCommand.js:24 [Bomb Explode] ID: 55 | Explode Pos: (387.6, 496.7)
explosionCommand.js:24 [Bomb Explode] ID: 56 | Explode Pos: (400.0, 491.6)
explosionCommand.js:24 [Bomb Explode] ID: 57 | Explode Pos: (403.7, 491.1)
explosionCommand.js:24 [Bomb Explode] ID: 58 | Explode Pos: (412.5, 491.6)
explosionCommand.js:24 [Bomb Explode] ID: 59 | Explode Pos: (423.0, 495.5)
explosionCommand.js:24 [Bomb Explode] ID: 58 | Explode Pos: (1012.2, 942.6)
explosionCommand.js:24 [Bomb Explode] ID: 50 | Explode Pos: (161.9, 930.3)
explosionCommand.js:24 [Bomb Explode] ID: 55 | Explode Pos: (949.5, 1058.4)
explosionCommand.js:24 [Bomb Explode] ID: 51 | Explode Pos: (107.2, 1145.2)
explosionCommand.js:24 [Bomb Explode] ID: 54 | Explode Pos: (121.3, 1081.8)
explosionCommand.js:24 [Bomb Explode] ID: 52 | Explode Pos: (151.7, 964.4)
explosionCommand.js:24 [Bomb Explode] ID: 59 | Explode Pos: (1780.6, 1244.2)
explosionCommand.js:24 [Bomb Explode] ID: 57 | Explode Pos: (1529.0, 1396.9)
explosionCommand.js:24 [Bomb Explode] ID: 53 | Explode Pos: (129.1, 1058.4)
explosionCommand.js:24 [Bomb Explode] ID: 50 | Explode Pos: (140.6, 941.2)
explosionCommand.js:24 [Bomb Explode] ID: 64 | Explode Pos: (253.9, 940.7)
explosionCommand.js:24 [Bomb Explode] ID: 61 | Explode Pos: (166.6, 929.7)
explosionCommand.js:24 [Bomb Explode] ID: 62 | Explode Pos: (203.6, 925.2)
explosionCommand.js:24 [Bomb Explode] ID: 63 | Explode Pos: (229.6, 929.8)
explosionCommand.js:24 [Bomb Explode] ID: 67 | Explode Pos: (868.5, 526.7)
explosionCommand.js:24 [Bomb Explode] ID: 65 | Explode Pos: (607.5, 936.4)
explosionCommand.js:24 [Bomb Explode] ID: 59 | Explode Pos: (599.6, 946.8)
explosionCommand.js:24 [Bomb Explode] ID: 57 | Explode Pos: (600.5, 946.4)
explosionCommand.js:24 [Bomb Explode] ID: 61 | Explode Pos: (543.6, 1063.1)
explosionCommand.js:24 [Bomb Explode] ID: 53 | Explode Pos: (448.7, 1250.7)
explosionCommand.js:24 [Bomb Explode] ID: 50 | Explode Pos: (1045.0, 304.5)
explosionCommand.js:24 [Bomb Explode] ID: 52 | Explode Pos: (896.2, 531.0)
explosionCommand.js:24 [Bomb Explode] ID: 58 | Explode Pos: (441.2, 582.8)
phaser.min.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'clear')
    at initialize.postUpdate (phaser.min.js:1:758513)
    at o.emit (phaser.min.js:1:1600)
    at initialize.step (phaser.min.js:1:1125101)
    at initialize.update (phaser.min.js:1:1112308)
    at initialize.step (phaser.min.js:1:80426)
    at initialize.step (phaser.min.js:1:84737)
    at e (phaser.min.js:1:146668)
index.html:668 Orientation error: NotSupportedError: screen.orientation.lock() is not available on this device.
index.html:668 Orientation error: NotSupportedError: screen.orientation.lock() is not available on this device.
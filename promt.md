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

Job:
Final optimization

Make it effient. 
Codes that are not used should be removed.
functions that are not used should be removed.

logic that is constantly written again and again should be refactored into a function.

make sure the code follow OOP and gang of four.

move functions if it doesnt seem to belong n the file.

Organize functions by order of their use for easy understand also remove comments that are not needed.



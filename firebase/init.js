// firebase/init.js
// Single entry-point for the Firebase layer.
// Import order matters: gameData is a regular script (already loaded by index.html),
// then auth/firestore/leaderboard are imported here so they all exist on window
// before FirebaseAuth.init() is called.

import './auth.js';
import './firestore.js';
import './leaderboard.js';

// All three window.Firebase* objects are now defined.
// Kick off the persistent auth listener.
window.FirebaseAuth.init();
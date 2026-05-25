// firebase/firestore.js
// Handles all Firestore reads and writes for user score data.
//
// Firestore structure per user:
//   users/{uid}
//     displayName : string   ← from Google account
//     email       : string
//     total_score : number   ← sum of all level scores (maintained by client)
//     level_1     : number   ← 0 = not beaten, >0 = high score
//     level_2     : number
//     ...

import { db } from './config.js';
import {
  doc, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

window.FirebaseStore = {

  // ── Ensure user doc ─────────────────────────────────────────────────────

  // Called on every login. Creates the doc if it doesn't exist yet
  // (first-time user), otherwise leaves existing data untouched.
  async ensureUserDoc(user) {
    try {
      const ref  = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          displayName: user.displayName || 'Unknown',
          email:       user.email || '',
          total_score: 0,
        });
      }
    } catch (e) {
      console.error('[FirebaseStore.ensureUserDoc]', e);
    }
  },

  // ── Pull ────────────────────────────────────────────────────────────────

  // Fetches the user's full score doc and writes it to the server cache.
  // Returns the data object, or null on failure.
  async pullUserData(uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));

      if (snap.exists()) {
        const data = snap.data();
        window.GameData.setServerCache(data);
        return data;
      }

      return null;
    } catch (e) {
      console.error('[FirebaseStore.pullUserData]', e);
      return null;
    }
  },

  // ── Push ────────────────────────────────────────────────────────────────

  // Pushes a new level score to Firestore only if it beats the cached record.
  // Also updates total_score.
  // Returns true if a write happened, false otherwise.
  async pushLevelScore(uid, levelNum, newScore) {
    const key     = `level_${levelNum}`;
    const cache   = window.GameData.getServerCache();
    const current = cache[key] || 0;

    if (newScore <= current) {
      return false; // not a high score, skip write
    }

    // Update local cache immediately so the UI reflects the new score
    // even if the network write is slow.
    const updated = window.GameData.updateCachedScore(levelNum, newScore);

    try {
      await updateDoc(doc(db, 'users', uid), {
        [key]:        newScore,
        total_score:  updated.total_score,
      });

      return true;
    } catch (e) {
      console.error('[FirebaseStore.pushLevelScore]', e);

      // Roll back the cache update so it doesn't stay out of sync.
      window.GameData.setServerCache(cache);
      return false;
    }
  },

  // ── Convenience wrapper ─────────────────────────────────────────────────

  // Call this from levelManager._showWinScreen() after a win.
  // Handles auth check, offline fallback, and push in one call.
  async recordWin(levelNum, score) {
    const user = window.FirebaseAuth?.currentUser;

    if (!user) {
      // Logged out — save to offline bucket only.
      window.GameData.saveOfflineScore(levelNum, score);
      return;
    }

    await this.pushLevelScore(user.uid, levelNum, score);
  },
};
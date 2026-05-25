// firebase/leaderboard.js
// Fetches the public leaderboard from Firestore (top N users by total_score).
// Falls back to localStorage cache if offline or not logged in.
// Firestore rules allow read: if true, so logged-out users can still view it.

import { db } from './config.js';
import {
  collection, query, orderBy, limit, getDocs,
} from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';

window.LeaderboardService = {

  // Fetches top N scores from Firestore, caches them, and returns the array.
  // Each entry: { uid, displayName, total_score, level_1, level_2, ... }
  // On failure returns the last cached snapshot instead.
  async fetchTopScores(n = 10) {
    try {
      const q    = query(collection(db, 'users'), orderBy('total_score', 'desc'), limit(n));
      const snap = await getDocs(q);

      const entries = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));

      window.GameData.setLeaderboardCache(entries);
      return entries;
    } catch (e) {
      console.error('[LeaderboardService.fetchTopScores]', e);
      // Return stale cache so the scene still has something to show.
      return window.GameData.getCachedLeaderboard();
    }
  },

  // Synchronous cached read — use when you only need the last known snapshot.
  getCached() {
    return window.GameData.getCachedLeaderboard();
  },
};
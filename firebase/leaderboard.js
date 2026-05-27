// firebase/leaderboard.js
// Fetches the public leaderboard from Firestore with cursor-based pagination.
// Falls back to localStorage cache if offline or not logged in.
// Firestore rules allow read: if true, so logged-out users can still view it.

import { db } from './config.js';
import {
  collection, query, orderBy, limit, startAfter, getDocs,
} from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';

window.LeaderboardService = {

  // Fetches a page of scores from Firestore.
  // Pass afterDoc (a Firestore DocumentSnapshot) to get the next page.
  // Returns { entries, lastDoc, hasMore }
  //   entries  – array of { uid, displayName, total_score, ... }
  //   lastDoc  – pass back in as afterDoc on the next call to get the next page
  //   hasMore  – false when the final page has been reached
  async fetchScores(n = 20, afterDoc = null) {
    try {
      const col         = collection(db, 'users');
      const constraints = [orderBy('total_score', 'desc'), limit(n)];
      if (afterDoc) constraints.splice(1, 0, startAfter(afterDoc));

      const snap    = await getDocs(query(col, ...constraints));
      const entries = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      const lastDoc = snap.docs.at(-1) ?? null;
      const hasMore = snap.docs.length === n;

      // Only cache the first page — it's what most users see.
      if (!afterDoc) window.GameData.setLeaderboardCache(entries);

      return { entries, lastDoc, hasMore };
    } catch (e) {
      console.error('[LeaderboardService.fetchScores]', e);
      return {
        entries: afterDoc ? [] : window.GameData.getCachedLeaderboard(),
        lastDoc: null,
        hasMore: false,
      };
    }
  },

  // Backwards-compat shim for any callers still using fetchTopScores(n).
  async fetchTopScores(n = 10) {
    const { entries } = await this.fetchScores(n);
    return entries;
  },

  // Synchronous cached read — use when you only need the last known snapshot.
  getCached() {
    return window.GameData.getCachedLeaderboard();
  },
};
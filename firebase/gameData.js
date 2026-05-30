// firebase/gameData.js
// Manages two separate localStorage buckets:
//
//   bts_offline_scores  — scores earned while logged out (never pushed to server)
//   bts_server_cache    — mirror of the user's Firestore doc (updated on pull/push)
//
// All game code should read scores through GameData so the source
// (offline vs server cache) is handled in one place.

window.GameData = {

  OFFLINE_KEY:     'bts_offline_scores',
  CACHE_KEY:       'bts_server_cache',
  LEADERBOARD_KEY: 'bts_leaderboard_cache',

  // ── Active score source ─────────────────────────────────────────────────

  // Returns the correct score object depending on auth state.
  // Logged in  → server cache  (Firestore mirror)
  // Logged out → offline scores (local only)
  getActiveScores() {
    if (window.FirebaseAuth?.currentUser) {
      return this.getServerCache();
    }
    return this.getOfflineScores();
  },

  // Convenience: score for one level from the active source. 0 if never beaten.
  getLevelScore(levelNum) {
    return this.getActiveScores()[`level_${levelNum}`] || 0;
  },

  // True if the player has beaten this level at least once.
  isLevelBeaten(levelNum) {
    return this.getLevelScore(levelNum) > 0;
  },

  // ── Offline bucket (logged-out play) ────────────────────────────────────

  getOfflineScores() {
    try {
      return JSON.parse(localStorage.getItem(this.OFFLINE_KEY)) || {};
    } catch {
      return {};
    }
  },

  // Saves a score to the offline bucket only if it beats the existing record.
  // Returns the updated scores object.
  saveOfflineScore(levelNum, score) {
    const scores  = this.getOfflineScores();
    const key     = `level_${levelNum}`;
    const current = scores[key] || 0;

    if (score <= current) return scores; // not a new high score

    scores[key]         = score;
    scores.total_score  = this._sumLevelScores(scores);

    try {
      localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(scores));
    } catch (e) {
      console.warn('[GameData.saveOfflineScore] localStorage write failed', e);
    }

    return scores;
  },

  // ── Server cache bucket (Firestore mirror) ──────────────────────────────

  getServerCache() {
    try {
      return JSON.parse(localStorage.getItem(this.CACHE_KEY)) || {};
    } catch {
      return {};
    }
  },

  // Replaces the entire server cache (called after a Firestore pull).
  setServerCache(data) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[GameData.setServerCache] localStorage write failed', e);
    }
  },

  // Updates a single level's score in the server cache and recalculates total.
  // Called after a successful Firestore push so the cache stays in sync.
  updateCachedScore(levelNum, score) {
    const cache             = this.getServerCache();
    cache[`level_${levelNum}`] = score;
    cache.total_score       = this._sumLevelScores(cache);
    this.setServerCache(cache);
    return cache;
  },

  // Wipes the server cache on logout so a different account starts clean.
  clearServerCache() {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (e) {
      console.warn('[GameData.clearServerCache] localStorage remove failed', e);
    }
  },

  // ── Leaderboard cache ───────────────────────────────────────────────────

  // Saves a fresh leaderboard snapshot for offline viewing.
  setLeaderboardCache(entries) {
    try {
      localStorage.setItem(this.LEADERBOARD_KEY, JSON.stringify(entries));
    } catch (e) {
      console.warn('[GameData.setLeaderboardCache] localStorage write failed', e);
    }
  },

  getCachedLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(this.LEADERBOARD_KEY)) || [];
    } catch {
      return [];
    }
  },
  // ── Skins (purchased items) ────────────────────────────────────────────

  // Returns purchased skins array from active source
  getPurchasedSkins() {
    const skins = this.getActiveScores().purchased_skins || [];
    return Array.isArray(skins) ? skins : [];
  },

  // Check if a specific skin is purchased
  isSkinPurchased(skinId) {
    return this.getPurchasedSkins().includes(skinId);
  },

  // Add a purchased skin (offline or server cache depending on auth state)
  addPurchasedSkin(skinId) {
    const scores = this.getActiveScores();
    if (!scores.purchased_skins) {
      scores.purchased_skins = [];
    }
    if (!scores.purchased_skins.includes(skinId)) {
      scores.purchased_skins.push(skinId);
    }
    
    if (window.FirebaseAuth?.currentUser) {
      this.setServerCache(scores);
    } else {
      try {
        localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(scores));
      } catch (e) {
        console.warn('[GameData.addPurchasedSkin] localStorage write failed', e);
      }
    }
  },

  // Get the currently equipped skin (default: skin_1)
  getEquippedSkin() {
    const equipped = this.getActiveScores().equipped_skin || 'skin_1';
    return equipped;
  },

  // Set the equipped skin
  setEquippedSkin(skinId) {
    const scores = this.getActiveScores();
    scores.equipped_skin = skinId;
    
    if (window.FirebaseAuth?.currentUser) {
      this.setServerCache(scores);
    } else {
      try {
        localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(scores));
      } catch (e) {
        console.warn('[GameData.setEquippedSkin] localStorage write failed', e);
      }
    }
  },

  // ── Helpers ─────────────────────────────────────────────────────────────

  // Sums every level_N field in a scores object to produce total_score.
  _sumLevelScores(scores) {
    return Object.entries(scores)
      .filter(([key]) => key.startsWith('level_'))
      .reduce((sum, [, val]) => sum + (Number(val) || 0), 0);
  },
};
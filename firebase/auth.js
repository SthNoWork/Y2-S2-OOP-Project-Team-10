// firebase/auth.js
// Handles Google sign-in / sign-out and the auth state listener.
//
// On login  → pulls Firestore data into server cache, fires 'authStateChanged'
// On logout → clears server cache, fires 'authStateChanged'
//
// Listen for auth changes anywhere in the game:
//   window.addEventListener('authStateChanged', (e) => {
//     const user = e.detail.user; // null when logged out
//   });

import { auth } from './config.js';
import {
  GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

window.FirebaseAuth = {

  currentUser: null,

  // ── Public API ──────────────────────────────────────────────────────────

  async login() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged fires automatically after this — no extra work needed here.
    } catch (e) {
      console.error('[FirebaseAuth.login]', e);
      throw e; // let caller show an error message if needed
    }
  },

  async logout() {
    try {
      window.GameData?.clearServerCache();
      await signOut(auth);
    } catch (e) {
      console.error('[FirebaseAuth.logout]', e);
      throw e;
    }
  },
  async updateDisplayName(newName) {
    const user = this.currentUser;
    if (!user) throw new Error('Not signed in');

    const { updateProfile } = await import(
      'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js'
    );

    // Update Firebase Auth
    await updateProfile(user, { displayName: newName });

    // Also update Firestore so leaderboard reflects new name
    await window.FirebaseStore?.updateDisplayName(user.uid, newName);

    // Fire authStateChanged so profile scene re-renders with new name
    window.dispatchEvent(
      new CustomEvent('authStateChanged', { detail: { user } })
    );
  },

  // ── Initialisation ──────────────────────────────────────────────────────

  // Call once at app start (before any scene loads).
  // Sets up the persistent auth listener and exposes currentUser globally.
  init() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;

      if (user) {
        // Ensure the user's Firestore doc exists (creates it on first login).
        await window.FirebaseStore?.ensureUserDoc(user);

        // Pull latest scores into the server cache.
        await window.FirebaseStore?.pullUserData(user.uid);
      }

      // Broadcast to any scene / UI that cares.
      window.dispatchEvent(
        new CustomEvent('authStateChanged', { detail: { user } })
      );
    });
  },
};
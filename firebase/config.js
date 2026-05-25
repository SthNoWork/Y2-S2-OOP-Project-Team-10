// firebase/config.js
// Single source of truth for Firebase initialisation.
// All other firebase/ files import { db, auth } from here.

import { initializeApp }  from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyA8-qKuZu7NkrJwQ7RZs9HgNHtJI1bD5aU",
  authDomain:        "school-projects-b6cff.firebaseapp.com",
  projectId:         "school-projects-b6cff",
  storageBucket:     "school-projects-b6cff.firebasestorage.app",
  messagingSenderId: "166675822484",
  appId:             "1:166675822484:web:a856d6fb9b1ad46f37c181"
};

const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
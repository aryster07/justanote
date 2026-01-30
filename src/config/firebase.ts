import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDPidzFR2-qWQMe8e_gZBREDvRPfJT3foA",
  authDomain: "justanote-245f2.firebaseapp.com",
  projectId: "justanote-245f2",
  storageBucket: "justanote-245f2.firebasestorage.app",
  messagingSenderId: "176743103646",
  appId: "1:176743103646:web:3cb14b571ff9a45f214f8f",
  measurementId: "G-28PQX14TEL"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Analytics - handle gracefully for localhost/dev
let analytics: Analytics | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(() => {
  console.log('Analytics not supported in this environment');
});

export { analytics };
export default app;

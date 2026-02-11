import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDPidzFR2-qWQMe8e_gZBREDvRPfJT3foA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'justanote-245f2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'justanote-245f2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'justanote-245f2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '176743103646',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:176743103646:web:3cb14b571ff9a45f214f8f',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-28PQX14TEL',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Set persistence to local (survives browser restarts)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

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

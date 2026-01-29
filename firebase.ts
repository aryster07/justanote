import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { NoteData } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyDvdB4VUE7UHfN4xoyz6trRQKyAgdRKC1I",
  authDomain: "anony-fc294.firebaseapp.com",
  projectId: "anony-fc294",
  storageBucket: "anony-fc294.firebasestorage.app",
  messagingSenderId: "280220039436",
  appId: "1:280220039436:web:6e24e3ac33d03b7324f129",
  measurementId: "G-Q3B821DVJS"
};

// Lazy initialization
let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

const getApp = (): FirebaseApp => {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
};

const getDb = (): Firestore => {
  if (!dbInstance) {
    dbInstance = getFirestore(getApp());
  }
  return dbInstance;
};

const getAuthInstance = (): Auth => {
  if (!authInstance) {
    authInstance = getAuth(getApp());
  }
  return authInstance;
};

// Export instances
export const db = getDb();
export const storage = getStorage(getApp());
export const auth: Auth = getAuthInstance();
export const analytics = getAnalytics(getApp());

// Generate a short, unique ID
const generateId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper function to recursively remove undefined values
const removeUndefined = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = removeUndefined(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  return obj;
};

// Save a note to Firestore (enhanced version)
export const saveNote = async (data: NoteData): Promise<string> => {
  console.log('saveNote called with:', data);
  
  try {
    const firestore = getDb();
    const notesCollection = collection(firestore, "notes");
    const id = generateId();
    const docRef = doc(notesCollection, id);

    // Clean the data - remove undefined values
    const cleanData = removeUndefined(data);

    const docData = {
      ...cleanData,
      createdAt: serverTimestamp(),
      views: 0,
      viewCount: 0,
      status: data.deliveryMethod === 'admin' ? 'pending' : 'delivered',
      deliveredAt: data.deliveryMethod === 'admin' ? null : serverTimestamp(),
      viewedAt: null,
    };

    console.log('Saving document with ID:', id);
    await setDoc(docRef, docData);
    console.log('Document saved successfully');

    return id;
  } catch (error: any) {
    console.error("Error saving note:", error);
    throw error;
  }
};

// Get a note from Firestore
export const getNote = async (id: string): Promise<NoteData | null> => {
  try {
    const firestore = getDb();
    const notesCollection = collection(firestore, "notes");
    const docRef = doc(notesCollection, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        recipientName: data.recipientName || '',
        vibe: data.vibe || '',
        song: data.song || null,
        message: data.message || '',
        photoUrl: data.photoUrl || null,
        isAnonymous: data.isAnonymous ?? true,
        senderName: data.senderName || '',
        deliveryMethod: data.deliveryMethod || 'self',
        recipientInstagram: data.recipientInstagram || '',
        senderEmail: data.senderEmail || '',
        status: data.status || 'delivered',
        createdAt: data.createdAt,
        viewCount: data.viewCount || 0,
      } as NoteData;
    }

    return null;
  } catch (error) {
    console.error("Error getting note:", error);
    return null;
  }
};

// Increment view count
export const incrementViews = async (id: string): Promise<void> => {
  try {
    const firestore = getDb();
    const notesCollection = collection(firestore, "notes");
    const docRef = doc(notesCollection, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const currentViews = docSnap.data().views || 0;
      await updateDoc(docRef, {
        views: currentViews + 1,
        viewCount: currentViews + 1,
        viewedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error incrementing views:", error);
  }
};
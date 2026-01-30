import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NoteData } from '../types';

// Generate short unique ID
const generateId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

// Remove undefined values from object
const cleanData = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanData);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanData(v)])
    );
  }
  return obj;
};

// Compress image to base64 with proper error handling
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('Invalid file type. Please upload an image.'));
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      reject(new Error('Image too large. Maximum size is 10MB.'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not create canvas context'));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      try {
        let { width, height } = img;
        const maxDim = 400;
        
        if (width > height && width > maxDim) {
          height = (height * maxDim) / width;
          width = maxDim;
        } else if (height > maxDim) {
          width = (width * maxDim) / height;
          height = maxDim;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.2);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to compress image'));
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
};

// Save note to Firestore
export const saveNote = async (data: NoteData): Promise<string> => {
  const id = generateId();
  const docRef = doc(collection(db, 'notes'), id);

  let photoUrl = null;
  if (data.photo) {
    try {
      photoUrl = await compressImage(data.photo);
    } catch (error) {
      console.error('Image compression failed:', error);
      // Continue without photo if compression fails
    }
  }

  const docData = cleanData({
    ...data,
    photo: null,
    photoUrl,
    createdAt: serverTimestamp(),
    views: 0,
    viewCount: 0,
    status: data.deliveryMethod === 'admin' ? 'pending' : 'delivered',
    deliveredAt: data.deliveryMethod === 'admin' ? null : serverTimestamp(),
  });

  await setDoc(docRef, docData);
  return id;
};

// Get note from Firestore
export const getNote = async (id: string): Promise<NoteData | null> => {
  const docRef = doc(collection(db, 'notes'), id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    recipientName: data.recipientName || '',
    vibe: data.vibe || '',
    song: data.song || null,
    songData: data.songData || null,
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
    photo: null,
  };
};

// Increment view count
export const incrementViews = async (id: string): Promise<void> => {
  const docRef = doc(collection(db, 'notes'), id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const currentViews = docSnap.data().views || 0;
    await updateDoc(docRef, {
      views: currentViews + 1,
      viewCount: currentViews + 1,
      viewedAt: serverTimestamp()
    });
  }
};

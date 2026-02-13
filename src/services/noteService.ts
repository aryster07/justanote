import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NoteData, VIBES } from '../types';
import emailjs from '@emailjs/browser';

// EmailJS configuration for admin notifications
const EMAILJS_SERVICE_ID = 'service_h5xg96d';
const EMAILJS_TEMPLATE_ID = 'template_gkanixq'; // Using existing template
const EMAILJS_PUBLIC_KEY = 'D0IP-NcoiDAvCP57u';
const ADMIN_EMAIL = 'aryanrana762@gmail.com';

// Send notification email to admin when new admin delivery note is created
const notifyAdminNewNote = async (noteId: string, noteData: {
  recipientName: string;
  recipientInstagram: string;
  vibe: string | null;
  isAnonymous: boolean;
  senderName: string;
  senderEmail: string;
}) => {
  try {
    const vibeInfo = VIBES.find(v => v.id === noteData.vibe) || { emoji: '💌', label: 'Love' };
    const noteLink = `${window.location.origin}/view/${noteId}`;
    
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: ADMIN_EMAIL,
        sender_name: 'Just A Note System',
        recipient_name: `NEW ADMIN NOTE: ${noteData.recipientName} (@${noteData.recipientInstagram || 'no-ig'})`,
        note_link: noteLink,
        vibe_emoji: vibeInfo.emoji,
        vibe_label: vibeInfo.label,
        message_preview: `New admin delivery note created. Recipient: ${noteData.recipientName}, IG: @${noteData.recipientInstagram}`,
      },
      EMAILJS_PUBLIC_KEY
    );
    console.log('Admin notification email sent successfully');
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
    // Don't throw - email failure shouldn't block note creation
  }
};

// ============ VALIDATION CONSTANTS ============
const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_INSTAGRAM_LENGTH = 30;
const MAX_EMAIL_LENGTH = 254;

// Regex patterns for validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const INSTAGRAM_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

// ============ SANITIZATION FUNCTIONS ============

// Sanitize string to prevent XSS - removes dangerous HTML/script content
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .replace(/data:/gi, '') // Remove data: protocol (can be used for XSS)
    .trim();
};

// Sanitize name fields (stricter)
const sanitizeName = (name: string): string => {
  if (typeof name !== 'string') return '';
  // Only allow letters, numbers, spaces, hyphens, apostrophes, and common Unicode letters
  return name
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[<>{}[\]\\\/]/g, '') // Remove dangerous chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Sanitize message content
const sanitizeMessage = (message: string): string => {
  if (typeof message !== 'string') return '';
  return sanitizeString(message)
    .slice(0, MAX_MESSAGE_LENGTH)
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();
};

// Validate and sanitize Instagram handle
const sanitizeInstagram = (handle: string): string => {
  if (typeof handle !== 'string') return '';
  // Remove @ if present at start
  let cleaned = handle.trim().replace(/^@/, '');
  // Only allow valid Instagram characters
  cleaned = cleaned.replace(/[^a-zA-Z0-9._]/g, '');
  return cleaned.slice(0, MAX_INSTAGRAM_LENGTH);
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  if (typeof email !== 'string') return false;
  if (email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
};

// Sanitize email
const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim().slice(0, MAX_EMAIL_LENGTH);
};

// ============ VALIDATION FUNCTION ============

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateNoteData = (data: Partial<NoteData>): ValidationResult => {
  const errors: string[] = [];

  // Recipient name validation
  if (!data.recipientName || data.recipientName.trim().length < 1) {
    errors.push('Recipient name is required');
  } else if (data.recipientName.length > MAX_NAME_LENGTH) {
    errors.push(`Recipient name must be ${MAX_NAME_LENGTH} characters or less`);
  }

  // Message validation
  if (!data.message || data.message.trim().length < 1) {
    errors.push('Message is required');
  } else if (data.message.length > MAX_MESSAGE_LENGTH) {
    errors.push(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
  }

  // Sender name validation (if not anonymous)
  if (!data.isAnonymous && (!data.senderName || data.senderName.trim().length < 1)) {
    errors.push('Sender name is required when not anonymous');
  }

  // Email validation
  if (data.senderEmail && !isValidEmail(data.senderEmail)) {
    errors.push('Invalid email format');
  }

  // Instagram validation (if delivery method is admin)
  if (data.deliveryMethod === 'admin') {
    if (!data.recipientInstagram || data.recipientInstagram.trim().length < 1) {
      errors.push('Instagram handle is required for admin delivery');
    } else {
      const cleanHandle = sanitizeInstagram(data.recipientInstagram);
      if (!INSTAGRAM_REGEX.test(cleanHandle)) {
        errors.push('Invalid Instagram handle format');
      }
    }
  }

  // Delivery method validation
  if (data.deliveryMethod && !['self', 'admin'].includes(data.deliveryMethod)) {
    errors.push('Invalid delivery method');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============ UTILITY FUNCTIONS ============

// Generate short unique ID with timestamp for collision resistance
const generateId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const timestamp = Date.now().toString(36).slice(-4);
  const random = Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return timestamp + random;
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
        const maxDim = 800;
        
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
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
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

// Save note to Firestore with validation and sanitization
export const saveNote = async (data: NoteData): Promise<{ id: string }> => {
  // Validate input data
  const validation = validateNoteData(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const id = generateId();
  const docRef = doc(collection(db, 'notes'), id);

  let photoUrl = null;
  if (data.photo) {
    try {
      photoUrl = await compressImage(data.photo);
    } catch (error) {
      console.error('Image compression failed:', error);
    }
  }

  // Sanitize all string inputs before saving
  const sanitizedData = {
    recipientName: sanitizeName(data.recipientName),
    senderName: data.isAnonymous ? '' : sanitizeName(data.senderName),
    message: sanitizeMessage(data.message),
    recipientInstagram: sanitizeInstagram(data.recipientInstagram),
    senderEmail: sanitizeEmail(data.senderEmail),
    vibe: data.vibe ? sanitizeString(data.vibe) : null,
    song: data.song,
    songData: data.songData,
    isAnonymous: Boolean(data.isAnonymous),
    deliveryMethod: data.deliveryMethod === 'admin' ? 'admin' : 'self',
  };

  const docData = cleanData({
    recipientName: sanitizedData.recipientName,
    senderName: sanitizedData.senderName,
    message: sanitizedData.message,
    song: sanitizedData.song,
    songData: sanitizedData.songData,
    photoUrl,
    isAnonymous: sanitizedData.isAnonymous,
    vibe: sanitizedData.vibe,
    recipientInstagram: sanitizedData.recipientInstagram,
    senderEmail: sanitizedData.senderEmail,
    deliveryMethod: sanitizedData.deliveryMethod,
    createdAt: serverTimestamp(),
    views: 0,
    viewCount: 0,
    status: sanitizedData.deliveryMethod === 'admin' ? 'pending' : 'delivered',
    deliveredAt: sanitizedData.deliveryMethod === 'admin' ? null : serverTimestamp(),
    firstViewedAt: null,
    firstViewerInfo: null,
  });

  await setDoc(docRef, docData);

  // Send email notification to admin for admin delivery notes
  if (sanitizedData.deliveryMethod === 'admin') {
    notifyAdminNewNote(id, {
      recipientName: sanitizedData.recipientName,
      recipientInstagram: sanitizedData.recipientInstagram,
      vibe: sanitizedData.vibe,
      isAnonymous: sanitizedData.isAnonymous,
      senderName: sanitizedData.senderName,
      senderEmail: sanitizedData.senderEmail,
    });
  }

  return { id };
};

// Legacy decryption for old encrypted notes (backward compatibility)
const decryptLegacyData = async (encryptedData: string, keyString: string): Promise<string> => {
  try {
    // Convert base64url key to CryptoKey
    const base64Key = keyString.replace(/-/g, '+').replace(/_/g, '/');
    const paddingKey = '='.repeat((4 - (base64Key.length % 4)) % 4);
    const keyBytes = Uint8Array.from(atob(base64Key + paddingKey), c => c.charCodeAt(0));
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Convert base64url encrypted data to bytes
    const base64Data = encryptedData.replace(/-/g, '+').replace(/_/g, '/');
    const paddingData = '='.repeat((4 - (base64Data.length % 4)) % 4);
    const combined = Uint8Array.from(atob(base64Data + paddingData), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Legacy decryption error:', error);
    throw new Error('Failed to decrypt legacy data');
  }
};

// Get note from Firestore
export const getNote = async (id: string): Promise<NoteData | null> => {
  // Validate ID format to prevent injection
  if (!id || typeof id !== 'string' || id.length > 20 || !/^[a-zA-Z0-9]+$/.test(id)) {
    return null;
  }

  const docRef = doc(collection(db, 'notes'), id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();

  // Handle legacy encrypted notes (backward compatibility)
  if (data.isEncrypted && data.encryptedData && data.encryptionKey) {
    try {
      const decryptedJson = await decryptLegacyData(data.encryptedData, data.encryptionKey);
      const decryptedData = JSON.parse(decryptedJson);
      
      return {
        id: docSnap.id,
        recipientName: sanitizeName(decryptedData.recipientName || ''),
        vibe: data.vibe ? sanitizeString(data.vibe) : '',
        song: decryptedData.song || null,
        songData: decryptedData.songData || null,
        message: sanitizeMessage(decryptedData.message || ''),
        photoUrl: decryptedData.photoUrl || null,
        isAnonymous: Boolean(decryptedData.isAnonymous ?? true),
        senderName: sanitizeName(decryptedData.senderName || ''),
        deliveryMethod: data.deliveryMethod === 'admin' ? 'admin' : 'self',
        recipientInstagram: sanitizeInstagram(data.recipientInstagram || ''),
        senderEmail: sanitizeEmail(data.senderEmail || ''),
        status: data.status || 'delivered',
        createdAt: data.createdAt,
        viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
        photo: null,
        firstViewedAt: data.firstViewedAt || null,
        wasViewedBefore: data.viewCount > 0,
      };
    } catch (error) {
      console.error('Failed to decrypt legacy note:', error);
      return {
        id: docSnap.id,
        recipientName: '[Legacy Encrypted Note]',
        vibe: data.vibe ? sanitizeString(data.vibe) : '',
        song: null,
        songData: null,
        message: '[This note was encrypted with an old system and could not be decrypted.]',
        photoUrl: null,
        isAnonymous: true,
        senderName: '',
        deliveryMethod: data.deliveryMethod === 'admin' ? 'admin' : 'self',
        recipientInstagram: '',
        senderEmail: '',
        status: data.status || 'delivered',
        createdAt: data.createdAt,
        viewCount: 0,
        photo: null,
        firstViewedAt: null,
        wasViewedBefore: false,
      };
    }
  }

  return {
    id: docSnap.id,
    recipientName: sanitizeName(data.recipientName || ''),
    vibe: data.vibe ? sanitizeString(data.vibe) : '',
    song: data.song || null,
    songData: data.songData || null,
    message: sanitizeMessage(data.message || ''),
    photoUrl: data.photoUrl || null,
    isAnonymous: Boolean(data.isAnonymous ?? true),
    senderName: sanitizeName(data.senderName || ''),
    deliveryMethod: data.deliveryMethod === 'admin' ? 'admin' : 'self',
    recipientInstagram: sanitizeInstagram(data.recipientInstagram || ''),
    senderEmail: sanitizeEmail(data.senderEmail || ''),
    status: data.status || 'delivered',
    createdAt: data.createdAt,
    viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
    photo: null,
    firstViewedAt: data.firstViewedAt || null,
    wasViewedBefore: data.viewCount > 0,
  };
};

// Increment view count and track first view (for privacy alerts)
export const incrementViews = async (id: string): Promise<{ isFirstView: boolean; previousViewCount: number }> => {
  try {
    const docRef = doc(collection(db, 'notes'), id);
    
    // First, get current view count to check if this is first view
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { isFirstView: true, previousViewCount: 0 };
    }
    
    const data = docSnap.data();
    const previousViewCount = data.viewCount || 0;
    const isFirstView = previousViewCount === 0;
    
    // Update with atomic increment
    const updateData: any = {
      views: increment(1),
      viewCount: increment(1),
      lastViewedAt: serverTimestamp()
    };
    
    // Record first view info for privacy tracking
    if (isFirstView) {
      updateData.firstViewedAt = serverTimestamp();
      // Store minimal browser info (not IP - that's server-side only)
      updateData.firstViewerInfo = {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : 'unknown',
        timestamp: new Date().toISOString(),
      };
    }
    
    await updateDoc(docRef, updateData);
    
    return { isFirstView, previousViewCount };
  } catch (error) {
    console.error('Failed to increment views:', error);
    return { isFirstView: true, previousViewCount: 0 };
  }
};

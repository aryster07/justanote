import { 
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export interface DeliveryRequest {
  id: string;
  recipientName: string;
  recipientInstagram: string;
  senderEmail: string;
  senderName: string;
  isAnonymous: boolean;
  message: string;
  status: 'pending' | 'delivered';
  createdAt: Timestamp | null;
  deliveredAt: Timestamp | null;
  viewedAt: Timestamp | null;
  viewCount: number;
  deliveryMethod?: string;
  shareKey?: string;
  encryptedLogistics?: {
    senderEmail: string;
    recipientInstagram: string;
  } | null;
}

const NOTES_COLLECTION = 'notes';

/**
 * Debug: Get ALL notes to see what's in the database
 */
export async function getAllNotes(): Promise<any[]> {
  try {
    const notesRef = collection(db, NOTES_COLLECTION);
    const snapshot = await getDocs(notesRef);

    console.log('Total notes in DB:', snapshot.docs.length);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Document:', doc.id, 'deliveryMethod:', data.deliveryMethod, data);
      return {
        id: doc.id,
        ...data
      };
    });
  } catch (error) {
    console.error('Error fetching all notes:', error);
    return [];
  }
}

/**
 * Get all delivery requests (notes with deliveryMethod = 'admin')
 */
export async function getAllDeliveryRequests(): Promise<DeliveryRequest[]> {
  try {
    const notesRef = collection(db, NOTES_COLLECTION);

    // Try with composite query first
    try {
      const q = query(
        notesRef,
        where('deliveryMethod', '==', 'admin'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

      console.log('Found delivery requests:', snapshot.docs.length);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        recipientName: doc.data().recipientName || '',
        recipientInstagram: doc.data().recipientInstagram || '',
        senderEmail: doc.data().senderEmail || '',
        senderName: doc.data().senderName || '',
        isAnonymous: doc.data().isAnonymous || false,
        message: doc.data().message || '',
        status: doc.data().status || 'pending',
        createdAt: doc.data().createdAt || null,
        deliveredAt: doc.data().deliveredAt || null,
        viewedAt: doc.data().viewedAt || null,
        viewCount: doc.data().viewCount || 0,
        shareKey: doc.data().shareKey || '',
        // Include encrypted logistics for admin decryption
        encryptedLogistics: doc.data().encryptedLogistics || null,
      }));
    } catch (indexError: any) {
      // If index doesn't exist, fall back to simpler query
      console.warn('Composite index may be missing, falling back to simple query:', indexError.message);

      // Fallback: get all notes and filter client-side
      const q = query(notesRef, where('deliveryMethod', '==', 'admin'));
      const snapshot = await getDocs(q);

      console.log('Found delivery requests (fallback):', snapshot.docs.length);

      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        recipientName: doc.data().recipientName || '',
        recipientInstagram: doc.data().recipientInstagram || '',
        senderEmail: doc.data().senderEmail || '',
        senderName: doc.data().senderName || '',
        isAnonymous: doc.data().isAnonymous || false,
        message: doc.data().message || '',
        status: doc.data().status || 'pending',
        createdAt: doc.data().createdAt || null,
        deliveredAt: doc.data().deliveredAt || null,
        viewedAt: doc.data().viewedAt || null,
        viewCount: doc.data().viewCount || 0,
        shareKey: doc.data().shareKey || '',
        // Include encrypted logistics for admin decryption
        encryptedLogistics: doc.data().encryptedLogistics || null,
      }));

      // Sort client-side
      return requests.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
    }
  } catch (error) {
    console.error('Error fetching delivery requests:', error);
    return [];
  }
}

/**
 * Mark a note as delivered
 */
export async function markAsDelivered(noteId: string): Promise<boolean> {
  try {
    const docRef = doc(db, NOTES_COLLECTION, noteId);
    await updateDoc(docRef, {
      status: 'delivered',
      deliveredAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error marking as delivered:', error);
    return false;
  }
}

/**
 * Record when a note is viewed (called from ViewNote)
 */
export async function recordView(noteId: string): Promise<boolean> {
  try {
    const docRef = doc(db, NOTES_COLLECTION, noteId);
    await updateDoc(docRef, {
      viewedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error recording view:', error);
    return false;
  }
}

/**
 * Get sender email for a note (to notify when viewed)
 */
export async function getSenderEmail(noteId: string): Promise<string | null> {
  try {
    const { getNote } = await import('../firebase');
    const note = await getNote(noteId);
    return note?.senderEmail || null;
  } catch (error) {
    console.error('Error getting sender email:', error);
    return null;
  }
}

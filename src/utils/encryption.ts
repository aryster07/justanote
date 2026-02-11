// Client-side encryption utilities using Web Crypto API
// The encryption key is stored in the URL fragment (after #) which is never sent to servers

// Generate a random encryption key
export const generateEncryptionKey = (): string => {
  const array = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Convert base64url key to CryptoKey
const importKey = async (keyString: string): Promise<CryptoKey> => {
  // Convert base64url back to base64
  const base64 = keyString.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const keyBytes = Uint8Array.from(atob(base64 + padding), c => c.charCodeAt(0));
  
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt data
export const encryptData = async (data: string, keyString: string): Promise<string> => {
  try {
    const key = await importKey(keyString);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const encodedData = new TextEncoder().encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );
    
    // Combine IV + encrypted data and encode as base64url
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt data
export const decryptData = async (encryptedData: string, keyString: string): Promise<string> => {
  try {
    const key = await importKey(keyString);
    
    // Convert base64url back to bytes
    const base64 = encryptedData.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const combined = Uint8Array.from(atob(base64 + padding), c => c.charCodeAt(0));
    
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
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - invalid key or corrupted data');
  }
};

// Encrypt note data object (message, senderName, recipientName)
export const encryptNoteData = async (
  data: {
    message: string;
    senderName?: string;
    recipientName: string;
    song?: any;
    photoUrl?: string;
  },
  keyString: string
): Promise<string> => {
  const jsonString = JSON.stringify(data);
  return encryptData(jsonString, keyString);
};

// Decrypt note data object
export const decryptNoteData = async (
  encryptedData: string,
  keyString: string
): Promise<{
  message: string;
  senderName?: string;
  recipientName: string;
  song?: any;
  photoUrl?: string;
}> => {
  const jsonString = await decryptData(encryptedData, keyString);
  return JSON.parse(jsonString);
};

import CryptoJS from 'crypto-js';

// Admin secret for logistics encryption
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'admin-logistics-key-change-this';

/**
 * Encrypts content meant ONLY for the recipient (Message, Photo, Song).
 * @param data The data object to encrypt
 * @param key The unique key generated for this specific note (sent in URL hash)
 */
export const encryptContent = (data: any, key: string) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

/**
 * Decrypts content using the share key.
 */
export const decryptContent = (ciphertext: string, key: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (e) {
    console.error('Decryption failed', e);
    return null;
  }
};

/**
 * Encrypts logistics data (Emails, Names) so only Admin app can use them.
 */
export const encryptLogistics = (data: string) => {
  if (!data) return '';
  return CryptoJS.AES.encrypt(data, ADMIN_SECRET).toString();
};

/**
 * Decrypts logistics data.
 */
export const decryptLogistics = (ciphertext: string) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ADMIN_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    // If it's already plain text (legacy data), return as is
    return ciphertext;
  }
};

/**
 * Generates a random key for the share link
 */
export const generateShareKey = () => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

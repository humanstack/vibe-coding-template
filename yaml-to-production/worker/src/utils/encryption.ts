/**
 * Encryption utilities for secure API key storage
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Convert a hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Import encryption key from hex string
 */
async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyData = hexToBytes(keyHex);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string value
 * Returns { encrypted: string, iv: string } both as hex
 */
export async function encrypt(plaintext: string, encryptionKeyHex: string): Promise<{
  encrypted: string;
  iv: string;
}> {
  const key = await importKey(encryptionKeyHex);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encode plaintext to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  return {
    encrypted: bytesToHex(new Uint8Array(encrypted)),
    iv: bytesToHex(iv)
  };
}

/**
 * Decrypt an encrypted value
 * Takes hex strings for encrypted data and IV
 */
export async function decrypt(encryptedHex: string, ivHex: string, encryptionKeyHex: string): Promise<string> {
  const key = await importKey(encryptionKeyHex);
  const encrypted = hexToBytes(encryptedHex);
  const iv = hexToBytes(ivHex);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generate a new encryption key
 * Returns hex string of 256-bit key
 */
export async function generateKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  ) as CryptoKey;

  const exported = await crypto.subtle.exportKey('raw', key) as ArrayBuffer;
  return bytesToHex(new Uint8Array(exported));
}

/**
 * Hash a value using SHA-256
 * Useful for creating deterministic keys or verification
 */
export async function hash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Mask a secret for display (show first/last 4 chars)
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '*'.repeat(secret.length);
  }
  return `${secret.slice(0, 4)}${'*'.repeat(secret.length - 8)}${secret.slice(-4)}`;
}

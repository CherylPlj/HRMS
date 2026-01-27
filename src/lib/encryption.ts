import crypto from 'crypto';

/**
 * AES-256-GCM Encryption Service
 * 
 * Uses AES-256 in GCM mode for authenticated encryption
 * GCM provides both confidentiality and authenticity
 * 
 * Environment Variable Required:
 * - ENCRYPTION_KEY: 32-byte (256-bit) key as base64 or hex string
 *   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits authentication tag
const SALT_LENGTH = 32; // 256 bits for key derivation

/**
 * Get encryption key from environment variable
 * Falls back to a default key in development (NOT for production)
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  
  if (!keyString) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }
    // Development fallback - DO NOT USE IN PRODUCTION
    console.warn('⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY in production!');
    return Buffer.from('default-dev-key-32-bytes-long!!', 'utf8');
  }

  // Try to decode as base64 first, then hex, then use as-is
  try {
    return Buffer.from(keyString, 'base64');
  } catch {
    try {
      return Buffer.from(keyString, 'hex');
    } catch {
      // If neither works, use as UTF-8 (not recommended)
      return Buffer.from(keyString, 'utf8');
    }
  }
}

/**
 * Derive a key from the master key using PBKDF2
 * This allows us to use different keys for different data types
 */
function deriveKey(masterKey: Buffer, salt: Buffer, purpose: string = 'default'): Buffer {
  const purposeBuffer = Buffer.from(purpose, 'utf8');
  const combinedSalt = Buffer.concat([salt, purposeBuffer]);
  
  return crypto.pbkdf2Sync(
    masterKey,
    combinedSalt,
    100000, // 100k iterations
    32, // 32 bytes = 256 bits
    'sha256'
  );
}

/**
 * Encrypt a string value using AES-256-GCM
 * 
 * @param plaintext - The value to encrypt
 * @param purpose - Optional purpose identifier for key derivation (e.g., 'medical', 'government', 'salary')
 * @returns Encrypted string in format: iv:authTag:encryptedData (all base64)
 */
export function encrypt(plaintext: string | null | undefined, purpose: string = 'default'): string | null {
  // Handle null/undefined/empty values
  if (!plaintext || plaintext.trim() === '') {
    return null;
  }

  try {
    const masterKey = getEncryptionKey();
    
    // Generate random IV and salt for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derive key for this specific purpose
    const key = deriveKey(masterKey, salt, purpose);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return format: salt:iv:authTag:encryptedData (all base64)
    return [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted
    ].join(':');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string value using AES-256-GCM
 * 
 * @param ciphertext - The encrypted string in format: salt:iv:authTag:encryptedData
 * @param purpose - Optional purpose identifier for key derivation (must match encryption purpose)
 * @returns Decrypted plaintext string or null if input is null/empty
 */
export function decrypt(ciphertext: string | null | undefined, purpose: string = 'default'): string | null {
  // Handle null/undefined/empty values
  if (!ciphertext || ciphertext.trim() === '') {
    return null;
  }

  // Check if already decrypted (for backward compatibility during migration)
  // If it doesn't contain colons, assume it's plaintext
  if (!ciphertext.includes(':')) {
    console.warn('⚠️  Attempting to decrypt what appears to be plaintext. Data may not be encrypted yet.');
    return ciphertext;
  }

  try {
    const parts = ciphertext.split(':');
    
    // Should have 4 parts: salt, iv, authTag, encryptedData
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [saltBase64, ivBase64, authTagBase64, encryptedData] = parts;
    
    const masterKey = getEncryptionKey();
    const salt = Buffer.from(saltBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    // Derive key for this specific purpose (must match encryption)
    const key = deriveKey(masterKey, salt, purpose);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // If decryption fails, it might be plaintext (during migration)
    // Return null to indicate decryption failure
    throw new Error('Failed to decrypt data. Data may be corrupted or encrypted with different key.');
  }
}

/**
 * Encrypt an object's sensitive fields
 * 
 * @param obj - Object to encrypt
 * @param fields - Array of field names to encrypt
 * @param purpose - Purpose identifier for key derivation
 * @returns Object with specified fields encrypted
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: readonly (keyof T)[],
  purpose: string = 'default'
): T {
  const encrypted = { ...obj };
  
  for (const field of fields) {
    if (field in encrypted && encrypted[field] != null) {
      encrypted[field] = encrypt(String(encrypted[field]), purpose) as any;
    }
  }
  
  return encrypted;
}

/**
 * Decrypt an object's sensitive fields
 * 
 * @param obj - Object to decrypt
 * @param fields - Array of field names to decrypt
 * @param purpose - Purpose identifier for key derivation
 * @returns Object with specified fields decrypted
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: readonly (keyof T)[],
  purpose: string = 'default'
): T {
  const decrypted = { ...obj };
  
  for (const field of fields) {
    if (field in decrypted && decrypted[field] != null) {
      try {
        const value = String(decrypted[field]);
        // Attempt decryption if it looks encrypted (has colons, indicating encrypted format)
        // This handles both 4-part (new) and potentially 3-part (old) formats
        if (value.includes(':')) {
          // Check if it's the new 4-part format
          if (isEncrypted(value)) {
            const decryptedValue = decrypt(value, purpose);
            if (decryptedValue !== null) {
              decrypted[field] = decryptedValue as any;
            }
          } else {
            // Might be old format or corrupted - log warning but keep original
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Field ${String(field)} appears encrypted but doesn't match expected format (4 parts). Value may need re-encryption.`);
            }
            // Keep original value - it's encrypted but in an unsupported format
          }
        }
        // If no colons, assume plaintext and keep original value
      } catch (error) {
        // If decryption fails, keep original value (might be plaintext during migration or old format)
        // Only log in development to avoid noise in production
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Failed to decrypt field ${String(field)}:`, error);
        }
      }
    }
  }
  
  return decrypted;
}

/**
 * Check if a string appears to be encrypted
 * Encrypted strings have format: salt:iv:authTag:encryptedData (4 parts separated by colons)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 4;
}

/**
 * Generate a new encryption key (for setup/migration)
 * Returns a base64-encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

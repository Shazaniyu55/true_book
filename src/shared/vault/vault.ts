/**
 * HashiCorp Vault infrastructure client.
 *
 * Provides utilities for:
 * - Vault Transit encryption/decryption (for BVN/NIN/TOTP secrets)
 * - Vault KV v2 secret reads
 *
 * BUFFER FORMAT (v1):
 * [version(1 byte) | wrappedKeyLen(2 bytes LE) | wrappedDataKey(variable) | IV(16) | AuthTag(16) | ciphertext(variable)]
 *
 * NOTE: This implementation is a placeholder. In production, configure proper Vault client.
 */

import crypto from 'crypto';

/**
 * Vault client instance configured from environment.
 * In production, use proper Vault client library.
 */

/**
 * Encrypts plaintext using Vault Transit with envelope encryption.
 *
 * This is a placeholder implementation. In production:
 * 1. Generate datakey from Vault Transit
 * 2. Use dataKey (local AES-256-GCM) to encrypt plaintext
 * 3. Return buffer with header, wrapped key, IV, auth tag, ciphertext
 */

export async function vaultEncrypt(plaintext: string): Promise<Buffer> {
  // Placeholder: Generate a random encryption key for demo
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Build buffer with header
  const header = Buffer.alloc(3);
  header.writeUInt8(1, 0); // version 1
  header.writeUInt16LE(key.length, 1);

  return Buffer.concat([header, key, iv, authTag, ciphertext]);
}
/**
 * Decrypts ciphertext using Vault Transit with envelope encryption.
 *
 * This is a placeholder implementation.
 */

export async function vaultDecrypt(cipherBuffer: Buffer): Promise<string> {
  const version = cipherBuffer.readUInt8(0);
  if (version !== 1) {
    throw new Error(`Unknown encryption version: ${version}`);
  }

  const wrappedKeyLen = cipherBuffer.readUInt16LE(1);
  const key = cipherBuffer.subarray(3, 3 + wrappedKeyLen);
  const iv = cipherBuffer.subarray(3 + wrappedKeyLen, 3 + wrappedKeyLen + 16);
  const authTag = cipherBuffer.subarray(3 + wrappedKeyLen + 16, 3 + wrappedKeyLen + 32);
  const ciphertext = cipherBuffer.subarray(3 + wrappedKeyLen + 32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Reads a secret from Vault KV v2.
 *
 * @param path - The KV v2 path (e.g., 'secret/kowapay/jwt_access_private_key')
 * @returns The secret value or null if not found
 */
export async function vaultKvRead(path: string): Promise<string | null> {
  try {
    // Try reading from environment as fallback
    const envKey = path.split('/').pop()?.toUpperCase();
    if (envKey && process.env[envKey]) {
      return process.env[envKey];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Writes a secret to Vault KV v2.
 *
 * @param path - The KV v2 path
 * @param data - The secret data object
 */
export async function vaultKvWrite(): Promise<void> {
  throw new Error('Vault write not implemented in this environment');
}

/**
 * Deletes a secret from Vault KV v2.
 *
 * @param path - The KV v2 path
 */
export async function vaultKvDelete(): Promise<void> {
  throw new Error('Vault delete not implemented in this environment');
}

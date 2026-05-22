/**
 * Column-level encryption utilities for PII fields.
 *
 * All PII fields (phone, email, name) are stored as Bytes (PostgreSQL bytea) encrypted with
 * AES-256-GCM using a data key derived from HashiCorp Vault Transit (VAULT_TRANSIT_COLUMN_KEY).
 *
 * Vault Transit provides envelope encryption with built-in key versioning and rotation.
 * One transit key per sensitivity tier ensures limited blast radius.
 *
 * Indexed lookups use a companion SHA-256 hash column (e.g. phoneHash, emailHash) so that
 * WHERE clauses never touch plaintext. Raw IPs and user-agents in AuditLog are also hashed.
 *
 * Usage pattern:
 *   CREATE: { phoneEncrypted: await encryptColumn(phone), phoneHash: hashForLookup(phone) }
 *   LOOKUP: db.select().from(users).where(eq(users.phoneHash, hashForLookup(inputPhone))
 *   READ:   const phone = await decryptColumn(user.phoneEncrypted)
 */

import crypto from 'crypto';
import { vaultEncrypt, vaultDecrypt } from './vault';

/**
 * Key ID for column-level encryption.
 * Uses VAULT_TRANSIT_COLUMN_KEY for PII (phone, email, name).
 */
// const KEY_ID = () => process.env.VAULT_TRANSIT_COLUMN_KEY;

/**
 * Encrypts a plaintext string → Buffer stored as Postgres bytea.
 *
 * Uses Vault Transit envelope encryption:
 * - Vault generates a data key (via datakey API)
 * - Data key encrypts plaintext locally with AES-256-GCM
 * - Wrapped data key is prepended to ciphertext
 *
 * Layout: [version(1 byte)] [wrappedKeyLen(2 bytes)] [wrappedDataKey(variable)] [IV(16)] [AuthTag(16)] [ciphertext]
 *
 * @param plaintext - The plaintext string to encrypt
 * @returns Buffer ready for Postgres bytea storage
 */
export async function encryptColumn(plaintext: string): Promise<Buffer> {
  return vaultEncrypt(plaintext);
}

/**
 * Decrypts a bytea Buffer → plaintext string.
 *
 * @param cipherBuffer - The encrypted buffer from Postgres
 * @returns Decrypted plaintext
 */
export async function decryptColumn(cipherBuffer: Buffer): Promise<string> {
  return vaultDecrypt(cipherBuffer);
}

/**
 * Nullable variant — returns null if value is null/undefined.
 */
export async function encryptNullable(value: string | null | undefined): Promise<Buffer | null> {
  if (value === null || value === undefined) {
    return null;
  }
  return encryptColumn(value);
}

/**
 * Nullable variant — returns null if buffer is null/undefined.
 */
export async function decryptNullable(buffer: Buffer | null | undefined): Promise<string | null> {
  if (buffer === null || buffer === undefined) {
    return null;
  }
  return decryptColumn(buffer);
}

/**
 * Deterministic SHA-256 hash for indexed lookups (email, phone searches).
 *
 * This is NOT encryption — it's a one-way hash used only for WHERE clauses.
 * The same input always produces the same hash, enabling exact-match lookups.
 *
 * @param value - The value to hash (phone, email, etc.)
 * @returns SHA-256 hex string (64 characters)
 */
export function hashForLookup(value: string): string {
  const normalized = value.normalize('NFC').toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Hash an IP address before storing in AuditLog.
 *
 * Raw IPs are never stored — only their SHA-256 hash.
 * This enables deduplication and pattern detection without exposing IPs.
 *
 * @param ip - The IP address (v4 or v6)
 * @returns SHA-256 hex string
 */
export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Hash a user agent string for analytics.
 *
 * @param userAgent - The user agent string
 * @returns SHA-256 hex string
 */
export function hashUserAgent(userAgent: string): string {
  return crypto.createHash('sha256').update(userAgent).digest('hex');
}

/**
 * Hash a device fingerprint for session tracking.
 *
 * Combines multiple signals to create a unique device identifier.
 *
 * @param signals - Array of signals (UA, IP, screen resolution, etc.)
 * @returns SHA-256 hex string
 */
export function hashDeviceFingerprint(...signals: string[]): string {
  // Join with null bytes to prevent concatenation ambiguity
  const combined = signals.join('\x00');
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
}

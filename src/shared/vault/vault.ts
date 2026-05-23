/**
 * vault.ts — HashiCorp Vault client with AES-256-GCM fallback.
 *
 * MODES:
 *   VAULT_ENABLED=true  → Uses real Vault Transit (envelope encryption).
 *                          Requires VAULT_ADDR, VAULT_TOKEN, VAULT_TRANSIT_KEY_NAME.
 *   VAULT_ENABLED=false → Local AES-256-GCM using VAULT_LOCAL_KEY (32-byte hex).
 *                          Safe for development/staging; never use in production.
 *
 * BUFFER FORMAT v1 (local mode):
 *   [version(1)] [keyLen(2 LE)] [key(32)] [iv(16)] [authTag(16)] [ciphertext(N)]
 *
 * BUFFER FORMAT v2 (vault mode):
 *   [version(1)] [wrappedKeyLen(2 LE)] [wrappedKey(var)] [iv(16)] [authTag(16)] [ciphertext(N)]
 */

import crypto from 'crypto';
import https from 'https';
import http from 'http';

const VERSION_LOCAL = 0x01;
const VERSION_VAULT = 0x02;

// ─── Config ──────────────────────────────────────────────────────────────────

function vaultEnabled(): boolean {
  return process.env.VAULT_ENABLED === 'true';
}

function vaultAddr(): string {
  return (process.env.VAULT_ADDR || 'http://127.0.0.1:8200').replace(/\/$/, '');
}

function vaultToken(): string {
  const token = process.env.VAULT_TOKEN;
  if (!token) throw new Error('VAULT_TOKEN is not set');
  return token;
}

function transitKeyName(): string {
  return process.env.VAULT_TRANSIT_KEY_NAME || 'tru-booker-data-key';
}

function transitColumnKey(): string {
  return process.env.VAULT_TRANSIT_COLUMN_KEY || transitKeyName();
}

function localKey(): Buffer {
  const hex = process.env.VAULT_LOCAL_KEY;
  if (!hex || hex.length !== 64)
    throw new Error('VAULT_LOCAL_KEY must be a 64-character hex string (32 bytes)');
  return Buffer.from(hex, 'hex');
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function vaultRequest<T>(
  method: string,
  path: string,
  body?: object,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(vaultAddr() + path);
    const payload = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'X-Vault-Token': vaultToken(),
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const proto = url.protocol === 'https:' ? https : http;
    const req = proto.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Vault ${method} ${path} → ${res.statusCode}: ${raw}`));
          return;
        }
        try {
          resolve(JSON.parse(raw) as T);
        } catch {
          resolve(raw as unknown as T);
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Vault Transit helpers ────────────────────────────────────────────────────

interface DataKeyResponse {
  data: { plaintext: string; ciphertext: string };
}

interface DecryptResponse {
  data: { plaintext: string };
}

async function generateDataKey(): Promise<{ plaintext: Buffer; ciphertext: string }> {
  const res = await vaultRequest<DataKeyResponse>(
    'POST',
    `/v1/transit/datakey/plaintext/${transitKeyName()}`,
    { bits: 256 },
  );
  return {
    plaintext: Buffer.from(res.data.plaintext, 'base64'),
    ciphertext: res.data.ciphertext,
  };
}

async function decryptDataKey(wrappedKey: string): Promise<Buffer> {
  const res = await vaultRequest<DecryptResponse>(
    'POST',
    `/v1/transit/decrypt/${transitColumnKey()}`,
    { ciphertext: wrappedKey },
  );
  return Buffer.from(res.data.plaintext, 'base64');
}

// ─── Core encrypt / decrypt ──────────────────────────────────────────────────

/** Encrypts plaintext → Buffer ready for Postgres bytea storage */
export async function vaultEncrypt(plaintext: string): Promise<Buffer> {
  const iv = crypto.randomBytes(16);
  let key: Buffer;
  let wrappedKey: Buffer;
  let version: number;

  if (vaultEnabled()) {
    const dk = await generateDataKey();
    key = dk.plaintext;
    wrappedKey = Buffer.from(dk.ciphertext, 'utf8');
    version = VERSION_VAULT;
  } else {
    key = localKey();
    wrappedKey = key; // In local mode we store the raw key (dev only)
    version = VERSION_LOCAL;
  }

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const header = Buffer.alloc(3);
  header.writeUInt8(version, 0);
  header.writeUInt16LE(wrappedKey.length, 1);

  return Buffer.concat([header, wrappedKey, iv, authTag, ciphertext]);
}

/** Decrypts a bytea Buffer → plaintext string */
export async function vaultDecrypt(cipherBuffer: Buffer): Promise<string> {
  const version = cipherBuffer.readUInt8(0);
  const wrappedKeyLen = cipherBuffer.readUInt16LE(1);

  const wrappedKeyBytes = cipherBuffer.subarray(3, 3 + wrappedKeyLen);
  const iv = cipherBuffer.subarray(3 + wrappedKeyLen, 3 + wrappedKeyLen + 16);
  const authTag = cipherBuffer.subarray(3 + wrappedKeyLen + 16, 3 + wrappedKeyLen + 32);
  const ciphertext = cipherBuffer.subarray(3 + wrappedKeyLen + 32);

  let key: Buffer;

  if (version === VERSION_VAULT) {
    key = await decryptDataKey(wrappedKeyBytes.toString('utf8'));
  } else if (version === VERSION_LOCAL) {
    key = vaultEnabled() ? localKey() : wrappedKeyBytes; // raw stored key in local mode
  } else {
    throw new Error(`Unknown encryption version: ${version}`);
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// ─── KV v2 ──────────────────────────────────────────────────────────────────

interface KvReadResponse {
  data: { data: Record<string, string> };
}

export async function vaultKvRead(path: string): Promise<string | null> {
  // Dev fallback: read from env using the last path segment
  if (!vaultEnabled()) {
    const envKey = path.split('/').pop()?.toUpperCase().replace(/-/g, '_');
    if (envKey && process.env[envKey]) return process.env[envKey];
    return null;
  }

  try {
    // Convert secret/foo/bar → secret/data/foo/bar for KV v2
    const kvPath = path.replace(/^([^/]+)\//, '$1/data/');
    const res = await vaultRequest<KvReadResponse>('GET', `/v1/${kvPath}`);
    const key = path.split('/').pop();
    return res?.data?.data?.[key] ?? null;
  } catch {
    return null;
  }
}

export async function vaultKvWrite(path: string, data: Record<string, string>): Promise<void> {
  if (!vaultEnabled()) throw new Error('Vault is not enabled in this environment');
  const kvPath = path.replace(/^([^/]+)\//, '$1/data/');
  await vaultRequest('POST', `/v1/${kvPath}`, { data });
}

export async function vaultKvDelete(path: string): Promise<void> {
  if (!vaultEnabled()) throw new Error('Vault is not enabled in this environment');
  const kvPath = path.replace(/^([^/]+)\//, '$1/metadata/');
  await vaultRequest('DELETE', `/v1/${kvPath}`);
}

// ─── Health check ────────────────────────────────────────────────────────────

export async function vaultHealthCheck(): Promise<{ healthy: boolean; mode: string }> {
  if (!vaultEnabled()) return { healthy: true, mode: 'local-aes-256-gcm' };

  try {
    await vaultRequest('GET', '/v1/sys/health');
    return { healthy: true, mode: 'vault-transit' };
  } catch {
    return { healthy: false, mode: 'vault-transit' };
  }
}

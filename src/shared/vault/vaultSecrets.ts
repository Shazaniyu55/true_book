/**
 * vaultSecrets.ts — loads secrets from Vault KV v2 into process.env at bootstrap.
 *
 * Called ONCE in main.ts before NestFactory.create().
 * In local/dev mode (VAULT_ENABLED=false) it reads env vars as-is.
 */

import { vaultKvRead } from './vault';

const KV_PATHS: Record<string, string> = {
  // Auth
  JWT_ACCESS_SECRET: 'secret/tru-booker/jwt_access_secret',
  JWT_REFRESH_SECRET: 'secret/tru-booker/jwt_refresh_secret',
  JWT_ACCESS_EXPIRES_IN: 'secret/tru-booker/jwt_access_expires_in',
  JWT_REFRESH_EXPIRES_IN: 'secret/tru-booker/jwt_refresh_expires_in',

  // Payment
  PAYSTACK_SECRET_KEY: 'secret/tru-booker/paystack_secret_key',
  PAYSTACK_PUBLIC_KEY: 'secret/tru-booker/paystack_public_key',
  FLW_SECRET_KEY: 'secret/tru-booker/flw_secret_key',
  FLW_PUBLIC_KEY: 'secret/tru-booker/flw_public_key',
  FLW_ENCRYPTION_KEY: 'secret/tru-booker/flw_encryption_key',

  // KYC
  DOJAH_APP_ID: 'secret/tru-booker/dojah_app_id',
  DOJAH_PRIVATE_KEY: 'secret/tru-booker/dojah_private_key',
  DOJAH_PUBLIC_KEY: 'secret/tru-booker/dojah_public_key',

  // Kill switch
  KILL_SWITCH_DEACTIVATION_CODE: 'secret/tru-booker/kill_switch_deactivation_code',
  KILL_SWITCH_2FA_APPROVAL_CODE: 'secret/tru-booker/kill_switch_2fa_approval_code',

  // Encryption
  VAULT_LOCAL_KEY: 'secret/tru-booker/vault_local_key',
  ENCRYPTION_KEY: 'secret/tru-booker/encryption_key',
  ENCRYPTION_IV: 'secret/tru-booker/encryption_iv',

  // Notifications
  TERMII_API_KEY: 'secret/tru-booker/termii_api_key',

  // Cloud
  CLOUDINARY_API_SECRET: 'secret/tru-booker/cloudinary_api_secret',
  S3_ACCESS_SECRET: 'secret/tru-booker/s3_access_secret',

  // Sentry
  SENTRY_DSN: 'secret/tru-booker/sentry_dsn',
};

/**
 * In Vault mode: loads all secrets. Exits if any required secret is missing.
 * In local mode: reads from process.env (no-op if already set).
 */
export async function loadSecretsFromVault(): Promise<void> {
  if (process.env.VAULT_ENABLED !== 'true') {
    console.log(' Vault disabled — using environment variables directly');
    return;
  }

  console.log('  Loading secrets from HashiCorp Vault...');
  const errors: string[] = [];

  for (const [envKey, kvPath] of Object.entries(KV_PATHS)) {
    try {
      const value = await vaultKvRead(kvPath);
      if (!value) {
        errors.push(`Missing Vault secret at ${kvPath} (env: ${envKey})`);
        continue;
      }
      process.env[envKey] = value;
    } catch (err) {
      errors.push(`Failed to load ${kvPath}: ${(err as Error).message}`);
    }
  }

  if (errors.length > 0) {
    console.error('FATAL — Vault secret loading failed:\n' + errors.join('\n'));
    process.exit(1);
  }

  console.log(`✓  Loaded ${Object.keys(KV_PATHS).length} secrets from Vault`);
}

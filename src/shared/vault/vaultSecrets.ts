/**
 * Vault secrets loader - loads all secrets from Vault KV v2 at startup.
 *
 * This function is called ONCE in server.ts before env validation.
 * It reads all secrets from Vault KV v2 and populates process.env.
 *
 * If Vault is unreachable, the process exits immediately with a clear error.
 *
 * VAULT KV v2 SECRET PATHS (standard layout):
 *   secret/kowapay/jwt_access_private_key
 *   secret/kowapay/jwt_access_public_key
 *   secret/kowapay/jwt_refresh_secret
 *   secret/kowapay/vfd/consumer_key
 *   secret/kowapay/vfd/consumer_secret
 *   secret/kowapay/ai/anthropic_api_key
 *   secret/kowapay/kill_switch/deactivation_code
 *   secret/kowapay/kill_switch/2fa_approval_code
 *   secret/kowapay/s3/kms_key_id
 *   secret/kowapay/termii/api_key
 *   secret/kowapay/smile_identity/api_key
 *   secret/kowapay/sentry/dsn
 *   secret/kowapay/seed_admin_email
 *   secret/kowapay/incident/webhook
 *   secret/kowapay/slack/incident_webhook
 *   secret/kowapay/pagerduty/routing_key
 */

import { vaultKvRead } from './vault';

/**
 * Mapping of environment variable names to Vault KV v2 paths.
 */
const KV_PATHS: Record<string, string> = {
  JWT_ACCESS_PRIVATE_KEY: 'secret/kowapay/jwt_access_private_key',
  JWT_ACCESS_PUBLIC_KEY: 'secret/kowapay/jwt_access_public_key',
  JWT_REFRESH_SECRET: 'secret/kowapay/jwt_refresh_secret',
  VFD_CONSUMER_KEY: 'secret/kowapay/vfd/consumer_key',
  VFD_CONSUMER_SECRET: 'secret/kowapay/vfd/consumer_secret',
  ANTHROPIC_API_KEY: 'secret/kowapay/ai/anthropic_api_key',
  KILL_SWITCH_DEACTIVATION_CODE: 'secret/kowapay/kill_switch/deactivation_code',
  KILL_SWITCH_2FA_APPROVAL_CODE: 'secret/kowapay/kill_switch/2fa_approval_code',
  EXPORT_S3_KMS_KEY_ID: 'secret/kowapay/s3/kms_key_id',
  TERMII_API_KEY: 'secret/kowapay/termii/api_key',
  SMILE_IDENTITY_API_KEY: 'secret/kowapay/smile_identity/api_key',
  SENTRY_DSN: 'secret/kowapay/sentry/dsn',
  SEED_ADMIN_EMAIL: 'secret/kowapay/seed_admin_email',
  INCIDENT_WEBHOOK: 'secret/kowapay/incident/webhook',
  SLACK_INCIDENT_WEBHOOK: 'secret/kowapay/slack/incident_webhook',
  PAGERDUTY_ROUTING_KEY: 'secret/kowapay/pagerduty/routing_key',
};

/**
 * Loads all secrets from Vault KV v2 and sets them in process.env.
 *
 * This should be called BEFORE the environment validation in server.ts.
 *
 * @throws Process exits with code 1 if Vault is unreachable or secrets are missing.
 */
export async function loadSecretsFromVault(): Promise<void> {
  const errors: string[] = [];

  for (const [envKey, kvPath] of Object.entries(KV_PATHS)) {
    try {
      const value = await vaultKvRead(kvPath);
      if (!value) {
        errors.push(`Missing Vault secret: ${kvPath}`);
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

  console.log('✓ All Vault secrets loaded successfully');
}

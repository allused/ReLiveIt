import { ConfigService } from '@nestjs/config';
import { parseAesKey } from './crypto.util';

const PLACEHOLDER_MARKERS = ['replace-with', 'change-me', 'changeme', '0000000000000000'];

export function isCookieSecure(config: ConfigService): boolean {
  const explicit = config.get<string>('COOKIE_SECURE');
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return config.get('NODE_ENV') === 'production';
}

function looksPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;

  const errors: string[] = [];
  const sessionSecret = env.SESSION_SECRET ?? '';
  const hashSecret = env.INVITATION_TOKEN_HASH_SECRET ?? '';
  const encryptionKey = env.INVITATION_TOKEN_ENCRYPTION_KEY ?? '';
  const frontendUrl = env.FRONTEND_URL ?? '';

  if (sessionSecret.length < 32 || looksPlaceholder(sessionSecret)) {
    errors.push('SESSION_SECRET must be a unique value of at least 32 characters.');
  }
  if (hashSecret.length < 32 || looksPlaceholder(hashSecret)) {
    errors.push('INVITATION_TOKEN_HASH_SECRET must be a unique value of at least 32 characters.');
  }
  try {
    parseAesKey(encryptionKey);
    if (looksPlaceholder(encryptionKey)) {
      errors.push('INVITATION_TOKEN_ENCRYPTION_KEY must not be the example placeholder.');
    }
  } catch {
    errors.push('INVITATION_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes).');
  }

  if (!/^https?:\/\/.+/i.test(frontendUrl)) {
    errors.push('FRONTEND_URL must be the public site origin, for example https://photos.example.com');
  } else if (env.COOKIE_SECURE !== 'false' && !frontendUrl.toLowerCase().startsWith('https://')) {
    errors.push('FRONTEND_URL must use HTTPS when COOKIE_SECURE is on.');
  }

  const adminPassword = env.ADMIN_PASSWORD;
  if (adminPassword && (adminPassword.length < 12 || adminPassword === 'ChangeMe123!')) {
    errors.push('ADMIN_PASSWORD must be at least 12 characters and must not be the demo password.');
  }

  if (errors.length) {
    throw new Error(`Refusing to start in production:\n- ${errors.join('\n- ')}`);
  }
}

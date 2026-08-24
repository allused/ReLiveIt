import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'crypto';

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function hmacSha256(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function parseAesKey(hexKey: string): Buffer {
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) {
    throw new Error('INVITATION_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return key;
}

export function encryptAesGcm(plaintext: string, hexKey: string): string {
  const key = parseAesKey(hexKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptAesGcm(payload: string, hexKey: string): string {
  const key = parseAesKey(hexKey);
  const data = Buffer.from(payload, 'base64url');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

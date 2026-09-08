import { assertProductionConfig } from './runtime-config';

const valid = {
  NODE_ENV: 'production',
  SESSION_SECRET: 'a'.repeat(32),
  INVITATION_TOKEN_HASH_SECRET: 'b'.repeat(32),
  INVITATION_TOKEN_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  FRONTEND_URL: 'https://photos.example.com',
};

describe('assertProductionConfig', () => {
  it('allows a complete production config', () => {
    expect(() => assertProductionConfig(valid)).not.toThrow();
  });

  it('skips checks outside production', () => {
    expect(() =>
      assertProductionConfig({
        NODE_ENV: 'development',
        SESSION_SECRET: 'replace-with-a-long-random-session-secret',
      }),
    ).not.toThrow();
  });

  it('rejects example secrets and http FRONTEND_URL when cookies are secure', () => {
    expect(() =>
      assertProductionConfig({
        ...valid,
        SESSION_SECRET: 'replace-with-a-long-random-session-secret',
        FRONTEND_URL: 'http://photos.example.com',
      }),
    ).toThrow(/SESSION_SECRET|HTTPS/);
  });

  it('allows http FRONTEND_URL for a local dry run', () => {
    expect(() =>
      assertProductionConfig({
        ...valid,
        FRONTEND_URL: 'http://localhost',
        COOKIE_SECURE: 'false',
      }),
    ).not.toThrow();
  });
});

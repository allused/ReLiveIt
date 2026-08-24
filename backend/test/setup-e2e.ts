process.env.DATABASE_URL ??= 'postgresql://reliveit:reliveit@localhost:5433/reliveit_test';
process.env.SESSION_SECRET ??= 'test-session-secret-change-me-please-32';
process.env.INVITATION_TOKEN_HASH_SECRET ??= 'test-invitation-hash-secret';
process.env.INVITATION_TOKEN_ENCRYPTION_KEY ??=
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.FRONTEND_URL ??= 'http://localhost:5173';
process.env.STORAGE_DIR ??= './uploads-test';
process.env.COOKIE_SECURE ??= 'false';
process.env.MAX_GALLERY_PHOTOS ??= '30';
process.env.TOP_N ??= '10';

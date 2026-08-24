import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { COOKIE_NAME, SESSION_TTL_MS } from '../common/constants';

export function setSessionCookie(res: Response, token: string, config: ConfigService) {
  const secure = config.get('COOKIE_SECURE', 'false') === 'true';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: Response, config: ConfigService) {
  const secure = config.get('COOKIE_SECURE', 'false') === 'true';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  });
}

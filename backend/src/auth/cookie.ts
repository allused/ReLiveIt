import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { COOKIE_NAME, SESSION_TTL_MS } from '../common/constants';
import { isCookieSecure } from '../common/runtime-config';

export function setSessionCookie(res: Response, token: string, config: ConfigService) {
  const secure = isCookieSecure(config);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: Response, config: ConfigService) {
  const secure = isCookieSecure(config);
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  });
}

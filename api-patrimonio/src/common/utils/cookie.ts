import { CookieOptions } from 'express';

export function refreshTokenCookieOptions(): CookieOptions {
  const isSecure = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export function clearRefreshTokenCookieOptions(): CookieOptions {
  const isSecure = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
  };
}

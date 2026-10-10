import jwt from 'jsonwebtoken';
import env from '../config/env';
import { Response } from 'express';

export const generateAccessAndRefreshTokens = (userId: string, role?: string) => {
  const payload = { userId, role };
  
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
  
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role?: string };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string; role?: string };
};

export const setAuthCookie = (res: Response, refreshToken: string) => {
  res.cookie(env.AUTH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching the config
  });
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie(env.AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: env.AUTH_COOKIE_SAME_SITE,
  });
};

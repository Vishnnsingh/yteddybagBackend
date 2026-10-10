import type { NextFunction, Request, RequestHandler, Response } from 'express';
import AppError from '../utils/AppError';
import { verifyAccessToken } from '../utils/jwt';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded; // Will set { userId, role } on req.user
      next();
    } catch (err) {
      throw new AppError('Invalid or expired token', 401);
    }
  } catch (err) {
    next(err);
  }
};

export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
      } catch (_) {
        // Silently continue as guest
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const authorize =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return next(new AppError('Forbidden', 403));
    }
    return next();
  };



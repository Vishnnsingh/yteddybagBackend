import { rateLimit } from 'express-rate-limit';
import env from '../config/env';

function createRateLimiter() {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.isDev ? 10000 : env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isDev,
    message: {
      success: false,
      message: 'Too many requests, please try again later',
    },
  });
}

export default createRateLimiter;

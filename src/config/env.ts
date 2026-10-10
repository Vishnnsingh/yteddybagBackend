import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT) || 5000,
  APP_NAME: process.env.APP_NAME || 'YTeddybags-Ecommerce',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  CORS_ORIGIN,

  COOKIE_SECRET: process.env.COOKIE_SECRET || 'change-this-cookie-secret',
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-jwt-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'change-this-access',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '30d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'change-this-refresh',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME || 'refreshToken',
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE === 'true',
  AUTH_COOKIE_SAME_SITE: (process.env.AUTH_COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  CF_R2_ACCOUNT_ID: process.env.CF_R2_ACCOUNT_ID || '',
  CF_R2_ACCESS_KEY_ID: process.env.CF_R2_ACCESS_KEY_ID || '',
  CF_R2_SECRET_ACCESS_KEY: process.env.CF_R2_SECRET_ACCESS_KEY || '',
  CF_R2_BUCKET_NAME: process.env.CF_R2_BUCKET_NAME || '',
  CF_R2_PUBLIC_URL: process.env.CF_R2_PUBLIC_URL || '',

  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,

  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,

  EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  isDev: NODE_ENV === 'development',
  isProd: NODE_ENV === 'production',
  corsOrigins: Array.from(
    new Set([
      'http://localhost:5173',
      'http://localhost:3000',
      'https://yteddybag-frontend.vercel.app',
      ...CORS_ORIGIN.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ])
  ),
};

export type Env = typeof env;
export default env;

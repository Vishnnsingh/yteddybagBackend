import env from './env';
import logger from './logger';
import { initSupabase, getSupabase, getSupabaseAdmin } from './supabase';

export async function initConfig(): Promise<void> {
  initSupabase();
  logger.info(`${env.APP_NAME} config loaded (${env.NODE_ENV})`);
}

export { env, logger, getSupabase, getSupabaseAdmin };

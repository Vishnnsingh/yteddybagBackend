import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateAccessAndRefreshTokens, setAuthCookie, clearAuthCookie, verifyRefreshToken } from '../utils/jwt';
import { successResponse } from '../utils/apiResponse';
import { getSupabaseAdmin } from '../config/supabase';
import { UserModel } from '../models/user.model';
import AppError from '../utils/AppError';
import { OAuth2Client } from 'google-auth-library';
import env from '../config/env';

// Dynamic Google OAuth client & URL helpers
function getGoogleRedirectUri(req: Request): string {
  if (env.GOOGLE_CALLBACK_URL) {
    return env.GOOGLE_CALLBACK_URL;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return `${process.env.RENDER_EXTERNAL_URL}/api/v1/auth/google/callback`;
  }
  const forwardedProto = req.get('x-forwarded-proto');
  const isHttps = req.secure || forwardedProto === 'https' || (req.get('host') || '').includes('onrender.com');
  const protocol = isHttps ? 'https' : 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
  return `${protocol}://${host}/api/v1/auth/google/callback`;
}

function getGoogleOAuthClient(redirectUri: string): OAuth2Client {
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function getFrontendBaseUrl(req: Request, passedOrigin?: string): string {
  if (passedOrigin && !passedOrigin.includes('localhost:5000') && !passedOrigin.includes('onrender.com')) {
    return passedOrigin.replace(/\/+$/, '');
  }
  if (env.FRONTEND_URL) {
    return env.FRONTEND_URL.replace(/\/+$/, '');
  }
  const origin = req.get('origin');
  if (origin && !origin.includes('5000') && !origin.includes('onrender.com')) {
    return origin.replace(/\/+$/, '');
  }
  const referer = req.get('referer');
  if (referer) {
    try {
      const u = new URL(referer);
      if (!u.host.includes('5000') && !u.host.includes('onrender.com')) {
        return u.origin.replace(/\/+$/, '');
      }
    } catch {}
  }
  return env.corsOrigins[0] || 'http://localhost:5173';
}

// Helper to ensure user is registered in Supabase's native auth.users table (visible in Supabase Authentication Dashboard)
async function ensureSupabaseAuthUser(supabase: any, email: string, name: string, role: string, password?: string) {
  try {
    const { data } = await supabase.auth.admin.listUsers();
    const existing = data?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) {
      await supabase.auth.admin.createUser({
        email,
        password: password || 'User@12345678',
        email_confirm: true,
        user_metadata: { name, role },
      });
    }
  } catch (err) {
    console.error('ensureSupabaseAuthUser error:', err);
  }
}

export const loginWithEmail = async (req: Request, res: Response, next: any) => {
  try {
    const { email } = req.body;
    const supabase = getSupabaseAdmin();

    if (!supabase) throw new AppError('Database not configured', 500);

    let { data: user, error } = await supabase
      .from(UserModel.table)
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase error:', error);
      throw new AppError(`Error checking user in database: ${error.message || error.code}`, 500);
    }

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from(UserModel.table)
        .insert([{ email, name: email.split('@')[0], role: 'user', isActive: true }])
        .select()
        .single();
        
      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new AppError(`Could not create user: ${insertError.message || insertError.code}`, 500);
      }
      user = newUser;
    }

    // Ensure user shows up in Supabase Authentication > Users
    await ensureSupabaseAuthUser(supabase, email, user.name, 'user');

    const { accessToken, refreshToken } = generateAccessAndRefreshTokens(user.id, user.role);
    setAuthCookie(res, refreshToken);

    return successResponse(res, 'Logged in successfully', {
      accessToken,
      refreshToken,
      user,
    });
  } catch (err) {
    return next(err);
  }
};

export const getGoogleAuthUrl = (req: Request, res: Response) => {
  const from = req.query.from === 'admin' ? 'admin' : 'user';
  const redirectUri = getGoogleRedirectUri(req);
  const client = getGoogleOAuthClient(redirectUri);

  const queryOrigin = typeof req.query.origin === 'string' ? req.query.origin : undefined;
  const frontendBase = getFrontendBaseUrl(req, queryOrigin);

  const statePayload = Buffer.from(
    JSON.stringify({ from, frontend: frontendBase })
  ).toString('base64url');

  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
    state: statePayload,
    prompt: 'select_account',
  });
  return successResponse(res, 'Generated Google Auth URL', { url });
};

export const googleCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;

  let isAdminFlow = false;
  let frontendBase = getFrontendBaseUrl(req);

  if (state && typeof state === 'string') {
    try {
      const decodedStr = Buffer.from(state, 'base64url').toString('utf8');
      const parsed = JSON.parse(decodedStr);
      if (parsed.from === 'admin') isAdminFlow = true;
      if (parsed.frontend) frontendBase = parsed.frontend.replace(/\/+$/, '');
    } catch {
      isAdminFlow = state === 'admin';
    }
  }

  const redirectUri = getGoogleRedirectUri(req);
  const client = getGoogleOAuthClient(redirectUri);

  try {
    if (!code || typeof code !== 'string') {
      const redirectUrl = isAdminFlow
        ? `${frontendBase}/dashboard/login?error=InvalidGoogleCode`
        : `${frontendBase}/login?error=InvalidGoogleCode`;
      return res.redirect(redirectUrl);
    }

    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new AppError('Invalid Google token payload', 400);

    const email = payload.email;
    const name = payload.name || email.split('@')[0];

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    if (isAdminFlow) {
      // 1. Admin login via Google
      let { data: admin } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (!admin) {
        const hashedPassword = await bcrypt.hash('AdminGoogle@123', 12);
        const { data: newAdmin, error: insertError } = await supabase
          .from('admins')
          .insert([{ email, name, password: hashedPassword, role: 'admin', isActive: true }])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating admin from Google:', insertError);
          return res.redirect(`${frontendBase}/dashboard/login?error=AdminCreationFailed`);
        }
        admin = newAdmin;
      }

      // Ensure admin shows in Supabase Authentication > Users
      await ensureSupabaseAuthUser(supabase, email, name, 'admin');

      const { accessToken, refreshToken } = generateAccessAndRefreshTokens(admin.id, 'admin');
      setAuthCookie(res, refreshToken);

      return res.redirect(`${frontendBase}/dashboard?adminToken=${accessToken}&adminRefreshToken=${refreshToken}`);
    } else {
      // 2. Customer login via Google
      let { data: user, error } = await supabase
        .from(UserModel.table)
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase error:', error);
        throw new AppError(`Error checking user in database: ${error.message || error.code}`, 500);
      }

      if (!user) {
        const { data: newUser, error: insertError } = await supabase
          .from(UserModel.table)
          .insert([{ email, name, role: 'user', isActive: true }])
          .select()
          .single();
          
        if (insertError) {
          console.error('Supabase insert error:', insertError);
          throw new AppError(`Could not create user: ${insertError.message || insertError.code}`, 500);
        }
        user = newUser;
      }

      // Ensure customer shows in Supabase Authentication > Users
      await ensureSupabaseAuthUser(supabase, email, name, 'user');

      const { accessToken, refreshToken } = generateAccessAndRefreshTokens(user.id, user.role);
      setAuthCookie(res, refreshToken);

      return res.redirect(`${frontendBase}/?token=${accessToken}&refreshToken=${refreshToken}`);
    }
  } catch (err) {
    console.error(err);
    const redirectUrl = isAdminFlow
      ? `${frontendBase}/dashboard/login?error=GoogleCallbackFailed`
      : `${frontendBase}/login?error=GoogleCallbackFailed`;
    return res.redirect(redirectUrl);
  }
};

// Refresh Access Token
export const refreshAccessToken = async (req: Request, res: Response, next: any) => {
  try {
    const tokenFromCookie = req.cookies?.[env.AUTH_COOKIE_NAME] || (req as any).signedCookies?.[env.AUTH_COOKIE_NAME];
    const tokenFromBody = req.body?.refreshToken;
    const tokenFromHeader = req.headers['x-refresh-token'] as string | undefined;

    const tokenToVerify = tokenFromBody || tokenFromCookie || tokenFromHeader;

    if (!tokenToVerify || typeof tokenToVerify !== 'string') {
      throw new AppError('Refresh token required', 401);
    }

    let decoded: { userId: string; role?: string };
    try {
      decoded = verifyRefreshToken(tokenToVerify);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    if (decoded.role === 'admin') {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (error || !admin || !admin.isActive) {
        throw new AppError('Admin account not found or inactive', 401);
      }

      const { accessToken, refreshToken: newRefreshToken } = generateAccessAndRefreshTokens(admin.id, 'admin');
      setAuthCookie(res, newRefreshToken);

      return successResponse(res, 'Token refreshed successfully', {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'admin',
        },
      });
    } else {
      const { data: user, error } = await supabase
        .from(UserModel.table)
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (error || !user || !user.isActive) {
        throw new AppError('User account not found or inactive', 401);
      }

      const { accessToken, refreshToken: newRefreshToken } = generateAccessAndRefreshTokens(user.id, user.role);
      setAuthCookie(res, newRefreshToken);

      return successResponse(res, 'Token refreshed successfully', {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    }
  } catch (err) {
    return next(err);
  }
};

export const logout = async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return successResponse(res, 'Logged out successfully', null);
};

export const getMe = async (req: Request, res: Response, next: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    if (req.user?.role === 'admin') {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('id, name, email, role, isActive')
        .eq('id', userId)
        .single();

      if (error || !admin || !admin.isActive) {
        throw new AppError('Admin account not found or inactive', 401);
      }

      return successResponse(res, 'Admin profile fetched', {
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'admin',
        },
      });
    }

    const { data: user, error } = await supabase
      .from(UserModel.table)
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user || !user.isActive) {
      throw new AppError('User profile not found or inactive', 401);
    }

    return successResponse(res, 'User profile fetched', {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
};

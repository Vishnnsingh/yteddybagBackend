import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateAccessAndRefreshTokens, setAuthCookie, clearAuthCookie } from '../utils/jwt';
import { successResponse } from '../utils/apiResponse';
import { getSupabaseAdmin, getSupabase } from '../config/supabase';
import AppError from '../utils/AppError';

const ADMIN_TABLE = 'admins';

// POST /api/v1/admin/auth/login
export const adminLogin = async (req: Request, res: Response, next: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const supabase = getSupabaseAdmin();
    const publicSupabase = getSupabase() || supabase;
    if (!supabase || !publicSupabase) throw new AppError('Database not configured', 500);

    let isAuthenticated = false;

    // 1. Authenticate against Supabase Auth (Native secure auth)
    const { data: authData, error: authError } = await publicSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!authError && authData.user) {
      isAuthenticated = true;
    }

    // 2. Fetch admin record from admins table
    let { data: admin } = await supabase
      .from(ADMIN_TABLE)
      .select('*')
      .eq('email', email)
      .single();

    // Fallback if password column still exists in admins table during transition
    if (!isAuthenticated && admin && admin.password) {
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (isPasswordValid) {
        isAuthenticated = true;
        // Sync password to Supabase Auth so it's registered natively
        try {
          await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: admin.name || 'Admin', role: 'admin' },
          });
        } catch (_) {}
      }
    }

    if (!isAuthenticated) {
      throw new AppError('Invalid credentials', 401);
    }

    // If admin is authenticated via Supabase Auth but not yet in admins table, insert them
    if (!admin && authData?.user) {
      const { data: newAdmin } = await supabase
        .from(ADMIN_TABLE)
        .insert([{
          id: authData.user.id,
          name: authData.user.user_metadata?.name || 'Admin',
          email,
          role: 'admin',
          isActive: true,
        }])
        .select()
        .single();
      admin = newAdmin;
    }

    if (!admin) {
      throw new AppError('Admin account not found', 404);
    }

    if (admin.isActive === false) {
      throw new AppError('Admin account is disabled', 403);
    }

    const { accessToken, refreshToken } = generateAccessAndRefreshTokens(admin.id, 'admin');
    setAuthCookie(res, refreshToken);

    const { password: _pass, ...adminData } = admin;
    return successResponse(res, 'Admin logged in successfully', { accessToken, admin: adminData });
  } catch (err) {
    return next(err);
  }
};

// GET /api/v1/admin/auth/profile
export const getAdminProfile = async (req: Request, res: Response, next: any) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    const { data: admin, error } = await supabase
      .from(ADMIN_TABLE)
      .select('id, name, email, role, isActive, createdAt')
      .eq('id', req.user!.userId)
      .single();

    if (error || !admin) {
      throw new AppError('Admin not found', 404);
    }

    return successResponse(res, 'Admin profile fetched', admin);
  } catch (err) {
    return next(err);
  }
};

// POST /api/v1/admin/auth/logout
export const adminLogout = async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return successResponse(res, 'Admin logged out successfully', null);
};

// POST /api/v1/admin/auth/create (Internal only — seed admin account)
export const createAdmin = async (req: Request, res: Response, next: any) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw new AppError('Name, email, and password are required', 400);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    const { data: existing } = await supabase
      .from(ADMIN_TABLE)
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new AppError('Admin with this email already exists', 409);
    }

    // 1. Create in Supabase Auth (Native authentication with password stored securely in auth.users)
    let authUserId: string | undefined;
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'admin' },
      });
      if (!authError && authUser?.user) {
        authUserId = authUser.user.id;
      }
    } catch (authErr) {
      console.warn('Supabase auth create warning:', authErr);
    }

    // 2. Insert into admins table WITHOUT password column
    const insertPayload: any = { email, name, role: 'admin', isActive: true };
    if (authUserId) {
      insertPayload.id = authUserId;
    }

    const { data: admin, error } = await supabase
      .from(ADMIN_TABLE)
      .insert([insertPayload])
      .select('id, name, email, role, isActive, createdAt')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw new AppError(`Could not create admin: ${error.message}`, 500);
    }

    return successResponse(res, 'Admin created successfully', admin, 201);
  } catch (err) {
    return next(err);
  }
};

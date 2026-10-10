import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { deleteFromR2 } from '../utils/r2Upload';

export interface HomePromoBannerItem {
  id: string;
  title: string;
  subtitle: string;
  title_color: string;
  subtitle_color: string;
  text_position: 'left' | 'center' | 'right' | 'none';
  font_size: 'small' | 'medium' | 'large';
  image_url: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoBannerSettings {
  is_enabled: boolean;
  autoplay: boolean;
  autoplay_interval: number; // in milliseconds, e.g. 4000
  banner_height: 'compact' | 'standard' | 'tall';
  show_dots: boolean;
  border_radius: 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl' | 'rounded-none';
}

const defaultSeedPromoBanners: HomePromoBannerItem[] = [
  {
    id: '50000000-0000-0000-0000-000000000001',
    title: 'Joyful Gifts To',
    subtitle: 'Make It Special',
    title_color: '#FFFFFF',
    subtitle_color: '#111827',
    text_position: 'left',
    font_size: 'medium',
    image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1600&auto=format&fit=crop',
    order_index: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '50000000-0000-0000-0000-000000000002',
    title: 'Handcrafted With Love',
    subtitle: 'Celebrate Every Smile',
    title_color: '#FFFFFF',
    subtitle_color: '#78350F',
    text_position: 'left',
    font_size: 'medium',
    image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1600&auto=format&fit=crop',
    order_index: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const defaultPromoSettings: PromoBannerSettings = {
  is_enabled: true,
  autoplay: true,
  autoplay_interval: 4000,
  banner_height: 'standard',
  show_dots: true,
  border_radius: 'rounded-2xl',
};

// Helper: Fetch settings from home_banner_settings table
const fetchPromoSettingsFromDb = async (): Promise<PromoBannerSettings> => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return defaultPromoSettings;

    const { data, error } = await supabase
      .from('home_banner_settings')
      .select('value')
      .eq('key', 'promo_banner_settings')
      .single();

    if (error || !data?.value) {
      return defaultPromoSettings;
    }

    return {
      is_enabled: typeof data.value.is_enabled === 'boolean' ? data.value.is_enabled : defaultPromoSettings.is_enabled,
      autoplay: typeof data.value.autoplay === 'boolean' ? data.value.autoplay : defaultPromoSettings.autoplay,
      autoplay_interval: typeof data.value.autoplay_interval === 'number' ? data.value.autoplay_interval : defaultPromoSettings.autoplay_interval,
      banner_height: data.value.banner_height || defaultPromoSettings.banner_height,
      show_dots: typeof data.value.show_dots === 'boolean' ? data.value.show_dots : defaultPromoSettings.show_dots,
      border_radius: data.value.border_radius || defaultPromoSettings.border_radius,
    };
  } catch (err) {
    console.warn('[HomePromoBanner] Error fetching promo settings, using defaults:', err);
    return defaultPromoSettings;
  }
};

// Helper: Fetch all promo banners from DB with auto-seeding if empty
const fetchAllPromoBannersFromDb = async (): Promise<HomePromoBannerItem[]> => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return defaultSeedPromoBanners;

    const { data, error } = await supabase
      .from('home_promo_banners')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[HomePromoBanner] DB query error (table might not exist yet):', error.message);
      return defaultSeedPromoBanners;
    }

    if (!data || data.length === 0) {
      // Auto seed default banners into table
      try {
        const { error: seedError } = await supabase
          .from('home_promo_banners')
          .insert(defaultSeedPromoBanners);
        if (!seedError) {
          console.log('[HomePromoBanner] Auto-seeded default promo banners into DB');
          return defaultSeedPromoBanners;
        }
      } catch (seedErr) {
        console.warn('[HomePromoBanner] Auto-seed failed:', seedErr);
      }
      return defaultSeedPromoBanners;
    }

    return data as HomePromoBannerItem[];
  } catch (err) {
    console.warn('[HomePromoBanner] Exception fetching promo banners:', err);
    return defaultSeedPromoBanners;
  }
};

// GET /api/v1/home-banners/promo-banner (Public Storefront Endpoint)
export const getPublicPromoBanners = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [allBanners, settings] = await Promise.all([
      fetchAllPromoBannersFromDb(),
      fetchPromoSettingsFromDb(),
    ]);

    const activeBanners = allBanners
      .filter((b) => b.is_active !== false)
      .sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'Promo banners fetched successfully', {
      settings,
      items: activeBanners,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/home-banners/admin/promo-banners (Admin Management Endpoint)
export const getAdminPromoBanners = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [allBanners, settings] = await Promise.all([
      fetchAllPromoBannersFromDb(),
      fetchPromoSettingsFromDb(),
    ]);

    return successResponse(res, 'Admin promo banners fetched successfully', {
      settings,
      items: allBanners,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/promo-banners (Create New Promo Banner)
export const createPromoBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      subtitle,
      title_color,
      subtitle_color,
      text_position,
      font_size,
      image_url,
      is_active,
    } = req.body;

    if (!image_url || typeof image_url !== 'string' || image_url.trim() === '') {
      throw new AppError('Banner image URL is required', 400);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database connection unavailable', 500);

    // Get max order_index to place new banner at the end
    const { data: maxOrderData } = await supabase
      .from('home_promo_banners')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.order_index ?? 0) + 1;

    const newBanner: Partial<HomePromoBannerItem> = {
      id: crypto.randomUUID(),
      title: title?.trim() || 'Joyful Gifts To',
      subtitle: subtitle?.trim() || 'Make It Special',
      title_color: title_color || '#FFFFFF',
      subtitle_color: subtitle_color || '#111827',
      text_position: text_position || 'left',
      font_size: font_size || 'medium',
      image_url: image_url.trim(),
      order_index: nextOrder,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('home_promo_banners')
      .insert([newBanner])
      .select()
      .single();

    if (error) {
      console.error('[HomePromoBanner] Insert error:', error);
      throw new AppError(`Failed to create promo banner: ${error.message}`, 500);
    }

    return successResponse(res, 'Promo banner created successfully', data, 201);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/promo-banners/:id (Update Promo Banner)
export const updatePromoBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new AppError('Banner ID is required', 400);

    const {
      title,
      subtitle,
      title_color,
      subtitle_color,
      text_position,
      font_size,
      image_url,
      is_active,
      order_index,
    } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (subtitle !== undefined) updates.subtitle = subtitle;
    if (title_color !== undefined) updates.title_color = title_color;
    if (subtitle_color !== undefined) updates.subtitle_color = subtitle_color;
    if (text_position !== undefined) updates.text_position = text_position;
    if (font_size !== undefined) updates.font_size = font_size;
    if (image_url !== undefined) updates.image_url = image_url;
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (typeof order_index === 'number') updates.order_index = order_index;

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database connection unavailable', 500);

    // If a new image_url is provided, check if it replaces an existing image to clean up storage
    let previousImageUrl: string | null = null;
    if (image_url) {
      const { data: existing } = await supabase
        .from('home_promo_banners')
        .select('image_url')
        .eq('id', id)
        .single();
      if (existing?.image_url && existing.image_url.trim() !== image_url.trim()) {
        previousImageUrl = existing.image_url;
      }
    }

    const { data, error } = await supabase
      .from('home_promo_banners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[HomePromoBanner] Update error:', error);
      throw new AppError(`Failed to update promo banner: ${error.message}`, 500);
    }

    // Clean up replaced previous image from cloud storage (R2)
    if (previousImageUrl) {
      try {
        await deleteFromR2(previousImageUrl);
        console.log('[HomePromoBanner] Replaced old image cleaned from storage:', previousImageUrl);
      } catch (r2Err) {
        console.warn('[HomePromoBanner] Notice deleting replaced image from R2:', r2Err);
      }
    }

    return successResponse(res, 'Promo banner updated successfully', data);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/home-banners/admin/promo-banners/:id (Delete Promo Banner)
export const deletePromoBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new AppError('Banner ID is required', 400);

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database connection unavailable', 500);

    // Check if item exists and fetch its image_url to clean up R2 if needed
    const { data: existing } = await supabase
      .from('home_promo_banners')
      .select('image_url')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('home_promo_banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[HomePromoBanner] Delete error:', error);
      throw new AppError(`Failed to delete promo banner: ${error.message}`, 500);
    }

    if (existing?.image_url) {
      try {
        await deleteFromR2(existing.image_url);
      } catch (r2Err) {
        console.warn('[HomePromoBanner] R2 deletion notice:', r2Err);
      }
    }

    return successResponse(res, 'Promo banner deleted successfully', { id });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/home-banners/admin/promo-banners/reorder (Reorder Slides)
export const reorderPromoBanners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      throw new AppError('orderedIds must be an array of string IDs', 400);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database connection unavailable', 500);

    const updatePromises = orderedIds.map((id: string, index: number) =>
      supabase
        .from('home_promo_banners')
        .update({ order_index: index + 1, updated_at: new Date().toISOString() })
        .eq('id', id)
    );

    await Promise.all(updatePromises);

    return successResponse(res, 'Promo banners reordered successfully', { orderedIds });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/promo-banners/settings (Update Settings)
export const updatePromoBannerSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      is_enabled,
      autoplay,
      autoplay_interval,
      banner_height,
      show_dots,
      border_radius,
    } = req.body;

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database connection unavailable', 500);

    const updatedSettings: PromoBannerSettings = {
      is_enabled: typeof is_enabled === 'boolean' ? is_enabled : defaultPromoSettings.is_enabled,
      autoplay: typeof autoplay === 'boolean' ? autoplay : defaultPromoSettings.autoplay,
      autoplay_interval: typeof autoplay_interval === 'number' ? autoplay_interval : defaultPromoSettings.autoplay_interval,
      banner_height: banner_height || defaultPromoSettings.banner_height,
      show_dots: typeof show_dots === 'boolean' ? show_dots : defaultPromoSettings.show_dots,
      border_radius: border_radius || defaultPromoSettings.border_radius,
    };

    const { error } = await supabase
      .from('home_banner_settings')
      .upsert(
        {
          key: 'promo_banner_settings',
          value: updatedSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('[HomePromoBanner] Settings update error:', error);
      throw new AppError(`Failed to update promo settings: ${error.message}`, 500);
    }

    return successResponse(res, 'Promo banner settings updated successfully', updatedSettings);
  } catch (error) {
    return next(error);
  }
};

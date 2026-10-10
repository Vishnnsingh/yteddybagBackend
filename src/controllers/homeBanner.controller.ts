import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { uploadToR2, deleteFromR2 } from '../utils/r2Upload';

export interface HomeBannerItem {
  id: string;
  title: string;
  subtitle?: string;
  button_text?: string;
  media_type: 'image' | 'video';
  media_url: string;
  link_url: string;
  link_type: 'header' | 'dropdown' | 'custom';
  target_header_id?: string | null;
  target_dropdown_id?: string | null;
  show_overlay: boolean;
  overlay_position?: 'left' | 'center' | 'right';
  title_color?: string;
  subtitle_color?: string;
  button_bg_color?: string;
  button_text_color?: string;
  font_family?: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Starter fallback banners matching Zouk reference aesthetic
const defaultSeedBanners: HomeBannerItem[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    title: 'Your work-to-wherever satchel.',
    subtitle: 'Handcrafted luxury backpacks & bags for your everyday journey.',
    button_text: 'SHOP NOW',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1920&auto=format&fit=crop',
    link_url: '/category/teddy-bags',
    link_type: 'header',
    show_overlay: true,
    overlay_position: 'right',
    order_index: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    title: 'Playful Companions, Every Day.',
    subtitle: 'Discover our signature plush teddy backpacks crafted for young adventurers.',
    button_text: 'EXPLORE COLLECTION',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1920&auto=format&fit=crop',
    link_url: '/category/plush-backpacks',
    link_type: 'dropdown',
    show_overlay: true,
    overlay_position: 'left',
    order_index: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    title: 'Ready For School & Beyond',
    subtitle: 'Ergonomic, lightweight & ultra-durable school bags designed for kids.',
    button_text: 'SHOP SCHOOL BAGS',
    media_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1577733966973-d680bffd2e80?q=80&w=1920&auto=format&fit=crop',
    link_url: '/category/school-bags',
    link_type: 'header',
    show_overlay: true,
    overlay_position: 'center',
    order_index: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// In-memory cache fallback
let memoryBannersCache: HomeBannerItem[] = [...defaultSeedBanners];

/**
 * Fetch all banners from database (Supabase table or site_settings/ecommerce fallback)
 */
async function fetchAllBannersFromDb(): Promise<HomeBannerItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memoryBannersCache;

  // 1. Try dedicated 'home_banners' table
  try {
    const { data, error } = await supabase
      .from('home_banners')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      memoryBannersCache = data.map((row) => ({
        id: row.id,
        title: row.title || '',
        subtitle: row.subtitle || '',
        button_text: row.button_text || 'SHOP NOW',
        media_type: row.media_type === 'video' ? 'video' : 'image',
        media_url: row.media_url,
        link_url: row.link_url || '/',
        link_type: row.link_type || 'custom',
        target_header_id: row.target_header_id || null,
        target_dropdown_id: row.target_dropdown_id || null,
        show_overlay: row.show_overlay !== false,
        overlay_position: row.overlay_position || 'center',
        title_color: row.title_color || '#FFFFFF',
        subtitle_color: row.subtitle_color || '#F3F4F6',
        button_bg_color: row.button_bg_color || '#8B2500',
        button_text_color: row.button_text_color || '#FFFFFF',
        font_family: row.font_family || 'Inter',
        order_index: Number(row.order_index) || 0,
        is_active: row.is_active !== false,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      }));
      return memoryBannersCache;
    }
  } catch (_) {}

  // 2. Try 'site_settings' table where key = 'home_banners'
  try {
    const { data: settingRow, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'home_banners')
      .maybeSingle();

    if (!error && settingRow?.value && Array.isArray(settingRow.value)) {
      memoryBannersCache = settingRow.value;
      return memoryBannersCache;
    }
  } catch (_) {}

  // 3. Try 'ecommerce' table fallback where slug = 'home-banners-config'
  try {
    const { data: ecomRow, error } = await supabase
      .from('ecommerce')
      .select('address')
      .eq('slug', 'home-banners-config')
      .maybeSingle();

    if (!error && ecomRow?.address) {
      const parsed = JSON.parse(ecomRow.address);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryBannersCache = parsed;
        return memoryBannersCache;
      }
    }
  } catch (_) {}

  return memoryBannersCache;
}

/**
 * Persist banners to database (Both table and fallback JSON)
 */
async function persistBannersToDb(banners: HomeBannerItem[]): Promise<void> {
  memoryBannersCache = [...banners];
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // 1. Try writing to 'home_banners' table
  try {
    // Delete existing and insert updated list, or upsert each
    for (const b of banners) {
      await supabase.from('home_banners').upsert(
        {
          id: b.id,
          title: b.title,
          subtitle: b.subtitle || '',
          button_text: b.button_text || 'SHOP NOW',
          media_type: b.media_type,
          media_url: b.media_url,
          link_url: b.link_url,
          link_type: b.link_type,
          target_header_id: b.target_header_id || null,
          target_dropdown_id: b.target_dropdown_id || null,
          show_overlay: b.show_overlay,
          overlay_position: b.overlay_position || 'center',
          title_color: b.title_color || '#FFFFFF',
          subtitle_color: b.subtitle_color || '#F3F4F6',
          button_bg_color: b.button_bg_color || '#8B2500',
          button_text_color: b.button_text_color || '#FFFFFF',
          font_family: b.font_family || 'Inter',
          order_index: b.order_index,
          is_active: b.is_active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }
  } catch (_) {}

  // 2. Mirror to 'site_settings' table (bulletproof JSON snapshot)
  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'home_banners',
        value: banners,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  // 3. Mirror to 'ecommerce' table
  try {
    await supabase.from('ecommerce').upsert(
      {
        slug: 'home-banners-config',
        name: 'Home Hero Banners Config',
        email: 'banners@yteddybags.internal',
        address: JSON.stringify(banners),
        isActive: true,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    );
  } catch (_) {}
}

// -------------------------------------------------------------
// CONTROLLERS
// -------------------------------------------------------------

// GET /api/v1/home-banners (Public: active banners for Home Carousel)
export const getPublicBanners = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await fetchAllBannersFromDb();
    const activeBanners = banners
      .filter((b) => b.is_active)
      .sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'Home banners fetched successfully', activeBanners);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/home-banners/admin/all (Admin: all banners including inactive)
export const getAdminBanners = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await fetchAllBannersFromDb();
    const sorted = [...banners].sort((a, b) => a.order_index - b.order_index);
    return successResponse(res, 'All home banners fetched for admin', sorted);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/upload-media (Upload Image or Video)
export const uploadBannerMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No image or video file provided', 400);
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
    let fileUrl = '';

    // 1. Attempt Cloudflare R2 Upload
    try {
      fileUrl = await uploadToR2(req.file, 'home-banners');
      console.log(`[Cloudflare R2] Home banner ${mediaType} uploaded successfully:`, fileUrl);
    } catch (r2Err: any) {
      console.warn('[Cloudflare R2] Failed, falling back to local storage:', r2Err?.message || r2Err);

      // Local fallback in uploads/banners
      const ext = path.extname(req.file.originalname) || (isVideo ? '.mp4' : '.jpg');
      const filename = `banner-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const localDirPath = path.join(__dirname, '../../uploads/banners');
      fs.mkdirSync(localDirPath, { recursive: true });
      const localFilePath = path.join(localDirPath, filename);
      fs.writeFileSync(localFilePath, req.file.buffer);

      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      fileUrl = `${protocol}://${host}/uploads/banners/${filename}`;
    }

    return successResponse(
      res,
      `${isVideo ? 'Video' : 'Image'} uploaded successfully`,
      {
        url: fileUrl,
        mediaType,
        originalName: req.file.originalname,
      },
      201
    );
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin (Create new banner)
export const createBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      subtitle,
      button_text,
      media_type,
      media_url,
      link_url,
      link_type,
      target_header_id,
      target_dropdown_id,
      show_overlay,
      overlay_position,
      title_color,
      subtitle_color,
      button_bg_color,
      button_text_color,
      is_active,
    } = req.body;

    if (!media_url || typeof media_url !== 'string') {
      throw new AppError('Media URL is required', 400);
    }

    const currentBanners = await fetchAllBannersFromDb();
    const maxOrder = currentBanners.reduce((max, b) => Math.max(max, b.order_index || 0), 0);

    const newBanner: HomeBannerItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `banner-${Date.now()}`,
      title: (title || '').trim(),
      subtitle: (subtitle || '').trim(),
      button_text: (button_text || 'SHOP NOW').trim(),
      media_type: media_type === 'video' ? 'video' : 'image',
      media_url: media_url.trim(),
      link_url: (link_url || '/').trim(),
      link_type: link_type || 'header',
      target_header_id: target_header_id || null,
      target_dropdown_id: target_dropdown_id || null,
      show_overlay: show_overlay !== false,
      overlay_position: overlay_position || 'center',
      title_color: (title_color || '#FFFFFF').trim(),
      subtitle_color: (subtitle_color || '#F3F4F6').trim(),
      button_bg_color: (button_bg_color || '#8B2500').trim(),
      button_text_color: (button_text_color || '#FFFFFF').trim(),
      order_index: maxOrder + 1,
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedList = [...currentBanners, newBanner];
    await persistBannersToDb(updatedList);

    return successResponse(res, 'Home banner created successfully', newBanner, 201);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/:id (Update existing banner)
export const updateBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentBanners = await fetchAllBannersFromDb();
    const index = currentBanners.findIndex((b) => b.id === id);

    if (index === -1) {
      throw new AppError('Home banner not found', 404);
    }

    const existing = currentBanners[index];

    // If media has changed, delete old media from Cloudflare R2
    if (existing.media_url && req.body?.media_url && existing.media_url !== req.body.media_url) {
      try {
        await deleteFromR2(existing.media_url);
        console.log(`[Cloudflare R2] Deleted replaced banner media: ${existing.media_url}`);
      } catch (err: any) {
        console.warn(`[Cloudflare R2] Failed to delete replaced media: ${err?.message || err}`);
      }
    }

    const updatedBanner: HomeBannerItem = {
      ...existing,
      ...req.body,
      id: existing.id,
      updated_at: new Date().toISOString(),
    };

    currentBanners[index] = updatedBanner;
    await persistBannersToDb(currentBanners);

    return successResponse(res, 'Home banner updated successfully', updatedBanner);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/home-banners/admin/:id (Delete banner)
export const deleteBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentBanners = await fetchAllBannersFromDb();
    const bannerToDelete = currentBanners.find((b) => b.id === id);

    if (!bannerToDelete) {
      throw new AppError('Home banner not found', 404);
    }

    // Delete media from R2 if applicable
    if (bannerToDelete.media_url) {
      try {
        await deleteFromR2(bannerToDelete.media_url);
      } catch (_) {}
    }

    // Also delete from Supabase table if available
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('home_banners').delete().eq('id', id);
      } catch (_) {}
    }

    const updatedList = currentBanners.filter((b) => b.id !== id);
    await persistBannersToDb(updatedList);

    return successResponse(res, 'Home banner deleted successfully', { id });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/home-banners/admin/reorder (Reorder banners)
export const reorderBanners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      throw new AppError('orderedIds must be an array of banner IDs', 400);
    }

    const currentBanners = await fetchAllBannersFromDb();
    const updatedList = currentBanners.map((b) => {
      const idx = orderedIds.indexOf(b.id);
      return idx !== -1 ? { ...b, order_index: idx + 1, updated_at: new Date().toISOString() } : b;
    });

    updatedList.sort((a, b) => a.order_index - b.order_index);
    await persistBannersToDb(updatedList);

    return successResponse(res, 'Home banners reordered successfully', updatedList);
  } catch (error) {
    return next(error);
  }
};

// In-memory cache for active theme
let memoryThemeCache: string = 'peek-carousel';

// GET /api/v1/home-banners/theme (Public: get active banner theme)
export const getBannerTheme = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      // 1. Check site_settings where key = 'home_banner_theme'
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'home_banner_theme')
          .maybeSingle();

        if (!error && data?.value) {
          const theme = typeof data.value === 'string' ? data.value : data.value.theme || 'peek-carousel';
          memoryThemeCache = theme;
          return successResponse(res, 'Banner theme fetched successfully', { theme });
        }
      } catch (_) {}

      // 2. Fallback check home_banner_settings where key = 'banner_theme'
      try {
        const { data, error } = await supabase
          .from('home_banner_settings')
          .select('value')
          .eq('key', 'banner_theme')
          .maybeSingle();

        if (!error && data?.value) {
          const theme = typeof data.value === 'string' ? data.value : data.value.theme || 'peek-carousel';
          memoryThemeCache = theme;
          return successResponse(res, 'Banner theme fetched successfully', { theme });
        }
      } catch (_) {}
    }

    return successResponse(res, 'Banner theme fetched successfully', { theme: memoryThemeCache });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/theme (Admin: update active banner theme)
export const updateBannerTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { theme } = req.body;
    if (!theme || typeof theme !== 'string') {
      throw new AppError('Valid theme string is required', 400);
    }

    const validThemes = ['hero-edge', 'peek-carousel', 'split-showcase', 'framed-luxury', 'minimal-editorial'];
    if (!validThemes.includes(theme)) {
      throw new AppError(`Theme must be one of: ${validThemes.join(', ')}`, 400);
    }

    memoryThemeCache = theme;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      // 1. Save to site_settings (standard settings store)
      try {
        await supabase.from('site_settings').upsert(
          {
            key: 'home_banner_theme',
            value: { theme, updated_at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
      } catch (_) {}

      // 2. Save to home_banner_settings if available
      try {
        await supabase.from('home_banner_settings').upsert(
          {
            key: 'banner_theme',
            value: { theme, updated_at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
      } catch (_) {}
    }

    return successResponse(res, 'Banner theme updated successfully', { theme });
  } catch (error) {
    return next(error);
  }
};

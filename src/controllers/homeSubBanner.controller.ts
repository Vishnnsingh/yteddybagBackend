import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { deleteFromR2 } from '../utils/r2Upload';

export interface HomeSubBannerItem {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  link_type: 'header' | 'dropdown' | 'custom';
  target_header_id?: string | null;
  target_dropdown_id?: string | null;
  hover_bg_color: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubBannerSettings {
  is_enabled: boolean;
  default_hover_bg: string;
}

// Starter seed items matching user's reference strip (Teddy, Flowers, Gifts, Luxe, Hatke, etc.)
const defaultSeedSubBanners: HomeSubBannerItem[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    title: 'Same Day',
    image_url: 'https://api.iconify.design/lucide:truck.svg?color=%23D26900',
    link_url: '/category/same-day',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    title: 'Plush Bags',
    image_url: 'https://api.iconify.design/lucide:backpack.svg?color=%23D26900',
    link_url: '/category/plush-backpacks',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    title: 'Teddy Toys',
    image_url: 'https://api.iconify.design/lucide:smile.svg?color=%23D26900',
    link_url: '/category/soft-toys',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    title: 'Personalised',
    image_url: 'https://api.iconify.design/lucide:sparkles.svg?color=%23D26900',
    link_url: '/category/personalised',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    title: 'School Bags',
    image_url: 'https://api.iconify.design/lucide:briefcase.svg?color=%23D26900',
    link_url: '/category/school-bags',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000006',
    title: 'Gift Hampers',
    image_url: 'https://api.iconify.design/lucide:gift.svg?color=%23D26900',
    link_url: '/category/gift-hampers',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 6,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000007',
    title: 'Balloon Decor',
    image_url: 'https://api.iconify.design/lucide:party-popper.svg?color=%23D26900',
    link_url: '/category/balloon-decor',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 7,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000008',
    title: 'Trendy Gifts',
    image_url: 'https://api.iconify.design/lucide:flame.svg?color=%23D26900',
    link_url: '/category/trendy-gifts',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 8,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000009',
    title: 'LUXE Gifts',
    image_url: 'https://api.iconify.design/lucide:gem.svg?color=%23D26900',
    link_url: '/category/luxe-gifts',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 9,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000010',
    title: 'Hatke Edit',
    image_url: 'https://api.iconify.design/lucide:wand-2.svg?color=%23D26900',
    link_url: '/category/hatke',
    link_type: 'custom',
    hover_bg_color: '#FFF7ED',
    order_index: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let memorySubBannersCache: HomeSubBannerItem[] = [...defaultSeedSubBanners];
let memorySubBannerSettings: SubBannerSettings = {
  is_enabled: true,
  default_hover_bg: '#FFF7ED',
};

const isValidUuid = (val: any): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

function sanitizeSubBannerItem(item: any): HomeSubBannerItem {
  return {
    id: isValidUuid(item.id)
      ? item.id.trim()
      : crypto.randomUUID(),
    title: String(item.title || '').trim(),
    image_url: String(item.image_url || '').trim(),
    link_url: String(item.link_url || '/').trim(),
    link_type: item.link_type === 'dropdown' ? 'dropdown' : item.link_type === 'custom' ? 'custom' : 'header',
    target_header_id: isValidUuid(item.target_header_id) ? item.target_header_id.trim() : null,
    target_dropdown_id: isValidUuid(item.target_dropdown_id) ? item.target_dropdown_id.trim() : null,
    hover_bg_color: String(item.hover_bg_color || '#FFF7ED').trim(),
    order_index: Number(item.order_index) || 0,
    is_active: item.is_active !== false,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch all sub banners from DB
 */
async function fetchAllSubBannersFromDb(): Promise<HomeSubBannerItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memorySubBannersCache;

  // 1. Try dedicated 'home_sub_banners' table
  try {
    const { data, error } = await supabase
      .from('home_sub_banners')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      memorySubBannersCache = data.map(sanitizeSubBannerItem);
      return memorySubBannersCache;
    }
  } catch (_) {}

  // 2. Fallback to site_settings table where key = 'home_sub_banners'
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'home_sub_banners')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      memorySubBannersCache = data.value.map(sanitizeSubBannerItem);
      return memorySubBannersCache;
    }
  } catch (_) {}

  // 3. Fallback to ecommerce table where slug = 'home-sub-banners-config'
  try {
    const { data, error } = await supabase
      .from('ecommerce')
      .select('address')
      .eq('slug', 'home-sub-banners-config')
      .maybeSingle();

    if (!error && data?.address) {
      const parsed = JSON.parse(data.address);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memorySubBannersCache = parsed.map(sanitizeSubBannerItem);
        return memorySubBannersCache;
      }
    }
  } catch (_) {}

  return memorySubBannersCache;
}

/**
 * Persist all sub banners to DB (home_sub_banners table + site_settings + ecommerce snapshots)
 */
async function persistSubBannersToDb(items: HomeSubBannerItem[]): Promise<void> {
  const sanitizedItems = items.map(sanitizeSubBannerItem);
  memorySubBannersCache = sanitizedItems;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // 1. Try home_sub_banners table upsert row by row
  try {
    for (const b of sanitizedItems) {
      const { error } = await supabase.from('home_sub_banners').upsert(b, { onConflict: 'id' });
      if (error) {
        console.warn(`[HomeSubBanner] Row upsert error for ${b.id}: ${error.message}`);
      }
    }
  } catch (err: any) {
    console.warn(`[HomeSubBanner] home_sub_banners table exception: ${err?.message || err}`);
  }

  // 2. Mirror to 'site_settings' table
  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'home_sub_banners',
        value: sanitizedItems,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  // 3. Mirror to 'ecommerce' table
  try {
    await supabase.from('ecommerce').upsert(
      {
        slug: 'home-sub-banners-config',
        name: 'Home Sub Banners Config',
        address: JSON.stringify(sanitizedItems),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    );
  } catch (_) {}
}

/**
 * Fetch sub-banner master settings (is_enabled, default_hover_bg)
 */
async function fetchSubBannerSettings(): Promise<SubBannerSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memorySubBannerSettings;

  try {
    // 1. Try site_settings
    const { data: sData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'home_sub_banner_settings')
      .maybeSingle();

    if (sData?.value) {
      memorySubBannerSettings = {
        is_enabled: sData.value.is_enabled ?? true,
        default_hover_bg: sData.value.default_hover_bg || '#FFF7ED',
      };
      return memorySubBannerSettings;
    }

    // 2. Try home_banner_settings
    const { data: bData } = await supabase
      .from('home_banner_settings')
      .select('value')
      .eq('key', 'sub_banner_settings')
      .maybeSingle();

    if (bData?.value) {
      memorySubBannerSettings = {
        is_enabled: bData.value.is_enabled ?? true,
        default_hover_bg: bData.value.default_hover_bg || '#FFF7ED',
      };
      return memorySubBannerSettings;
    }
  } catch (_) {}

  return memorySubBannerSettings;
}

/**
 * Persist sub-banner master settings
 */
async function persistSubBannerSettings(settings: SubBannerSettings): Promise<void> {
  memorySubBannerSettings = settings;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'home_sub_banner_settings',
        value: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  try {
    await supabase.from('home_banner_settings').upsert(
      {
        key: 'sub_banner_settings',
        value: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}
}

// GET /api/v1/home-banners/sub-banners (Public: active sub-banners & settings)
export const getPublicSubBanners = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [settings, items] = await Promise.all([
      fetchSubBannerSettings(),
      fetchAllSubBannersFromDb(),
    ]);

    const activeItems = items.filter((b) => b.is_active);
    activeItems.sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'Sub-banners fetched successfully', {
      is_enabled: settings.is_enabled,
      default_hover_bg: settings.default_hover_bg,
      items: activeItems,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/home-banners/admin/sub-banners (Admin: all sub-banners & settings)
export const getAdminSubBanners = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [settings, items] = await Promise.all([
      fetchSubBannerSettings(),
      fetchAllSubBannersFromDb(),
    ]);

    items.sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'Admin sub-banners fetched successfully', {
      is_enabled: settings.is_enabled,
      default_hover_bg: settings.default_hover_bg,
      items,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/sub-banners (Admin: create sub-banner)
export const createSubBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      image_url,
      link_url = '/',
      link_type = 'custom',
      target_header_id = null,
      target_dropdown_id = null,
      hover_bg_color = '#FFF7ED',
      order_index,
      is_active = true,
    } = req.body;

    if (!title || !title.trim()) {
      throw new AppError('Title is required for sub-banner item', 400);
    }

    if (!image_url || !image_url.trim()) {
      throw new AppError('Image URL is required for sub-banner item', 400);
    }

    const currentItems = await fetchAllSubBannersFromDb();
    const nextOrder = order_index !== undefined ? Number(order_index) : currentItems.length + 1;
    const rawNewItem = {
      id: isValidUuid(req.body?.id) ? req.body.id.trim() : crypto.randomUUID(),
      title: title.trim(),
      image_url: image_url.trim(),
      link_url: (link_url || '/').trim(),
      link_type: link_type || 'header',
      target_header_id: isValidUuid(target_header_id) ? target_header_id.trim() : null,
      target_dropdown_id: isValidUuid(target_dropdown_id) ? target_dropdown_id.trim() : null,
      hover_bg_color: hover_bg_color || '#FFF7ED',
      order_index: nextOrder,
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const newItem = sanitizeSubBannerItem(rawNewItem);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { error: insertErr } = await supabase.from('home_sub_banners').insert(newItem);
        if (insertErr) {
          console.warn(`[HomeSubBanner] Insert error for ${newItem.id}:`, insertErr.message);
        }
      } catch (err: any) {
        console.warn(`[HomeSubBanner] Insert exception for ${newItem.id}:`, err?.message || err);
      }
    }

    const updatedList = [...currentItems, newItem];
    await persistSubBannersToDb(updatedList);

    return successResponse(res, 'Sub-banner item created successfully', newItem, 201);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/sub-banners/:id (Admin: update sub-banner item)
export const updateSubBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentItems = await fetchAllSubBannersFromDb();
    const existingIndex = currentItems.findIndex((b) => b.id === id);

    if (existingIndex === -1) {
      throw new AppError('Sub-banner item not found', 404);
    }

    const existing = currentItems[existingIndex];

    // If image has changed, delete old image from Cloudflare R2
    if (existing.image_url && req.body?.image_url && existing.image_url !== req.body.image_url) {
      try {
        await deleteFromR2(existing.image_url);
        console.log(`[Cloudflare R2] Deleted replaced sub-banner image: ${existing.image_url}`);
      } catch (err: any) {
        console.warn(`[Cloudflare R2] Failed to delete replaced image: ${err?.message || err}`);
      }
    }

    const rawUpdated = {
      ...existing,
      ...req.body,
      id,
      updated_at: new Date().toISOString(),
    };
    const updatedItem = sanitizeSubBannerItem(rawUpdated);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { error: updateErr } = await supabase.from('home_sub_banners').update(updatedItem).eq('id', id);
        if (updateErr) {
          console.warn(`[HomeSubBanner] Supabase update error for ${id}:`, updateErr.message);
        }
      } catch (err: any) {
        console.warn(`[HomeSubBanner] Supabase update exception for ${id}:`, err?.message || err);
      }
    }

    currentItems[existingIndex] = updatedItem;
    await persistSubBannersToDb(currentItems);

    return successResponse(res, 'Sub-banner item updated successfully', updatedItem);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/home-banners/admin/sub-banners/:id (Admin: delete sub-banner item)
export const deleteSubBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentItems = await fetchAllSubBannersFromDb();
    const itemToDelete = currentItems.find((b) => b.id === id);

    if (!itemToDelete) {
      throw new AppError('Sub-banner item not found', 404);
    }

    if (itemToDelete.image_url) {
      try {
        await deleteFromR2(itemToDelete.image_url);
      } catch (_) {}
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('home_sub_banners').delete().eq('id', id);
      } catch (_) {}
    }

    const updatedList = currentItems.filter((b) => b.id !== id);
    await persistSubBannersToDb(updatedList);

    return successResponse(res, 'Sub-banner item deleted successfully', { id });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/home-banners/admin/sub-banners/reorder (Admin: reorder sub-banners)
export const reorderSubBanners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      throw new AppError('orderedIds must be an array of IDs', 400);
    }

    const currentItems = await fetchAllSubBannersFromDb();
    const updatedList = currentItems.map((item) => {
      const idx = orderedIds.indexOf(item.id);
      return idx !== -1 ? { ...item, order_index: idx + 1, updated_at: new Date().toISOString() } : item;
    });

    updatedList.sort((a, b) => a.order_index - b.order_index);
    await persistSubBannersToDb(updatedList);

    return successResponse(res, 'Sub-banners reordered successfully', updatedList);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/sub-banners/settings (Admin: update master settings)
export const updateSubBannerSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { is_enabled, default_hover_bg } = req.body;

    const current = await fetchSubBannerSettings();
    const updated: SubBannerSettings = {
      is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : current.is_enabled,
      default_hover_bg: default_hover_bg || current.default_hover_bg || '#FFF7ED',
    };

    await persistSubBannerSettings(updated);

    return successResponse(res, 'Sub-banner settings updated successfully', updated);
  } catch (error) {
    return next(error);
  }
};

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { deleteFromR2 } from '../utils/r2Upload';

export interface HomeOccasionItem {
  id: string;
  title: string;
  date_badge?: string | null;
  image_url?: string | null;
  bg_color: string;
  link_type: 'header' | 'dropdown';
  target_header_id?: string | null;
  target_dropdown_id?: string | null;
  link_url: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OccasionSettings {
  is_enabled: boolean;
  section_title: string;
}

// Starter seed occasion cards matching user reference image
const defaultSeedOccasions: HomeOccasionItem[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    title: 'Birthday',
    date_badge: null,
    image_url: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?q=80&w=600&auto=format&fit=crop',
    bg_color: '#F9D3B4',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/teddy-bags',
    order_index: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    title: 'Boyfriend Day',
    date_badge: '3RD OCT',
    image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop',
    bg_color: '#FAD2D8',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/personalised',
    order_index: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    title: 'Congratulations',
    date_badge: null,
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=600&auto=format&fit=crop',
    bg_color: '#ADCBE3',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/school-bags',
    order_index: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    title: 'Anniversary',
    date_badge: null,
    image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop',
    bg_color: '#F8C3CD',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/plush-backpacks',
    order_index: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000005',
    title: 'Coffee Day',
    date_badge: null,
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop',
    bg_color: '#F9D3B4',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/trendy-gifts',
    order_index: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let memoryOccasionsCache: HomeOccasionItem[] = [...defaultSeedOccasions];
let memoryOccasionsSettings: OccasionSettings = {
  is_enabled: true,
  section_title: 'Gifts For Every Occasion',
};

const isValidUuid = (val: any): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

function sanitizeOccasionItem(item: any): HomeOccasionItem {
  return {
    id: isValidUuid(item.id) ? item.id.trim() : crypto.randomUUID(),
    title: String(item.title || '').trim(),
    date_badge: item.date_badge && String(item.date_badge).trim() ? String(item.date_badge).trim() : null,
    image_url: item.image_url && String(item.image_url).trim() ? String(item.image_url).trim() : null,
    bg_color: String(item.bg_color || '#F9D3B4').trim(),
    link_type: item.link_type === 'dropdown' ? 'dropdown' : 'header',
    target_header_id: isValidUuid(item.target_header_id) ? item.target_header_id.trim() : null,
    target_dropdown_id: isValidUuid(item.target_dropdown_id) ? item.target_dropdown_id.trim() : null,
    link_url: String(item.link_url || '/').trim(),
    order_index: Number(item.order_index) || 0,
    is_active: item.is_active !== false,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch all occasions from DB with multi-tier fallbacks
 */
async function fetchAllOccasionsFromDb(): Promise<HomeOccasionItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memoryOccasionsCache;

  // 1. Try dedicated 'home_occasions' table
  try {
    const { data, error } = await supabase
      .from('home_occasions')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      memoryOccasionsCache = data.map(sanitizeOccasionItem);
      return memoryOccasionsCache;
    }
  } catch (_) {}

  // 2. Try 'site_settings' table where key = 'home_occasions'
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'home_occasions')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      memoryOccasionsCache = data.value.map(sanitizeOccasionItem);
      return memoryOccasionsCache;
    }
  } catch (_) {}

  // 3. Fallback to 'ecommerce' table where slug = 'home-occasions-config'
  try {
    const { data, error } = await supabase
      .from('ecommerce')
      .select('address')
      .eq('slug', 'home-occasions-config')
      .maybeSingle();

    if (!error && data?.address) {
      const parsed = JSON.parse(data.address);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryOccasionsCache = parsed.map(sanitizeOccasionItem);
        return memoryOccasionsCache;
      }
    }
  } catch (_) {}

  return memoryOccasionsCache;
}

/**
 * Persist all occasions to DB
 */
async function persistOccasionsToDb(items: HomeOccasionItem[]): Promise<void> {
  const sanitizedItems = items.map(sanitizeOccasionItem);
  memoryOccasionsCache = sanitizedItems;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // 1. Row upsert in home_occasions table
  try {
    for (const item of sanitizedItems) {
      const { error } = await supabase.from('home_occasions').upsert(item, { onConflict: 'id' });
      if (error) {
        console.warn(`[HomeOccasions] Upsert error for ${item.id}:`, error.message);
      }
    }
  } catch (err: any) {
    console.warn(`[HomeOccasions] home_occasions table exception:`, err?.message || err);
  }

  // 2. Mirror in site_settings
  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'home_occasions',
        value: sanitizedItems,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  // 3. Mirror in ecommerce
  try {
    await supabase.from('ecommerce').upsert(
      {
        slug: 'home-occasions-config',
        name: 'Home Occasions Config',
        address: JSON.stringify(sanitizedItems),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    );
  } catch (_) {}
}

/**
 * Fetch occasion master settings
 */
async function fetchOccasionSettings(): Promise<OccasionSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memoryOccasionsSettings;

  try {
    const { data: sData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'home_occasions_settings')
      .maybeSingle();

    if (sData?.value) {
      memoryOccasionsSettings = {
        is_enabled: sData.value.is_enabled ?? true,
        section_title: sData.value.section_title || 'Gifts For Every Occasion',
      };
      return memoryOccasionsSettings;
    }

    const { data: bData } = await supabase
      .from('home_banner_settings')
      .select('value')
      .eq('key', 'occasions_settings')
      .maybeSingle();

    if (bData?.value) {
      memoryOccasionsSettings = {
        is_enabled: bData.value.is_enabled ?? true,
        section_title: bData.value.section_title || 'Gifts For Every Occasion',
      };
      return memoryOccasionsSettings;
    }
  } catch (_) {}

  return memoryOccasionsSettings;
}

/**
 * Persist occasion master settings
 */
async function persistOccasionSettings(settings: OccasionSettings): Promise<void> {
  memoryOccasionsSettings = settings;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'home_occasions_settings',
        value: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  try {
    await supabase.from('home_banner_settings').upsert(
      {
        key: 'occasions_settings',
        value: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}
}

// -------------------------------------------------------------
// CONTROLLERS
// -------------------------------------------------------------

// GET /api/v1/home-banners/occasions (Public: active cards & settings)
export const getPublicOccasions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [settings, items] = await Promise.all([
      fetchOccasionSettings(),
      fetchAllOccasionsFromDb(),
    ]);

    const activeItems = items.filter((b) => b.is_active);
    activeItems.sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'Occasions fetched successfully', {
      is_enabled: settings.is_enabled,
      section_title: settings.section_title,
      items: activeItems,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/home-banners/admin/occasions (Admin: all cards & settings)
export const getAdminOccasions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [settings, items] = await Promise.all([
      fetchOccasionSettings(),
      fetchAllOccasionsFromDb(),
    ]);

    items.sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'Admin occasions fetched successfully', {
      is_enabled: settings.is_enabled,
      section_title: settings.section_title,
      items,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/occasions (Admin: create occasion card)
export const createOccasion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      date_badge = null,
      image_url = null,
      bg_color = '#F9D3B4',
      link_type = 'header',
      target_header_id = null,
      target_dropdown_id = null,
      link_url = '/',
      order_index,
      is_active = true,
    } = req.body;

    if (!title || !title.trim()) {
      throw new AppError('Title is required for occasion card', 400);
    }

    const currentItems = await fetchAllOccasionsFromDb();
    const nextOrder = order_index !== undefined ? Number(order_index) : currentItems.length + 1;

    const rawNewItem = {
      id: isValidUuid(req.body?.id) ? req.body.id.trim() : crypto.randomUUID(),
      title: title.trim(),
      date_badge: date_badge && String(date_badge).trim() ? String(date_badge).trim() : null,
      image_url: image_url && String(image_url).trim() ? String(image_url).trim() : null,
      bg_color: bg_color || '#F9D3B4',
      link_type: link_type === 'dropdown' ? 'dropdown' : 'header',
      target_header_id: isValidUuid(target_header_id) ? target_header_id.trim() : null,
      target_dropdown_id: isValidUuid(target_dropdown_id) ? target_dropdown_id.trim() : null,
      link_url: (link_url || '/').trim(),
      order_index: nextOrder,
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const newItem = sanitizeOccasionItem(rawNewItem);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { error: insertErr } = await supabase.from('home_occasions').insert(newItem);
        if (insertErr) {
          console.warn(`[HomeOccasions] Insert error for ${newItem.id}:`, insertErr.message);
        }
      } catch (err: any) {
        console.warn(`[HomeOccasions] Insert exception for ${newItem.id}:`, err?.message || err);
      }
    }

    const updatedList = [...currentItems, newItem];
    await persistOccasionsToDb(updatedList);

    return successResponse(res, 'Occasion card created successfully', newItem, 201);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/occasions/:id (Admin: update occasion card)
export const updateOccasion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentItems = await fetchAllOccasionsFromDb();
    const existingIndex = currentItems.findIndex((b) => b.id === id);

    if (existingIndex === -1) {
      throw new AppError('Occasion card not found', 404);
    }

    const existing = currentItems[existingIndex];

    // If image has changed or was removed, delete old image from Cloudflare R2
    if (existing.image_url && req.body?.image_url !== undefined && existing.image_url !== req.body.image_url) {
      try {
        await deleteFromR2(existing.image_url);
        console.log(`[Cloudflare R2] Deleted replaced occasion image: ${existing.image_url}`);
      } catch (err: any) {
        console.warn(`[Cloudflare R2] Failed to delete replaced occasion image: ${err?.message || err}`);
      }
    }

    const rawUpdated = {
      ...existing,
      ...req.body,
      id,
      updated_at: new Date().toISOString(),
    };
    const updatedItem = sanitizeOccasionItem(rawUpdated);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { error: updateErr } = await supabase.from('home_occasions').update(updatedItem).eq('id', id);
        if (updateErr) {
          console.warn(`[HomeOccasions] Supabase update error for ${id}:`, updateErr.message);
        }
      } catch (err: any) {
        console.warn(`[HomeOccasions] Supabase update exception for ${id}:`, err?.message || err);
      }
    }

    currentItems[existingIndex] = updatedItem;
    await persistOccasionsToDb(currentItems);

    return successResponse(res, 'Occasion card updated successfully', updatedItem);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/home-banners/admin/occasions/:id (Admin: delete occasion card)
export const deleteOccasion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentItems = await fetchAllOccasionsFromDb();
    const itemToDelete = currentItems.find((b) => b.id === id);

    if (!itemToDelete) {
      throw new AppError('Occasion card not found', 404);
    }

    // Delete image from Cloudflare R2 if applicable
    if (itemToDelete.image_url) {
      try {
        await deleteFromR2(itemToDelete.image_url);
        console.log(`[Cloudflare R2] Deleted occasion image: ${itemToDelete.image_url}`);
      } catch (err: any) {
        console.warn(`[Cloudflare R2] Failed to delete occasion image: ${err?.message || err}`);
      }
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('home_occasions').delete().eq('id', id);
      } catch (_) {}
    }

    const updatedList = currentItems.filter((b) => b.id !== id);
    await persistOccasionsToDb(updatedList);

    return successResponse(res, 'Occasion card deleted successfully', { id });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/home-banners/admin/occasions/reorder (Admin: reorder occasions)
export const reorderOccasions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      throw new AppError('orderedIds must be an array of IDs', 400);
    }

    const currentItems = await fetchAllOccasionsFromDb();
    const updatedList = currentItems.map((item) => {
      const idx = orderedIds.indexOf(item.id);
      return idx !== -1 ? { ...item, order_index: idx + 1, updated_at: new Date().toISOString() } : item;
    });

    updatedList.sort((a, b) => a.order_index - b.order_index);
    await persistOccasionsToDb(updatedList);

    return successResponse(res, 'Occasions reordered successfully', updatedList);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/occasions/settings (Admin: update occasion settings)
export const updateOccasionSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { is_enabled, section_title } = req.body;

    const current = await fetchOccasionSettings();
    const updated: OccasionSettings = {
      is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : current.is_enabled,
      section_title: section_title !== undefined ? String(section_title).trim() : current.section_title,
    };

    await persistOccasionSettings(updated);

    return successResponse(res, 'Occasion settings updated successfully', updated);
  } catch (error) {
    return next(error);
  }
};

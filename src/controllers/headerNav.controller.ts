import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import {
  HeaderNavModel,
  HeaderItem,
  HeaderDropdownItem,
  LoginBannerConfig,
  SavedBannerImageItem,
  BgThemeConfig,
  DeviceBgConfig,
  DoodleItem,
} from '../models/headerNav.model';
import { uploadToR2, deleteFromR2 } from '../utils/r2Upload';

// Fallback seed data if database table is empty or being initialized
const defaultSeedData: HeaderItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Teddy Bags',
    path: '/category/teddy-bags',
    order_index: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dropdown_items: [
      {
        id: 'sub-1',
        header_item_id: '11111111-1111-1111-1111-111111111111',
        title: 'Plush Teddy Backpacks',
        sub_heading: 'Backpacks & Slings',
        path: '/category/plush-backpacks',
        order_index: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'sub-2',
        header_item_id: '11111111-1111-1111-1111-111111111111',
        title: 'Mini Teddy Slings',
        sub_heading: 'Backpacks & Slings',
        path: '/category/mini-slings',
        order_index: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'School Bags',
    path: '/category/school-bags',
    order_index: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dropdown_items: [
      {
        id: 'sub-3',
        header_item_id: '22222222-2222-2222-2222-222222222222',
        title: 'Kindergarten Bags',
        sub_heading: 'School Gear',
        path: '/category/kindergarten',
        order_index: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'sub-4',
        header_item_id: '22222222-2222-2222-2222-222222222222',
        title: 'Primary School Bags',
        sub_heading: 'School Gear',
        path: '/category/primary-school',
        order_index: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: 'Soft Toys',
    path: '/category/soft-toys',
    order_index: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dropdown_items: [
      {
        id: 'sub-5',
        header_item_id: '33333333-3333-3333-3333-333333333333',
        title: 'Giant Teddy Bears',
        sub_heading: 'Plush Collection',
        path: '/category/giant-teddies',
        order_index: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'sub-6',
        header_item_id: '33333333-3333-3333-3333-333333333333',
        title: 'Musical Plush Toys',
        sub_heading: 'Plush Collection',
        path: '/category/musical-toys',
        order_index: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
];



export interface DropdownSubMeta {
  sub_heading: string | null;
  layout: 'column' | 'row';
  image_url: string | null;
}

// Helper to normalize metadata
export function parseDropdownMeta(raw: any): DropdownSubMeta {
  if (!raw) return { sub_heading: null, layout: 'column', image_url: null };
  if (typeof raw === 'string') {
    return { sub_heading: raw.trim() || null, layout: 'column', image_url: null };
  }
  if (typeof raw === 'object') {
    return {
      sub_heading: raw.sub_heading && String(raw.sub_heading).trim() ? String(raw.sub_heading).trim() : null,
      layout: raw.layout === 'row' ? 'row' : 'column',
      image_url: raw.image_url && String(raw.image_url).trim() ? String(raw.image_url).trim() : null,
    };
  }
  return { sub_heading: null, layout: 'column', image_url: null };
}

// Read subheadings map from Supabase site_settings or local file
export async function getSubHeadingsMetaMap(): Promise<Record<string, DropdownSubMeta>> {
  let rawMap: Record<string, any> = {};

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data } = await supabase
        .from(HeaderNavModel.siteSettingsTable)
        .select('value')
        .eq('key', 'header_dropdown_subheadings')
        .maybeSingle();
      if (data && data.value && typeof data.value === 'object') {
        rawMap = data.value as Record<string, any>;
      }
    } catch (_) {}
  }

  const result: Record<string, DropdownSubMeta> = {};
  for (const [key, val] of Object.entries(rawMap)) {
    result[key] = parseDropdownMeta(val);
  }
  return result;
}

// Backward-compatible getSubHeadingsMap
export async function getSubHeadingsMap(): Promise<Record<string, string>> {
  const metaMap = await getSubHeadingsMetaMap();
  const simpleMap: Record<string, string> = {};
  for (const [key, meta] of Object.entries(metaMap)) {
    if (meta.sub_heading) {
      simpleMap[key] = meta.sub_heading;
    }
  }
  return simpleMap;
}

// Persist metadata map to Supabase site_settings
export async function saveSubHeadingMetaForId(
  subId: string,
  subHeading: string | null,
  layout: 'column' | 'row' = 'column',
  imageUrl?: string | null
) {
  const metaMap = await getSubHeadingsMetaMap();
  const cleanSub = subHeading && subHeading.trim() ? subHeading.trim() : null;
  const cleanLayout: 'column' | 'row' = layout === 'row' ? 'row' : 'column';
  const cleanImage = imageUrl !== undefined
    ? (imageUrl && imageUrl.trim() ? imageUrl.trim() : null)
    : (metaMap[subId]?.image_url || null);

  if (cleanSub || cleanImage || cleanLayout !== 'column') {
    metaMap[subId] = {
      sub_heading: cleanSub,
      layout: cleanLayout,
      image_url: cleanImage,
    };
  } else {
    delete metaMap[subId];
  }

  // 1. Save to Supabase site_settings table
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase
        .from(HeaderNavModel.siteSettingsTable)
        .upsert(
          {
            key: 'header_dropdown_subheadings',
            value: metaMap,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
    } catch (_) {}
  }
}

export async function saveSubHeadingForId(subId: string, subHeading: string | null) {
  return saveSubHeadingMetaForId(subId, subHeading, 'column');
}

// Helper to query Supabase safely
function getDb() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new AppError('Database client unavailable', 500);
  return supabase;
}

// GET /api/v1/header-nav (Public - gets active items for client header)
export const getPublicHeaderNav = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getDb();

    // 1. Fetch active header items ordered by order_index
    const { data: headerItems, error: hError } = await supabase
      .from(HeaderNavModel.headerItemsTable)
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (hError) {
      console.warn('[HeaderNav] Query warning or table missing, serving default items:', hError.message);
      return successResponse(res, 'Public header items (default)', defaultSeedData);
    }

    if (!headerItems || headerItems.length === 0) {
      return successResponse(res, 'Public header items (seeded)', defaultSeedData);
    }

    // 2. Fetch active dropdown items for these headers
    const headerIds = headerItems.map((item) => item.id);
    const { data: dropdownItems, error: dError } = await supabase
      .from(HeaderNavModel.dropdownItemsTable)
      .select('*')
      .in('header_item_id', headerIds)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (dError) {
      console.warn('[HeaderNav] Dropdown query warning:', dError.message);
    }

    // Load subheadings and layout mapping (from DB site_settings or fallback)
    const metaMap = await getSubHeadingsMetaMap();

    // Combine headers with their respective dropdown items, sub_headings, and layout
    const combined: HeaderItem[] = headerItems.map((header) => {
      const subs = (dropdownItems || []).filter(
        (sub: HeaderDropdownItem) => sub.header_item_id === header.id
      ).map((sub: any) => {
        const meta = metaMap[sub.id] || { sub_heading: null, layout: 'column', image_url: null };
        return {
          ...sub,
          sub_heading: sub.sub_heading || meta.sub_heading || null,
          layout: sub.layout || meta.layout || 'column',
          image_url: sub.image_url || meta.image_url || null,
        };
      });
      return {
        ...header,
        dropdown_items: subs,
      };
    });

    return successResponse(res, 'Public header items retrieved', combined);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/header-nav/admin/all (Admin - gets all items including inactive)
export const getAllHeaderNavAdmin = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getDb();

    const { data: headerItems, error: hError } = await supabase
      .from(HeaderNavModel.headerItemsTable)
      .select('*')
      .order('order_index', { ascending: true });

    if (hError) {
      console.warn('[HeaderNav Admin] Query warning:', hError.message);
      return successResponse(res, 'Header items (fallback)', defaultSeedData);
    }

    if (!headerItems || headerItems.length === 0) {
      return successResponse(res, 'Header items (default)', defaultSeedData);
    }

    const { data: dropdownItems } = await supabase
      .from(HeaderNavModel.dropdownItemsTable)
      .select('*')
      .order('order_index', { ascending: true });

    // Load subheadings and layout mapping (from DB site_settings or fallback)
    const metaMap = await getSubHeadingsMetaMap();

    const combined: HeaderItem[] = headerItems.map((header) => {
      const subs = (dropdownItems || []).filter(
        (sub: HeaderDropdownItem) => sub.header_item_id === header.id
      ).map((sub: any) => {
        const meta = metaMap[sub.id] || { sub_heading: null, layout: 'column', image_url: null };
        return {
          ...sub,
          sub_heading: sub.sub_heading || meta.sub_heading || null,
          layout: sub.layout || meta.layout || 'column',
          image_url: sub.image_url || meta.image_url || null,
        };
      });
      return {
        ...header,
        dropdown_items: subs,
      };
    });

    return successResponse(res, 'All header items retrieved for admin', combined);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/header-nav/admin (Create new top-level header item)
export const createHeaderItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, path, order_index, is_active, image_url } = req.body;

    if (!title) {
      throw new AppError('Header title is required', 400);
    }

    const supabase = getDb();
    const { data, error } = await supabase
      .from(HeaderNavModel.headerItemsTable)
      .insert([
        {
          title: title.trim(),
          path: path?.trim() || '/',
          order_index: typeof order_index === 'number' ? order_index : 0,
          is_active: typeof is_active === 'boolean' ? is_active : true,
          image_url: image_url ? String(image_url).trim() : null,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create header item: ${error.message}`, 400);
    }

    return successResponse(res, 'Header item created successfully', { ...data, dropdown_items: [] }, 201);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/header-nav/admin/:id (Update header item)
export const updateHeaderItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, path, order_index, is_active, image_url } = req.body;

    const supabase = getDb();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (path !== undefined) updates.path = path.trim();
    if (order_index !== undefined) updates.order_index = order_index;
    if (is_active !== undefined) updates.is_active = is_active;
    if (image_url !== undefined) updates.image_url = image_url ? String(image_url).trim() : null;

    const { data, error } = await supabase
      .from(HeaderNavModel.headerItemsTable)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update header item: ${error.message}`, 400);
    }

    return successResponse(res, 'Header item updated successfully', data);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/header-nav/admin/:id (Delete header item)
export const deleteHeaderItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supabase = getDb();

    const { error } = await supabase
      .from(HeaderNavModel.headerItemsTable)
      .delete()
      .eq('id', id);

    if (error) {
      throw new AppError(`Failed to delete header item: ${error.message}`, 400);
    }

    return successResponse(res, 'Header item and all its sub-items deleted successfully', { id });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/header-nav/admin/:headerId/sub-items (Create dropdown sub-item or batch items)
export const createDropdownItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { headerId } = req.params;
    const { title, items, sub_heading, layout, image_url, path: reqPath, order_index, is_active } = req.body;

    let titles: string[] = [];
    if (Array.isArray(items) && items.length > 0) {
      titles = items
        .map((t: any) => String(t || '').trim())
        .filter((t) => t.length > 0);
    } else if (title && String(title).trim()) {
      titles = [String(title).trim()];
    }

    if (titles.length === 0) {
      throw new AppError('Dropdown item title or at least one item is required', 400);
    }

    const supabase = getDb();
    const cleanSubHeading = sub_heading && String(sub_heading).trim() ? String(sub_heading).trim() : null;
    const cleanLayout: 'column' | 'row' = layout === 'row' ? 'row' : 'column';
    const cleanImageUrl = image_url && String(image_url).trim() ? String(image_url).trim() : null;

    // Get current order_index base
    let baseOrder = typeof order_index === 'number' ? order_index : 0;
    if (baseOrder === 0) {
      const { count } = await supabase
        .from(HeaderNavModel.dropdownItemsTable)
        .select('*', { count: 'exact', head: true })
        .eq('header_item_id', headerId);
      baseOrder = (count || 0) + 1;
    }

    const createdItems: HeaderDropdownItem[] = [];

    for (let i = 0; i < titles.length; i++) {
      const itemTitle = titles[i];
      const itemSlug = itemTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-');
      const itemPath = titles.length === 1 && reqPath ? reqPath.trim() : `/category/${itemSlug || 'items'}`;

      let insertPayload: any = {
        header_item_id: headerId,
        title: itemTitle,
        sub_heading: cleanSubHeading,
        layout: cleanLayout,
        image_url: cleanImageUrl,
        path: itemPath,
        order_index: baseOrder + i,
        is_active: typeof is_active === 'boolean' ? is_active : true,
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await supabase
        .from(HeaderNavModel.dropdownItemsTable)
        .insert([insertPayload])
        .select()
        .single();

      // Fallback if column layout or image_url or sub_heading doesn't exist on SQL table yet
      if (error && (error.code === 'PGRST204' || error.message?.includes('image_url') || error.message?.includes('layout') || error.message?.includes('sub_heading'))) {
        delete insertPayload.layout;
        delete insertPayload.image_url;
        let retryResult = await supabase
          .from(HeaderNavModel.dropdownItemsTable)
          .insert([insertPayload])
          .select()
          .single();

        if (retryResult.error && (retryResult.error.code === 'PGRST204' || retryResult.error.message?.includes('sub_heading'))) {
          delete insertPayload.sub_heading;
          retryResult = await supabase
            .from(HeaderNavModel.dropdownItemsTable)
            .insert([insertPayload])
            .select()
            .single();
        }

        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        throw new AppError(`Failed to create dropdown item: ${error.message}`, 400);
      }

      if (data) {
        await saveSubHeadingMetaForId(data.id, cleanSubHeading, cleanLayout, cleanImageUrl);
        createdItems.push({
          ...data,
          sub_heading: cleanSubHeading,
          layout: cleanLayout,
          image_url: cleanImageUrl,
        });
      }
    }

    const message = titles.length > 1
      ? `${titles.length} dropdown items added successfully under "${cleanSubHeading || 'category'}"`
      : 'Dropdown item added successfully';

    return successResponse(res, message, titles.length > 1 ? createdItems : createdItems[0], 201);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/header-nav/admin/sub-items/:subId (Update dropdown sub-item)
export const updateDropdownItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subId } = req.params;
    const { title, sub_heading, layout, image_url, path, order_index, is_active } = req.body;

    const supabase = getDb();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (path !== undefined) updates.path = path.trim();
    if (order_index !== undefined) updates.order_index = order_index;
    if (is_active !== undefined) updates.is_active = is_active;

    let cleanSubHeading: string | null | undefined = undefined;
    if (sub_heading !== undefined) {
      cleanSubHeading = sub_heading && String(sub_heading).trim() ? String(sub_heading).trim() : null;
      updates.sub_heading = cleanSubHeading;
    }

    let cleanLayout: 'column' | 'row' | undefined = undefined;
    if (layout !== undefined) {
      cleanLayout = layout === 'row' ? 'row' : 'column';
      updates.layout = cleanLayout;
    }

    let cleanImageUrl: string | null | undefined = undefined;
    if (image_url !== undefined) {
      cleanImageUrl = image_url && String(image_url).trim() ? String(image_url).trim() : null;
      updates.image_url = cleanImageUrl;
    }

    let { data, error } = await supabase
      .from(HeaderNavModel.dropdownItemsTable)
      .update(updates)
      .eq('id', subId)
      .select()
      .single();

    // Fallback if column layout or image_url or sub_heading doesn't exist on SQL table yet
    if (error && (error.code === 'PGRST204' || error.message?.includes('image_url') || error.message?.includes('layout') || error.message?.includes('sub_heading'))) {
      delete updates.layout;
      delete updates.image_url;
      if (error.message?.includes('sub_heading')) {
        delete updates.sub_heading;
      }
      const retryResult = await supabase
        .from(HeaderNavModel.dropdownItemsTable)
        .update(updates)
        .eq('id', subId)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      throw new AppError(`Failed to update dropdown item: ${error.message}`, 400);
    }

    const currentMetaMap = await getSubHeadingsMetaMap();
    const currentMeta = currentMetaMap[subId] || { sub_heading: null, layout: 'column', image_url: null };
    const finalSubHeading = cleanSubHeading !== undefined ? cleanSubHeading : (data?.sub_heading || currentMeta.sub_heading);
    const finalLayout: 'column' | 'row' = cleanLayout !== undefined ? cleanLayout : (data?.layout || currentMeta.layout || 'column');
    const finalImageUrl = cleanImageUrl !== undefined ? cleanImageUrl : (data?.image_url || currentMeta.image_url || null);

    await saveSubHeadingMetaForId(subId, finalSubHeading, finalLayout, finalImageUrl);

    // If sub_heading has other sibling items under same header and layout changed, sync layout to siblings
    if (finalSubHeading && cleanLayout !== undefined && data?.header_item_id) {
      try {
        const { data: siblings } = await supabase
          .from(HeaderNavModel.dropdownItemsTable)
          .select('id')
          .eq('header_item_id', data.header_item_id);

        if (siblings && siblings.length > 0) {
          for (const sib of siblings) {
            if (sib.id !== subId) {
              const sibMeta = currentMetaMap[sib.id];
              if (sibMeta && sibMeta.sub_heading === finalSubHeading) {
                await saveSubHeadingMetaForId(sib.id, finalSubHeading, finalLayout, sibMeta.image_url);
              }
            }
          }
        }
      } catch (_) {}
    }

    return successResponse(res, 'Dropdown item updated successfully', {
      ...data,
      sub_heading: finalSubHeading,
      layout: finalLayout,
      image_url: finalImageUrl,
    });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/header-nav/admin/sub-items/:subId (Delete dropdown sub-item)
export const deleteDropdownItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subId } = req.params;
    const supabase = getDb();

    const { error } = await supabase
      .from(HeaderNavModel.dropdownItemsTable)
      .delete()
      .eq('id', subId);

    if (error) {
      throw new AppError(`Failed to delete dropdown item: ${error.message}`, 400);
    }

    await saveSubHeadingMetaForId(subId, null, 'column', null);

    return successResponse(res, 'Dropdown item deleted successfully', { id: subId });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/header-nav/admin/upload-dropdown-image (Admin - Upload image for mobile view, max 2MB)
export const uploadDropdownItemImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No image file uploaded', 400);
    }

    // Strict 2MB check as requested ("2 mb se jada nhi uplaod krne ke liye")
    if (req.file.size > 2 * 1024 * 1024) {
      throw new AppError('Dropdown item image size must not exceed 2MB', 400);
    }

    if (!req.file.mimetype.startsWith('image/')) {
      throw new AppError('Only image files (JPG, PNG, WebP, SVG) are allowed', 400);
    }

    const imageUrl = await uploadToR2(req.file, 'dropdown-items');

    const subId = req.body?.subId;
    if (subId) {
      try {
        const supabase = getDb();
        await supabase
          .from(HeaderNavModel.dropdownItemsTable)
          .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
          .eq('id', subId);
      } catch (_) {}

      try {
        const metaMap = await getSubHeadingsMetaMap();
        const existingMeta = metaMap[subId] || { sub_heading: null, layout: 'column', image_url: null };
        await saveSubHeadingMetaForId(subId, existingMeta.sub_heading, existingMeta.layout, imageUrl);
      } catch (_) {}
    }

    return successResponse(res, 'Dropdown image uploaded to cloud successfully', { imageUrl });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/header-nav/admin/upload-header-image (Admin - Upload image for main header category, max 2MB)
export const uploadHeaderItemImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No image file uploaded', 400);
    }

    if (req.file.size > 2 * 1024 * 1024) {
      throw new AppError('Header category image size must not exceed 2MB', 400);
    }

    if (!req.file.mimetype.startsWith('image/')) {
      throw new AppError('Only image files (JPG, PNG, WebP, SVG) are allowed', 400);
    }

    const imageUrl = await uploadToR2(req.file, 'header-categories');

    const headerId = req.body?.headerId;
    if (headerId) {
      try {
        const supabase = getDb();
        await supabase
          .from(HeaderNavModel.headerItemsTable)
          .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
          .eq('id', headerId);
      } catch (_) {}
    }

    return successResponse(res, 'Header category image uploaded to cloud successfully', { imageUrl });
  } catch (error) {
    return next(error);
  }
};


export const DEFAULT_TEDDY_URL = 'https://pub-fa320b17ccf34606b113e58ad862cd19.r2.dev/banners/default-login-banner-teddy.jpg';
export const DEFAULT_GIRLS_URL = 'https://pub-fa320b17ccf34606b113e58ad862cd19.r2.dev/banners/default-login-banner-girls.jpg';

export const defaultBannerImages: SavedBannerImageItem[] = [
  {
    url: DEFAULT_TEDDY_URL,
    name: '🧸 Default YTeddybags & Toys Banner',
    is_default: true,
  },
  {
    url: DEFAULT_GIRLS_URL,
    name: '🎒 Teddybags Lifestyle Banner',
    is_default: true,
  },
];

// Helper to normalize saved images into SavedBannerImageItem objects
export const normalizeSavedImages = (list?: any[]): SavedBannerImageItem[] => {
  const result: SavedBannerImageItem[] = [];
  const seenUrls = new Set<string>();

  // Ensure default teddy banner is first
  result.push(defaultBannerImages[0]);
  seenUrls.add(DEFAULT_TEDDY_URL);
  seenUrls.add('/images/login-banner-teddy.jpg');

  if (Array.isArray(list)) {
    for (const item of list) {
      if (!item) continue;
      let url = '';
      let name = '';
      let is_default = false;

      if (typeof item === 'string') {
        url = item.trim();
        if (url === '/images/login-banner-teddy.jpg' || url === DEFAULT_TEDDY_URL) {
          continue;
        }
        if (url === '/images/login-banner-girls.jpg' || url === DEFAULT_GIRLS_URL) {
          url = DEFAULT_GIRLS_URL;
          name = '🎒 Teddybags Lifestyle Banner';
          is_default = true;
        } else {
          name = url.split('/').pop() || 'Uploaded Banner';
        }
      } else if (typeof item === 'object' && item.url) {
        url = String(item.url).trim();
        if (url === '/images/login-banner-teddy.jpg' || url === DEFAULT_TEDDY_URL) {
          continue;
        }
        if (url === '/images/login-banner-girls.jpg' || url === DEFAULT_GIRLS_URL) {
          url = DEFAULT_GIRLS_URL;
          name = '🎒 Teddybags Lifestyle Banner';
          is_default = true;
        } else {
          name = item.name || url.split('/').pop() || 'Uploaded Banner';
          is_default = Boolean(item.is_default);
        }
      }

      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        result.push({ url, name, is_default });
      }
    }
  }

  // Ensure girls banner is present as second default
  if (!seenUrls.has(DEFAULT_GIRLS_URL)) {
    result.push(defaultBannerImages[1]);
    seenUrls.add(DEFAULT_GIRLS_URL);
  }

  return result;
};

const defaultLoginBanner: LoginBannerConfig = {
  is_active: true,
  image_url: DEFAULT_TEDDY_URL,
  heading: 'FLAT ₹300 OFF',
  subheading: 'ON YOUR 1ST ORDER + EXCITING OFFERS*',
  coupon_code: 'YTEDDY300',
  badge_text: '₹300 OFF',
  terms_text: '*T&C Applied | Limited Time Offer',
  bg_color: '#FEEFEA',
  saved_images: defaultBannerImages,
  updated_at: new Date().toISOString(),
};

// Helper to normalize the full banner config object
const sanitizeBannerConfig = (raw: any): LoginBannerConfig => {
  if (!raw || typeof raw !== 'object') return defaultLoginBanner;
  let activeUrl = raw.image_url || DEFAULT_TEDDY_URL;
  if (activeUrl === '/images/login-banner-teddy.jpg') activeUrl = DEFAULT_TEDDY_URL;
  if (activeUrl === '/images/login-banner-girls.jpg') activeUrl = DEFAULT_GIRLS_URL;

  return {
    is_active: raw.is_active !== false,
    image_url: activeUrl,
    heading: raw.heading || defaultLoginBanner.heading,
    subheading: raw.subheading || defaultLoginBanner.subheading,
    coupon_code: raw.coupon_code || defaultLoginBanner.coupon_code,
    badge_text: raw.badge_text || defaultLoginBanner.badge_text,
    terms_text: raw.terms_text || defaultLoginBanner.terms_text,
    bg_color: raw.bg_color || defaultLoginBanner.bg_color,
    saved_images: normalizeSavedImages(raw.saved_images),
    updated_at: raw.updated_at || new Date().toISOString(),
  };
};

// GET /api/v1/header-nav/login-banner (Public - for login page & store front)
export const getLoginBanner = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Try reading from Supabase DB (ecommerce store config table)
    if (supabase) {
      try {
        const { data: ecomRow } = await supabase
          .from('ecommerce')
          .select('*')
          .eq('slug', 'login-banner-config')
          .maybeSingle();

        if (ecomRow && ecomRow.address) {
          try {
            const parsed = JSON.parse(ecomRow.address);
            if (parsed && typeof parsed === 'object') {
              const sanitized = sanitizeBannerConfig(parsed);
              return successResponse(res, 'Login banner configuration from Database', sanitized);
            }
          } catch (_) {}
        }

        // 2. Try reading from site_settings table if available
        const { data: settingRow } = await supabase
          .from(HeaderNavModel.siteSettingsTable)
          .select('*')
          .eq('key', 'login_banner')
          .maybeSingle();

        if (settingRow && settingRow.value) {
          const sanitized = sanitizeBannerConfig(settingRow.value);
          return successResponse(res, 'Login banner configuration from DB', sanitized);
        }
      } catch (dbErr) {
        console.warn('[Database] Read login banner from DB error:', dbErr);
      }
    }


    return successResponse(res, 'Default login banner configuration', defaultLoginBanner);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/header-nav/admin/login-banner (Admin - update login banner in DB & file)
export const updateLoginBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      is_active = true,
      image_url = DEFAULT_TEDDY_URL,
      heading = 'FLAT ₹300 OFF',
      subheading = 'ON YOUR 1ST ORDER + EXCITING OFFERS*',
      coupon_code = 'YTEDDY300',
      badge_text = '₹300 OFF',
      terms_text = '*T&C Applied | Limited Time Offer',
      bg_color = '#FEEFEA',
      saved_images = defaultBannerImages,
    } = req.body;

    let cleanImageUrl = String(image_url).trim();
    if (cleanImageUrl === '/images/login-banner-teddy.jpg') cleanImageUrl = DEFAULT_TEDDY_URL;
    if (cleanImageUrl === '/images/login-banner-girls.jpg') cleanImageUrl = DEFAULT_GIRLS_URL;

    const normalizedSaved = normalizeSavedImages(saved_images);

    // If cleanImageUrl not in saved images, prepend it
    if (cleanImageUrl && !normalizedSaved.some((img) => img.url === cleanImageUrl)) {
      const name = cleanImageUrl.split('/').pop() || 'Selected Banner';
      normalizedSaved.unshift({ url: cleanImageUrl, name, is_default: false });
    }

    const updatedConfig: LoginBannerConfig = {
      is_active: Boolean(is_active),
      image_url: cleanImageUrl || DEFAULT_TEDDY_URL,
      heading: String(heading).trim(),
      subheading: String(subheading).trim(),
      coupon_code: String(coupon_code).trim().toUpperCase(),
      badge_text: String(badge_text).trim(),
      terms_text: String(terms_text).trim(),
      bg_color: String(bg_color).trim(),
      saved_images: normalizedSaved,
      updated_at: new Date().toISOString(),
    };

    // 1. Save to Supabase DB ('ecommerce' table as store configuration record)
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { error: ecomErr } = await supabase
          .from('ecommerce')
          .upsert(
            {
              slug: 'login-banner-config',
              name: 'Login Offer Banner Config',
              email: 'banner@yteddybags.internal',
              logo: updatedConfig.image_url,
              address: JSON.stringify(updatedConfig),
              isActive: updatedConfig.is_active,
              updatedAt: new Date().toISOString(),
            },
            { onConflict: 'slug' }
          );

        if (ecomErr) {
          console.warn('[Database] Supabase ecommerce table upsert:', ecomErr.message);
        } else {
          console.log('[Database] Login banner saved to Supabase ecommerce table successfully!');
        }

        // Also upsert to site_settings table if exists
        try {
          await supabase
            .from(HeaderNavModel.siteSettingsTable)
            .upsert(
              {
                key: 'login_banner',
                value: updatedConfig,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'key' }
            );
        } catch (_) {}
      } catch (dbErr) {
        console.warn('[Database] Supabase DB write error:', dbErr);
      }
    }


    return successResponse(res, 'Login banner updated and saved to Database successfully', updatedConfig);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/header-nav/admin/upload-banner-image (Admin - Upload image to Cloudflare R2 & persist to DB)
export const uploadBannerImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No image file uploaded', 400);
    }

    // Upload to Cloudflare R2 directly (binary stored in Cloudflare R2 bucket)
    let imageUrl = '';
    try {
      imageUrl = await uploadToR2(req.file, 'banners');
      console.log('[Cloudflare R2] Banner image uploaded successfully to Cloudflare:', imageUrl);
    } catch (r2Err: any) {
      throw new AppError(`Image upload failed: ${r2Err?.message || r2Err}`, 500);
    }

    const uploadedFileName = req.file.originalname || path.basename(imageUrl);
    const newImageItem: SavedBannerImageItem = {
      url: imageUrl,
      name: uploadedFileName,
      is_default: false,
    };

    // Fetch existing configuration from Supabase DB or file
    let existingConfig: LoginBannerConfig = { ...defaultLoginBanner };
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data: ecomRow } = await supabase
          .from('ecommerce')
          .select('*')
          .eq('slug', 'login-banner-config')
          .maybeSingle();

        if (ecomRow?.address) {
          try {
            existingConfig = sanitizeBannerConfig(JSON.parse(ecomRow.address));
          } catch (_) {}
        }
      } catch (_) {}
    }

    // Prepend new image to saved_images list
    let currentSaved = normalizeSavedImages(existingConfig.saved_images);
    currentSaved = [
      newImageItem,
      ...currentSaved.filter((img) => img.url !== imageUrl),
    ];

    existingConfig.image_url = imageUrl;
    existingConfig.saved_images = currentSaved;
    existingConfig.updated_at = new Date().toISOString();

    // Persist to Supabase Database (ecommerce table)
    if (supabase) {
      try {
        await supabase
          .from('ecommerce')
          .upsert(
            {
              slug: 'login-banner-config',
              name: 'Login Offer Banner Config',
              email: 'banner@yteddybags.internal',
              logo: imageUrl,
              address: JSON.stringify(existingConfig),
              isActive: existingConfig.is_active !== false,
              updatedAt: new Date().toISOString(),
            },
            { onConflict: 'slug' }
          );

        try {
          await supabase
            .from(HeaderNavModel.siteSettingsTable)
            .upsert(
              {
                key: 'login_banner',
                value: existingConfig,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'key' }
            );
        } catch (_) {}
      } catch (dbErr) {
        console.warn('[Database] Supabase update after upload error:', dbErr);
      }
    }


    return successResponse(res, 'Banner image uploaded to Cloudflare and saved to Database successfully', {
      imageUrl,
      saved_images: currentSaved,
      banner: existingConfig,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/header-nav/admin/delete-banner-image (Admin - Delete image from Cloudflare R2 and Supabase DB)
export const deleteBannerImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      throw new AppError('Image URL is required for deletion', 400);
    }

    const targetUrl = url.trim();

    // Prevent deletion of default system banner images
    if (
      targetUrl === DEFAULT_TEDDY_URL ||
      targetUrl === DEFAULT_GIRLS_URL ||
      targetUrl.includes('default-login-banner-teddy') ||
      targetUrl.includes('default-login-banner-girls') ||
      targetUrl.includes('/images/login-banner-')
    ) {
      throw new AppError('Default system banner images cannot be deleted', 400);
    }

    // Fetch existing configuration from Supabase DB or file
    let existingConfig: LoginBannerConfig = { ...defaultLoginBanner };
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data: ecomRow } = await supabase
          .from('ecommerce')
          .select('*')
          .eq('slug', 'login-banner-config')
          .maybeSingle();

        if (ecomRow?.address) {
          try {
            existingConfig = sanitizeBannerConfig(JSON.parse(ecomRow.address));
          } catch (_) {}
        }
      } catch (_) {}
    }

    // Filter out targetUrl from saved images
    let currentSaved = normalizeSavedImages(existingConfig.saved_images);
    currentSaved = currentSaved.filter((img) => img.url !== targetUrl);

    // If currently selected image was the deleted one, reset to default teddy banner
    if (existingConfig.image_url === targetUrl) {
      existingConfig.image_url = DEFAULT_TEDDY_URL;
    }
    existingConfig.saved_images = currentSaved;
    existingConfig.updated_at = new Date().toISOString();

    // Delete image from Cloudflare R2 bucket
    await deleteFromR2(targetUrl);


    // Persist updated configuration in Supabase Database
    if (supabase) {
      try {
        await supabase
          .from('ecommerce')
          .upsert(
            {
              slug: 'login-banner-config',
              name: 'Login Offer Banner Config',
              email: 'banner@yteddybags.internal',
              logo: existingConfig.image_url,
              address: JSON.stringify(existingConfig),
              isActive: existingConfig.is_active !== false,
              updatedAt: new Date().toISOString(),
            },
            { onConflict: 'slug' }
          );

        try {
          await supabase
            .from(HeaderNavModel.siteSettingsTable)
            .upsert(
              {
                key: 'login_banner',
                value: existingConfig,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'key' }
            );
        } catch (_) {}
      } catch (dbErr) {
        console.warn('[Database] Supabase update after delete error:', dbErr);
      }
    }


    return successResponse(res, 'Banner image deleted successfully', {
      saved_images: currentSaved,
      banner: existingConfig,
    });
  } catch (error) {
    return next(error);
  }
};

// ====================================================================
// Legal & Help Pages (Terms of Use, Privacy Policy, Get Help)
// ====================================================================


export const defaultSitePages: Record<
  string,
  { slug: string; title: string; description: string; updated_at?: string }
> = {
  'terms-of-use': {
    slug: 'terms-of-use',
    title: 'Terms of Use',
    description: `Welcome to YTeddybags. By accessing or using our website, services, and purchasing products, you agree to comply with and be bound by the following terms and conditions.

1. General Overview
YTeddybags operates an e-commerce platform offering premium quality teddy bags, toys, soft toys, and lifestyle accessories. All orders placed are subject to product availability and confirmation of payment.

2. Intellectual Property
All content, product designs, imagery, trademarks, logos, and graphics displayed on this platform are the proprietary intellectual property of YTeddybags and are protected under copyright and trademark laws.

3. User Responsibilities
When registering an account, you must provide truthful, complete, and updated information. You are solely responsible for maintaining the confidentiality of your account credentials.

4. Orders and Pricing
We reserve the right to refuse or cancel any order for reasons including stock limitations, errors in pricing or product descriptions, or potential fraudulent activity.

5. Limitation of Liability
YTeddybags shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use our services or products.`,
    updated_at: new Date().toISOString(),
  },
  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    description: `At YTeddybags, your privacy is our top priority. We are committed to protecting your personal data and ensuring a secure shopping experience.

1. Information We Collect
We collect personal information necessary to deliver our services, including:
• Full Name and Contact Details (Mobile Number & Email Address)
• Shipping and Billing Address
• Device and Browser information for platform optimization

2. How We Use Your Information
Your information is utilized exclusively for:
• Processing, shipping, and tracking your orders
• Account authentication and security verification
• Providing customer support and order updates
• Improving our catalog and promotional offerings

3. Data Protection and Security
We implement strict industry-standard security protocols to protect your personal information against unauthorized access, alteration, or disclosure. All payment transactions are encrypted via secure SSL gateways.

4. Third-Party Sharing
We never sell, rent, or trade your personal information to third parties. We share data solely with trusted logistics partners and payment gateways required to fulfill your orders.

5. Contact Us
For any privacy-related inquiries, please reach out to our privacy officer at privacy@yteddybags.com.`,
    updated_at: new Date().toISOString(),
  },
  'get-help': {
    slug: 'get-help',
    title: 'Customer Help & Support',
    description: `Need assistance with your YTeddybags account or recent orders? We are here to help you every step of the way.

1. Having Trouble Logging In?
• Mobile Number: Ensure your 10-digit mobile number is entered correctly without extra spaces or symbols.
• Google Sign-in: You can use the convenient "Continue with Google" button for instant one-click login. Make sure you have agreed to the Terms of Use and Privacy Policy.
• Account Verification: If you do not receive an OTP or login link, ensure your network connection is stable.

2. Order Tracking & Shipping
• Once your order is dispatched, a tracking number and courier link will be sent to your registered email and SMS.
• Standard delivery takes 3 to 7 business days across India.

3. Returns & Replacements
• We offer a hassle-free 7-day return and exchange policy for defective or damaged items.
• To initiate a return, visit your order history or contact our support desk.

4. Contact Support Desk
• Email Support: support@yteddybags.com
• Working Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST.`,
    updated_at: new Date().toISOString(),
  },
};

async function fetchStoredPages(): Promise<
  Record<string, { slug: string; title: string; description: string; updated_at?: string }>
> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      // 1. Check site_settings table
      const { data: settingRow } = await supabase
        .from(HeaderNavModel.siteSettingsTable)
        .select('*')
        .eq('key', 'site_pages')
        .maybeSingle();

      if (settingRow && settingRow.value && typeof settingRow.value === 'object') {
        return { ...defaultSitePages, ...settingRow.value };
      }

      // 2. Check ecommerce table
      const { data: ecomRow } = await supabase
        .from('ecommerce')
        .select('*')
        .eq('slug', 'site-pages-config')
        .maybeSingle();

      if (ecomRow && ecomRow.address) {
        try {
          const parsed = JSON.parse(ecomRow.address);
          if (parsed && typeof parsed === 'object') {
            return { ...defaultSitePages, ...parsed };
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[Database] Read site_pages error:', err);
    }
  }


  return defaultSitePages;
}

async function persistStoredPages(pages: Record<string, any>) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      // 1. Save in site_settings
      await supabase
        .from(HeaderNavModel.siteSettingsTable)
        .upsert(
          {
            key: 'site_pages',
            value: pages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      // 2. Save in ecommerce table as backup
      await supabase
        .from('ecommerce')
        .upsert(
          {
            slug: 'site-pages-config',
            name: 'Legal and Help Pages Config',
            email: 'pages@yteddybags.internal',
            address: JSON.stringify(pages),
            isActive: true,
            updatedAt: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        );
    } catch (err) {
      console.warn('[Database] Persist site_pages error:', err);
    }
  }

}

// GET /api/v1/header-nav/pages (Public)
export const getAllPublicPages = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pages = await fetchStoredPages();
    return successResponse(res, 'Public pages retrieved successfully', pages);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/header-nav/pages/:slug (Public)
export const getPublicPageBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const pages = await fetchStoredPages();
    const page =
      pages[slug] ||
      pages[slug.replace(/-/g, '_')] ||
      defaultSitePages[slug] ||
      defaultSitePages[slug.replace(/-/g, '_')];

    if (!page) {
      return next(new AppError('Page not found', 404));
    }
    return successResponse(res, 'Page retrieved successfully', page);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/header-nav/admin/pages/:slug (Admin - update page title and description)
export const updatePublicPage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { title, description } = req.body;

    if (!title || !String(title).trim()) {
      return next(new AppError('Title is required', 400));
    }

    const pages = await fetchStoredPages();
    const existing = pages[slug] || defaultSitePages[slug] || { slug, title: '', description: '' };

    const updatedPage = {
      ...existing,
      slug,
      title: String(title).trim(),
      description: String(description || '').trim(),
      updated_at: new Date().toISOString(),
    };

    pages[slug] = updatedPage;
    await persistStoredPages(pages);

    return successResponse(res, `${updatedPage.title} updated successfully in Database`, {
      page: updatedPage,
      pages,
    });
  } catch (error) {
    return next(error);
  }
};

// ====================================================================
// Background Theme Management (Big Screen / Desktop & Mobile Cloud Doodles)
// ====================================================================


export const defaultBgTheme: BgThemeConfig = {
  desktop: {
    bg_type: 'default',
    bg_color: '#FDF0EC',
    gradient_to: '#FDF5F2',
    use_gradient: true,
    pattern_size: 55,
    pattern_opacity: 0.25,
    pattern_gap: 65,
    apply_to_login: false,
    doodles: [],
  },
  mobile: {
    bg_type: 'default',
    bg_color: '#FDF0EC',
    gradient_to: '#FDF5F2',
    use_gradient: true,
    pattern_size: 40,
    pattern_opacity: 0.22,
    pattern_gap: 50,
    apply_to_login: false,
    doodles: [],
  },
  apply_to_login: false,
  updated_at: new Date().toISOString(),
};

function sanitizeDeviceConfig(input: any, fallback: DeviceBgConfig): DeviceBgConfig {
  if (!input || typeof input !== 'object') return fallback;
  return {
    bg_type: ['default', 'color', 'gradient', 'custom'].includes(input.bg_type) ? input.bg_type : fallback.bg_type,
    bg_color: typeof input.bg_color === 'string' && input.bg_color.trim() ? input.bg_color.trim() : fallback.bg_color,
    gradient_to: typeof input.gradient_to === 'string' && input.gradient_to.trim() ? input.gradient_to.trim() : fallback.gradient_to,
    use_gradient: typeof input.use_gradient === 'boolean' ? input.use_gradient : fallback.use_gradient,
    pattern_size: typeof input.pattern_size === 'number' && input.pattern_size >= 15 && input.pattern_size <= 250 ? input.pattern_size : fallback.pattern_size,
    pattern_opacity: typeof input.pattern_opacity === 'number' && input.pattern_opacity >= 0.01 && input.pattern_opacity <= 1 ? input.pattern_opacity : fallback.pattern_opacity,
    pattern_gap: typeof input.pattern_gap === 'number' && input.pattern_gap >= 10 && input.pattern_gap <= 250 ? input.pattern_gap : fallback.pattern_gap,
    apply_to_login: typeof input.apply_to_login === 'boolean' ? input.apply_to_login : (fallback.apply_to_login ?? false),
    doodles: Array.isArray(input.doodles)
      ? input.doodles
          .map((d: any, idx: number) => ({
            id: d?.id || `doodle-${idx}-${Date.now()}`,
            url: String(d?.url || ''),
            name: String(d?.name || 'Doodle Pattern'),
            created_at: d?.created_at || new Date().toISOString(),
            isActive: typeof d?.isActive === 'boolean' ? d.isActive : true,
          }))
          .filter((d: DoodleItem) => Boolean(d.url))
      : fallback.doodles,
  };
}

function sanitizeBgTheme(input: any): BgThemeConfig {
  if (!input || typeof input !== 'object') return defaultBgTheme;
  return {
    desktop: sanitizeDeviceConfig(input.desktop, defaultBgTheme.desktop),
    mobile: sanitizeDeviceConfig(input.mobile, defaultBgTheme.mobile),
    apply_to_login: typeof input.apply_to_login === 'boolean' ? input.apply_to_login : (input.desktop?.apply_to_login ?? false),
    updated_at: input.updated_at || new Date().toISOString(),
  };
}

async function fetchStoredBgTheme(): Promise<BgThemeConfig> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      // 1. Check site_settings table
      const { data: settingRow } = await supabase
        .from(HeaderNavModel.siteSettingsTable)
        .select('*')
        .eq('key', 'bg_theme')
        .maybeSingle();

      if (settingRow && settingRow.value && typeof settingRow.value === 'object') {
        return sanitizeBgTheme(settingRow.value);
      }

      // 2. Check ecommerce table as backup
      const { data: ecomRow } = await supabase
        .from('ecommerce')
        .select('*')
        .eq('slug', 'bg-theme-config')
        .maybeSingle();

      if (ecomRow && ecomRow.address) {
        try {
          const parsed = JSON.parse(ecomRow.address);
          if (parsed && typeof parsed === 'object') {
            return sanitizeBgTheme(parsed);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[Database] Read bg_theme error:', err);
    }
  }


  return defaultBgTheme;
}

async function persistStoredBgTheme(theme: BgThemeConfig) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      // 1. Save in site_settings
      await supabase
        .from(HeaderNavModel.siteSettingsTable)
        .upsert(
          {
            key: 'bg_theme',
            value: theme,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      // 2. Save in ecommerce table as backup
      await supabase
        .from('ecommerce')
        .upsert(
          {
            slug: 'bg-theme-config',
            name: 'Background Theme Config',
            email: 'bgtheme@yteddybags.internal',
            address: JSON.stringify(theme),
            isActive: true,
            updatedAt: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        );
    } catch (err) {
      console.warn('[Database] Persist bg_theme error:', err);
    }
  }

}

// GET /api/v1/header-nav/bg-theme (Public)
export const getBgTheme = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const theme = await fetchStoredBgTheme();
    return successResponse(res, 'Background theme retrieved successfully', theme);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/header-nav/admin/bg-theme (Admin)
export const updateBgTheme = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentTheme = await fetchStoredBgTheme();
    const updatedTheme: BgThemeConfig = {
      desktop: req.body.desktop ? sanitizeDeviceConfig(req.body.desktop, currentTheme.desktop) : currentTheme.desktop,
      mobile: req.body.mobile ? sanitizeDeviceConfig(req.body.mobile, currentTheme.mobile) : currentTheme.mobile,
      updated_at: new Date().toISOString(),
    };

    await persistStoredBgTheme(updatedTheme);
    return successResponse(res, 'Background theme updated successfully in Database', updatedTheme);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/header-nav/admin/bg-theme/upload-doodle (Admin - uploads doodle PNGs to Cloudflare R2 Cloud)
export const uploadBgThemeDoodle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawFiles: Express.Multer.File[] = [];
    if (Array.isArray(req.files)) {
      rawFiles.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
      Object.values(req.files).forEach((f) => {
        if (Array.isArray(f)) rawFiles.push(...f);
        else if (f) rawFiles.push(f);
      });
    } else if (req.file) {
      rawFiles.push(req.file);
    }

    if (rawFiles.length === 0) {
      return next(new AppError('No image files provided for upload', 400));
    }

    const device = req.body.device === 'mobile' ? 'mobile' : 'desktop';
    const newDoodles: DoodleItem[] = [];

    for (const file of rawFiles) {
      const cloudUrl = await uploadToR2(file, 'bg-themes');
      newDoodles.push({
        id: `doodle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url: cloudUrl,
        name: file.originalname || `doodle-${Date.now()}.png`,
        created_at: new Date().toISOString(),
        isActive: true,
      });
    }

    const currentTheme = await fetchStoredBgTheme();
    const targetDevice = currentTheme[device];
    targetDevice.doodles = [...(targetDevice.doodles || []), ...newDoodles];
    targetDevice.bg_type = 'custom'; // Switch to custom when doodles exist
    currentTheme.updated_at = new Date().toISOString();

    await persistStoredBgTheme(currentTheme);

    return successResponse(res, `${newDoodles.length} doodle(s) uploaded to cloud successfully`, {
      doodles: newDoodles,
      theme: currentTheme,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/header-nav/admin/bg-theme/delete-doodle (Admin - deletes doodle from Cloudflare R2 and DB)
export const deleteBgThemeDoodle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, device } = req.body;
    if (!url || typeof url !== 'string') {
      return next(new AppError('Doodle URL is required for deletion', 400));
    }

    const targetUrl = url.trim();
    // Delete from Cloudflare R2 cloud storage
    await deleteFromR2(targetUrl);

    const currentTheme = await fetchStoredBgTheme();
    if (device === 'desktop') {
      currentTheme.desktop.doodles = (currentTheme.desktop.doodles || []).filter((d: DoodleItem) => d.url !== targetUrl);
    } else if (device === 'mobile') {
      currentTheme.mobile.doodles = (currentTheme.mobile.doodles || []).filter((d: DoodleItem) => d.url !== targetUrl);
    } else {
      currentTheme.desktop.doodles = (currentTheme.desktop.doodles || []).filter((d: DoodleItem) => d.url !== targetUrl);
      currentTheme.mobile.doodles = (currentTheme.mobile.doodles || []).filter((d: DoodleItem) => d.url !== targetUrl);
    }
    currentTheme.updated_at = new Date().toISOString();

    await persistStoredBgTheme(currentTheme);

    return successResponse(res, 'Doodle image deleted successfully from cloud and database', currentTheme);
  } catch (error) {
    return next(error);
  }
};


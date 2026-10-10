import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';

export type HomeSectionType =
  | 'hero_banner'
  | 'sub_banner'
  | 'occasions'
  | 'bestsellers'
  | 'custom_cards'
  | 'promo_banner';

export interface HomeSectionLayoutItem {
  id: string; // Unique instance ID, e.g. "hero_banner_1", "promo_banner_top", "custom_cards_1"
  section_type: HomeSectionType;
  custom_label: string;
  is_enabled: boolean;
  order_index: number;

  // In-section space (Inner Padding px)
  padding_top: number;
  padding_bottom: number;

  // Outer section space (Outer Margin px)
  margin_top: number;
  margin_bottom: number;

  // Background color override
  bg_color?: string;

  // Instance-specific overrides (allows different themes, titles & settings when repeated)
  theme?: string;
  section_title?: string;
  section_subtitle?: string;
  cards_per_row?: string | number;
  card_theme?: string;
  border_mode?: 'none' | 'modern' | 'classic' | 'custom_image';
  classic_border_style?: string;
  card_aspect_ratio?: 'square' | 'tall' | 'standard';
  text_position?: string;
  section_bg_mode?: 'transparent' | 'color' | 'gradient';
  section_bg_color?: string;
  banner_height?: 'compact' | 'standard' | 'tall';
  border_radius?: string;
  item_ids?: string[]; // Specific items assigned to this section instance
  items?: any[]; // Full independent item objects for this section!
  view_all_url?: string;
  view_all_text?: string;
  show_view_all?: boolean;
  view_all_link_type?: 'header' | 'dropdown';
  view_all_target_header_id?: string | null;
  view_all_target_dropdown_id?: string | null;
  settings?: Record<string, any>;
}

export const defaultHomeSectionsLayout: HomeSectionLayoutItem[] = [
  {
    id: 'hero_banner_1',
    section_type: 'hero_banner',
    custom_label: 'Hero Banner Carousel',
    is_enabled: true,
    order_index: 1,
    padding_top: 0.0,
    padding_bottom: 0.0,
    margin_top: 0.0,
    margin_bottom: 0.0,
    bg_color: 'transparent',
  },
  {
    id: 'sub_banner_1',
    section_type: 'sub_banner',
    custom_label: 'Quick Categories (Sub-Banner)',
    is_enabled: true,
    order_index: 2,
    padding_top: 0.5,
    padding_bottom: 0.75,
    margin_top: 0.0,
    margin_bottom: 0.0,
    bg_color: 'transparent',
  },
  {
    id: 'occasions_1',
    section_type: 'occasions',
    custom_label: 'Gifts For Every Occasion',
    is_enabled: true,
    order_index: 3,
    padding_top: 1.5,
    padding_bottom: 2.0,
    margin_top: 0.0,
    margin_bottom: 0.0,
    bg_color: 'transparent',
  },
  {
    id: 'bestsellers_1',
    section_type: 'bestsellers',
    custom_label: 'Shop By Bestsellers',
    is_enabled: true,
    order_index: 4,
    padding_top: 2.0,
    padding_bottom: 2.5,
    margin_top: 0.0,
    margin_bottom: 0.0,
    bg_color: 'transparent',
  },
  {
    id: 'custom_cards_1',
    section_type: 'custom_cards',
    custom_label: 'Showcase Cards (Gifts for Every Feeling)',
    is_enabled: true,
    order_index: 5,
    padding_top: 2.0,
    padding_bottom: 2.5,
    margin_top: 0.0,
    margin_bottom: 0.0,
    bg_color: 'transparent',
  },
  {
    id: 'promo_banner_1',
    section_type: 'promo_banner',
    custom_label: 'Special Promo Strip Banner',
    is_enabled: true,
    order_index: 6,
    padding_top: 1.5,
    padding_bottom: 2.0,
    margin_top: 0.0,
    margin_bottom: 0.0,
    bg_color: 'transparent',
  },
];

let memoryLayoutCache: HomeSectionLayoutItem[] = [...defaultHomeSectionsLayout];

function parseRemValue(val: any, fallback: number): number {
  if (typeof val !== 'number' || isNaN(val)) {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) val = parsed;
    else return fallback;
  }
  const num = Math.max(0, val);
  // Auto-convert legacy px values (> 6) to rem
  if (num > 6) {
    return Number((num / 16).toFixed(3));
  }
  return Number(num.toFixed(3));
}

const DEFAULT_SECTION_IDS = [
  'hero_banner_1',
  'sub_banner_1',
  'occasions_1',
  'bestsellers_1',
  'custom_cards_1',
  'promo_banner_1',
];

function sanitizeLayoutItem(item: any, fallbackIndex: number): HomeSectionLayoutItem {
  const validTypes: HomeSectionType[] = [
    'hero_banner',
    'sub_banner',
    'occasions',
    'bestsellers',
    'custom_cards',
    'promo_banner',
  ];

  const section_type: HomeSectionType = validTypes.includes(item.section_type)
    ? item.section_type
    : 'custom_cards';

  const id = item.id && typeof item.id === 'string' && item.id.trim()
    ? item.id.trim()
    : `${section_type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const defaultPadTop =
    section_type === 'hero_banner'
      ? 0
      : section_type === 'sub_banner'
      ? 0.5
      : section_type === 'occasions' || section_type === 'promo_banner'
      ? 1.5
      : 2.0;

  const defaultPadBottom =
    section_type === 'hero_banner'
      ? 0
      : section_type === 'sub_banner'
      ? 0.75
      : section_type === 'occasions' || section_type === 'promo_banner'
      ? 2.0
      : 2.5;

  let padTop = parseRemValue(item.padding_top, defaultPadTop);
  let padBottom = parseRemValue(item.padding_bottom, defaultPadBottom);

  if ((section_type === 'bestsellers' || section_type === 'custom_cards') && padTop === 0) {
    padTop = defaultPadTop;
  }
  if ((section_type === 'bestsellers' || section_type === 'custom_cards') && padBottom === 0) {
    padBottom = defaultPadBottom;
  }

  const settings = item.settings && typeof item.settings === 'object' ? item.settings : {};
  const isDefaultSection = DEFAULT_SECTION_IDS.includes(id);

  const cleanSettings = { ...settings };
  if (isDefaultSection && Array.isArray(cleanSettings.items) && cleanSettings.items.length === 0) {
    delete cleanSettings.items;
  }

  const rawItems = Array.isArray(item.items)
    ? item.items
    : Array.isArray(cleanSettings.items)
    ? cleanSettings.items
    : undefined;

  // Default sections must NEVER have items: [] (empty array) - if empty, they must be undefined
  // so that frontend components always render their items from DB tables!
  // ONLY custom/new sections (added by admin) have items: [] when empty!
  let resolvedItems =
    isDefaultSection && Array.isArray(rawItems) && rawItems.length === 0
      ? undefined
      : rawItems;

  if (section_type === 'bestsellers' && Array.isArray(resolvedItems) && resolvedItems.length > 0) {
    const isFlower = (t: string) => {
      const s = (t || '').toLowerCase();
      return (
        s.includes('pretty in pink') ||
        s.includes('sunflower symphony') ||
        s.includes('blush rose') ||
        s.includes('the muse') ||
        s.includes('white orchid') ||
        s.includes('floral vase')
      );
    };
    const cleaned = resolvedItems.filter((it: any) => !isFlower(it?.title));
    resolvedItems = cleaned.length > 0 ? cleaned : undefined;
  }

  return {
    id,
    section_type,
    custom_label: typeof item.custom_label === 'string' ? item.custom_label.trim() : '',
    is_enabled: item.is_enabled !== false,
    order_index: typeof item.order_index === 'number' ? item.order_index : fallbackIndex + 1,
    padding_top: padTop,
    padding_bottom: padBottom,
    margin_top: parseRemValue(item.margin_top, 0),
    margin_bottom: parseRemValue(item.margin_bottom, 0),
    bg_color: typeof item.bg_color === 'string' && item.bg_color.trim() ? item.bg_color.trim() : 'transparent',
    theme: typeof item.theme === 'string' && item.theme.trim() ? item.theme.trim() : (settings.theme || undefined),
    section_title: typeof item.section_title === 'string' && item.section_title.trim() ? item.section_title.trim() : (settings.section_title || undefined),
    section_subtitle: typeof item.section_subtitle === 'string' && item.section_subtitle.trim() ? item.section_subtitle.trim() : (settings.section_subtitle || undefined),
    view_all_url: typeof item.view_all_url === 'string' && item.view_all_url.trim() ? item.view_all_url.trim() : (settings.view_all_url || undefined),
    view_all_text: typeof item.view_all_text === 'string' && item.view_all_text.trim() ? item.view_all_text.trim() : (settings.view_all_text || undefined),
    show_view_all: item.show_view_all !== undefined ? Boolean(item.show_view_all) : (settings.show_view_all !== undefined ? Boolean(settings.show_view_all) : undefined),
    view_all_link_type: item.view_all_link_type || settings.view_all_link_type || undefined,
    view_all_target_header_id: item.view_all_target_header_id || settings.view_all_target_header_id || undefined,
    view_all_target_dropdown_id: item.view_all_target_dropdown_id || settings.view_all_target_dropdown_id || undefined,
    cards_per_row: item.cards_per_row !== undefined && item.cards_per_row !== null ? String(item.cards_per_row) : (settings.cards_per_row ? String(settings.cards_per_row) : undefined),
    card_theme: typeof item.card_theme === 'string' && item.card_theme.trim() ? item.card_theme.trim() : (settings.card_theme || undefined),
    border_mode: item.border_mode || settings.border_mode || undefined,
    classic_border_style: typeof item.classic_border_style === 'string' && item.classic_border_style.trim() ? item.classic_border_style.trim() : (settings.classic_border_style || undefined),
    card_aspect_ratio: item.card_aspect_ratio || settings.card_aspect_ratio || undefined,
    text_position: typeof item.text_position === 'string' && item.text_position.trim() ? item.text_position.trim() : (settings.text_position || undefined),
    section_bg_mode: item.section_bg_mode || settings.section_bg_mode || undefined,
    section_bg_color: typeof item.section_bg_color === 'string' && item.section_bg_color.trim() ? item.section_bg_color.trim() : (settings.section_bg_color || undefined),
    banner_height: item.banner_height || settings.banner_height || undefined,
    border_radius: typeof item.border_radius === 'string' && item.border_radius.trim() ? item.border_radius.trim() : (settings.border_radius || undefined),
    item_ids: Array.isArray(item.item_ids)
      ? item.item_ids.map(String)
      : Array.isArray(settings.item_ids)
      ? settings.item_ids.map(String)
      : undefined,
    items: resolvedItems,
    settings: {
      ...cleanSettings,
      ...(item.settings && typeof item.settings === 'object' ? item.settings : {}),
      ...(Array.isArray(resolvedItems) && resolvedItems.length > 0 ? { items: resolvedItems } : {}),
    },
  };
}

/**
 * Fetch sections layout from DB with multi-tier fallback
 */
async function fetchAllSectionsLayoutFromDb(): Promise<HomeSectionLayoutItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memoryLayoutCache;

  // 1. Dedicated 'home_sections_layout' table priority (contains all dynamic instances with separated items)
  try {
    const { data, error } = await supabase
      .from('home_sections_layout')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      memoryLayoutCache = data.map((d, idx) => sanitizeLayoutItem(d, idx));
      return memoryLayoutCache;
    }
  } catch (err: any) {
    console.warn('[homeSectionLayout] home_sections_layout table read note:', err?.message || err);
  }

  // 2. 'home_banner_settings' table fallback
  try {
    const { data, error } = await supabase
      .from('home_banner_settings')
      .select('value')
      .eq('key', 'home_sections_layout')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
      memoryLayoutCache = data.value.map((d: any, idx: number) => sanitizeLayoutItem(d, idx));
      return memoryLayoutCache;
    }
  } catch (err: any) {
    console.warn('[homeSectionLayout] home_banner_settings read note:', err?.message || err);
  }

  // 3. 'site_settings' table fallback
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'home_sections_layout')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
      memoryLayoutCache = data.value.map((d: any, idx: number) => sanitizeLayoutItem(d, idx));
      return memoryLayoutCache;
    }
  } catch (_) {}

  return memoryLayoutCache;
}

/**
 * Persist layout across DB tables
 */
async function persistSectionsLayoutToDb(layout: HomeSectionLayoutItem[]): Promise<void> {
  const cleanedLayout = layout.map((item, idx) => {
    const isDefault = DEFAULT_SECTION_IDS.includes(item.id);
    const cleanSettings = { ...(item.settings || {}) };
    if (isDefault) {
      delete cleanSettings.items;
    }
    const cleanItems =
      isDefault && Array.isArray(item.items) && item.items.length === 0
        ? undefined
        : item.items;
    return {
      ...item,
      order_index: idx + 1,
      items: cleanItems,
      settings: cleanSettings,
    };
  });

  memoryLayoutCache = [...cleanedLayout];
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // 1. Mirror to 'home_banner_settings' (Primary JSON storage with exact float rems & per-section overrides)
  try {
    await supabase.from('home_banner_settings').upsert(
      {
        key: 'home_sections_layout',
        value: cleanedLayout,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (err: any) {
    console.warn('[homeSectionLayout] persist home_banner_settings note:', err?.message || err);
  }

  // 2. Try 'home_sections_layout' table with rich override payload
  try {
    await supabase.from('home_sections_layout').delete().neq('id', '___NEVER_MATCH___');
    const fullDbPayload = cleanedLayout.map((item, idx) => {
      const isDefault = DEFAULT_SECTION_IDS.includes(item.id);
      const cleanSettings = { ...(item.settings || {}) };
      if (isDefault) {
        delete cleanSettings.items;
      }
      const resolvedItems =
        isDefault && Array.isArray(item.items) && item.items.length === 0
          ? null
          : Array.isArray(item.items)
          ? item.items
          : null;

      return {
        id: item.id,
        section_type: item.section_type,
        custom_label: item.custom_label || '',
        is_enabled: item.is_enabled,
        order_index: idx + 1,
        padding_top: item.padding_top,
        padding_bottom: item.padding_bottom,
        margin_top: item.margin_top,
        margin_bottom: item.margin_bottom,
        bg_color: item.bg_color || 'transparent',
        theme: item.theme || null,
        section_title: item.section_title || null,
        section_subtitle: item.section_subtitle || null,
        cards_per_row: item.cards_per_row ? String(item.cards_per_row) : null,
        card_theme: item.card_theme || null,
        border_mode: item.border_mode || null,
        classic_border_style: item.classic_border_style || null,
        card_aspect_ratio: item.card_aspect_ratio || null,
        text_position: item.text_position || null,
        section_bg_mode: item.section_bg_mode || null,
        section_bg_color: item.section_bg_color || null,
        banner_height: item.banner_height || null,
        border_radius: item.border_radius || null,
        items: resolvedItems,
        settings: {
          theme: item.theme,
          section_title: item.section_title,
          section_subtitle: item.section_subtitle,
          cards_per_row: item.cards_per_row,
          card_theme: item.card_theme,
          border_mode: item.border_mode,
          classic_border_style: item.classic_border_style,
          card_aspect_ratio: item.card_aspect_ratio,
          text_position: item.text_position,
          section_bg_mode: item.section_bg_mode,
          section_bg_color: item.section_bg_color,
          banner_height: item.banner_height,
          border_radius: item.border_radius,
          item_ids: item.item_ids,
          ...cleanSettings,
          ...(resolvedItems ? { items: resolvedItems } : {}),
        },
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertErr } = await supabase.from('home_sections_layout').upsert(fullDbPayload, { onConflict: 'id' });
    
    // If table does not yet have extended columns or has integer types, fallback to basic payload
    if (upsertErr) {
      const basicPayload = layout.map((item, idx) => ({
        id: item.id,
        section_type: item.section_type,
        custom_label: item.custom_label || '',
        is_enabled: item.is_enabled,
        order_index: idx + 1,
        padding_top: Math.round(item.padding_top),
        padding_bottom: Math.round(item.padding_bottom),
        margin_top: Math.round(item.margin_top),
        margin_bottom: Math.round(item.margin_bottom),
        bg_color: item.bg_color || 'transparent',
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('home_sections_layout').upsert(basicPayload, { onConflict: 'id' });
    }
  } catch (err: any) {
    console.warn('[homeSectionLayout] home_sections_layout table persist note:', err?.message || err);
  }

  // 3. Mirror to 'site_settings'
  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'home_sections_layout',
        value: layout,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  // 4. Mirror to 'ecommerce'
  try {
    await supabase.from('ecommerce').upsert(
      {
        slug: 'home-sections-layout-config',
        name: 'Home Sections Layout Config',
        email: 'layout@yteddybags.internal',
        address: JSON.stringify(layout),
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

// GET /api/v1/home-banners/layout (Public: active sections in order)
export const getPublicSectionsLayout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await fetchAllSectionsLayoutFromDb();
    const activeOrdered = all
      .filter((item) => item.is_enabled !== false)
      .sort((a, b) => a.order_index - b.order_index);

    const supabase = getSupabaseAdmin();
    const inactiveProductIds = new Set<string>();
    const inactiveProductTitles = new Set<string>();

    if (supabase) {
      try {
        const { data: inactiveProds } = await supabase.from('products').select('id, title').eq('is_active', false);
        if (Array.isArray(inactiveProds)) {
          inactiveProds.forEach((p) => {
            if (p.id) inactiveProductIds.add(p.id);
            if (p.title) inactiveProductTitles.add(p.title.toLowerCase().trim());
          });
        }
      } catch (_) {}
    }

    const cleanedSections = activeOrdered.map((sec) => {
      if (Array.isArray(sec.items)) {
        const filteredItems = sec.items.filter((it: any) => {
          if (it.is_active === false) return false;
          if (it.product_id && inactiveProductIds.has(it.product_id)) return false;
          if (it.title && inactiveProductTitles.has(it.title.toLowerCase().trim())) return false;
          return true;
        });
        return {
          ...sec,
          items: filteredItems,
          settings: {
            ...(sec.settings || {}),
            items: filteredItems,
          },
        };
      }
      return sec;
    });

    return successResponse(res, 'Active home sections layout fetched successfully', cleanedSections);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/home-banners/admin/layout (Admin: all sections in order)
export const getAdminSectionsLayout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await fetchAllSectionsLayoutFromDb();
    const sorted = [...all].sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'All home sections layout fetched for admin', sorted);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/layout (Admin: update and save entire layout)
export const updateSectionsLayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('A non-empty array of section layout items is required', 400);
    }

    const sanitized: HomeSectionLayoutItem[] = items.map((item: any, idx: number) => ({
      ...sanitizeLayoutItem(item, idx),
      order_index: idx + 1,
    }));

    await persistSectionsLayoutToDb(sanitized);

    return successResponse(res, 'Home sections layout & spacing updated successfully', sanitized);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/home-banners/admin/layout/section/:id (Admin: get specific section details with its items)
export const getSingleSectionLayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const all = await fetchAllSectionsLayoutFromDb();
    const section = all.find((s) => s.id === id);
    if (!section) {
      throw new AppError(`Section with ID "${id}" not found`, 404);
    }
    return successResponse(res, `Section "${section.custom_label || section.id}" fetched`, section);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/layout/section/:id (Admin: update and save a single specific section independently)
export const updateSingleSectionLayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const patch = req.body;
    if (!id) {
      throw new AppError('Section ID is required', 400);
    }

    const all = await fetchAllSectionsLayoutFromDb();
    const targetIdx = all.findIndex((s) => s.id === id);
    if (targetIdx === -1) {
      throw new AppError(`Section with ID "${id}" not found`, 404);
    }

    const updatedItem = sanitizeLayoutItem({ ...all[targetIdx], ...patch, id }, targetIdx);
    all[targetIdx] = updatedItem;

    await persistSectionsLayoutToDb(all);

    return successResponse(res, `Section "${updatedItem.custom_label || updatedItem.id}" saved independently`, {
      updatedSection: updatedItem,
      layout: all,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/layout/section (Admin: create brand new section)
export const addSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { section_type, custom_label, items } = req.body;
    const validTypes: HomeSectionType[] = [
      'hero_banner',
      'sub_banner',
      'occasions',
      'bestsellers',
      'custom_cards',
      'promo_banner',
    ];
    if (!validTypes.includes(section_type)) {
      throw new AppError(`Invalid section type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    const all = await fetchAllSectionsLayoutFromDb();
    const count = all.filter((s) => s.section_type === section_type).length + 1;
    const newId = `${section_type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    // New section starts completely blank (empty array) so admin configures everything from scratch
    const initialItems: any[] = Array.isArray(items) ? items : [];

    const newItem: HomeSectionLayoutItem = sanitizeLayoutItem(
      {
        id: newId,
        section_type,
        custom_label: custom_label?.trim() || `${section_type} #${count}`,
        is_enabled: true,
        order_index: all.length + 1,
        items: initialItems,
        ...req.body,
      },
      all.length
    );

    all.push(newItem);
    await persistSectionsLayoutToDb(all);

    return successResponse(
      res,
      `New ${section_type} section added successfully with separate ID`,
      {
        newSection: newItem,
        layout: all,
      },
      201
    );
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/layout/section/:id/duplicate (Admin: duplicate section with separate cloned items)
export const duplicateSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const all = await fetchAllSectionsLayoutFromDb();
    const targetIdx = all.findIndex((s) => s.id === id);
    if (targetIdx === -1) {
      throw new AppError(`Section with ID "${id}" not found`, 404);
    }

    const original = all[targetIdx];
    const newId = `${original.section_type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicateCount = all.filter((i) => i.section_type === original.section_type).length + 1;

    const supabase = getSupabaseAdmin();
    let sourceItems: any[] = Array.isArray(original.items) && original.items.length > 0 ? original.items : [];
    if (sourceItems.length === 0 && supabase) {
      try {
        let tableName = '';
        if (original.section_type === 'hero_banner') tableName = 'home_banners';
        else if (original.section_type === 'sub_banner') tableName = 'home_sub_banners';
        else if (original.section_type === 'occasions') tableName = 'home_occasions';
        else if (original.section_type === 'bestsellers') tableName = 'home_bestsellers';
        else if (original.section_type === 'promo_banner') tableName = 'home_promo_banners';
        else if (original.section_type === 'custom_cards') tableName = 'home_custom_cards';

        if (tableName) {
          const { data } = await supabase.from(tableName).select('*').order('order_index', { ascending: true });
          if (Array.isArray(data) && data.length > 0) {
            sourceItems = data;
          }
        }
      } catch (e) {
        // ignore fallback query errors
      }
    }

    // Ensure original also has its items array explicitly defined if it was empty
    if (!Array.isArray(original.items) || original.items.length === 0) {
      original.items = sourceItems.map((item: any, idx: number) => ({
        ...item,
        id: `${original.section_type}_item_orig_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      }));
    }

    // Deep-clone items with unique IDs so editing cloned items NEVER affects original
    const clonedItems = sourceItems.map((item: any, idx: number) => ({
      ...item,
      id: `${original.section_type}_item_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    }));

    const newSection: HomeSectionLayoutItem = {
      ...original,
      id: newId,
      custom_label: `${original.custom_label || original.section_type} (Copy ${duplicateCount})`,
      order_index: targetIdx + 2,
      items: clonedItems,
    };

    all.splice(targetIdx + 1, 0, newSection);
    all.forEach((s, idx) => {
      s.order_index = idx + 1;
    });

    await persistSectionsLayoutToDb(all);

    return successResponse(
      res,
      `Section "${original.custom_label || original.id}" duplicated with independent items and settings!`,
      {
        duplicatedSection: newSection,
        layout: all,
      },
      201
    );
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/home-banners/admin/layout/section/:id (Admin: delete section)
export const deleteSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const all = await fetchAllSectionsLayoutFromDb();
    const targetIdx = all.findIndex((s) => s.id === id);
    if (targetIdx === -1) {
      throw new AppError(`Section with ID "${id}" not found`, 404);
    }
    if (all.length <= 1) {
      throw new AppError('At least one section must remain on the page', 400);
    }

    const removed = all.splice(targetIdx, 1)[0];
    all.forEach((s, idx) => {
      s.order_index = idx + 1;
    });

    await persistSectionsLayoutToDb(all);

    // Also remove from home_sections_layout table if it exists
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('home_sections_layout').delete().eq('id', id);
      } catch (_) {}
    }

    return successResponse(res, `Section "${removed.custom_label || removed.id}" removed successfully`, {
      removedId: id,
      layout: all,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/layout/section/:id/items (Admin: add item to specific section)
export const addSectionItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const itemData = req.body;
    const all = await fetchAllSectionsLayoutFromDb();
    const targetIdx = all.findIndex((s) => s.id === id);
    if (targetIdx === -1) {
      throw new AppError(`Section with ID "${id}" not found`, 404);
    }

    const section = all[targetIdx];
    const currentItems = Array.isArray(section.items) ? [...section.items] : [];
    const newItemId = itemData.id || `item_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const newItem = {
      ...itemData,
      id: newItemId,
      order_index: currentItems.length + 1,
      is_active: itemData.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    currentItems.push(newItem);
    section.items = currentItems;
    all[targetIdx] = section;

    await persistSectionsLayoutToDb(all);

    return successResponse(
      res,
      `Item added specifically to section "${section.custom_label || section.id}"`,
      {
        item: newItem,
        items: currentItems,
        section,
      },
      201
    );
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/layout/section/:id/items/:itemId (Admin: update item in specific section)
export const updateSectionItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, itemId } = req.params;
    const patch = req.body;
    const all = await fetchAllSectionsLayoutFromDb();
    const targetIdx = all.findIndex((s) => s.id === id);
    if (targetIdx === -1) {
      throw new AppError(`Section with ID "${id}" not found`, 404);
    }

    const section = all[targetIdx];
    const currentItems = Array.isArray(section.items) ? [...section.items] : [];
    const itemIdx = currentItems.findIndex((it: any) => it.id === itemId);
    if (itemIdx === -1) {
      throw new AppError(`Item "${itemId}" not found in section "${id}"`, 404);
    }

    currentItems[itemIdx] = {
      ...currentItems[itemIdx],
      ...patch,
      id: itemId,
      updated_at: new Date().toISOString(),
    };

    section.items = currentItems;
    all[targetIdx] = section;

    await persistSectionsLayoutToDb(all);

    return successResponse(
      res,
      `Item in section "${section.custom_label || section.id}" updated successfully`,
      {
        item: currentItems[itemIdx],
        items: currentItems,
        section,
      }
    );
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/home-banners/admin/layout/section/:id/items/:itemId (Admin: delete item from specific section)
export const deleteSectionItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, itemId } = req.params;
    const all = await fetchAllSectionsLayoutFromDb();
    const targetIdx = all.findIndex((s) => s.id === id);
    if (targetIdx === -1) {
      throw new AppError(`Section with ID "${id}" not found`, 404);
    }

    const section = all[targetIdx];
    const currentItems = Array.isArray(section.items) ? [...section.items] : [];
    const filtered = currentItems.filter((it: any) => it.id !== itemId);
    section.items = filtered;
    all[targetIdx] = section;

    await persistSectionsLayoutToDb(all);

    return successResponse(
      res,
      `Item removed from section "${section.custom_label || section.id}"`,
      {
        deletedItemId: itemId,
        items: filtered,
        section,
      }
    );
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/home-banners/admin/layout/section/:id/items/reorder (Admin: reorder items in specific section)
export const reorderSectionItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      throw new AppError('orderedIds must be an array of item IDs', 400);
    }

    const all = await fetchAllSectionsLayoutFromDb();
    const targetIdx = all.findIndex((s) => s.id === id);
    if (targetIdx === -1) {
      throw new AppError(`Section with ID "${id}" not found`, 404);
    }

    const section = all[targetIdx];
    const currentItems = Array.isArray(section.items) ? [...section.items] : [];
    const updated = currentItems.map((it: any) => {
      const idx = orderedIds.indexOf(it.id);
      return idx !== -1 ? { ...it, order_index: idx + 1 } : it;
    });

    updated.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
    section.items = updated;
    all[targetIdx] = section;

    await persistSectionsLayoutToDb(all);

    return successResponse(
      res,
      `Items reordered in section "${section.custom_label || section.id}"`,
      {
        items: updated,
        section,
      }
    );
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/layout/reset (Admin: reset to default 6 sections)
export const resetSectionsLayout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const defaultCopy = defaultHomeSectionsLayout.map((item, idx) => ({
      ...item,
      order_index: idx + 1,
    }));
    await persistSectionsLayoutToDb(defaultCopy);

    return successResponse(res, 'Home sections layout reset to defaults successfully', defaultCopy);
  } catch (error) {
    return next(error);
  }
};

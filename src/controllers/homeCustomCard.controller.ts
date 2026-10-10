import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { deleteFromR2 } from '../utils/r2Upload';

export interface HomeCustomCardItem {
  id: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  button_text?: string;
  image_url?: string | null;

  // Card Layout & Positioning
  text_position: 'above' | 'below' | 'inside_clean' | 'inside_bottom' | 'inside_center' | 'inside_top';
  content_align: 'left' | 'center' | 'right';
  vertical_align: 'top' | 'center' | 'bottom';

  // Card Specific Styling
  bg_color: string;
  card_radius: number; // in px, e.g. 0, 8, 16, 24, 9999
  card_padding?: number | null; // In-card space around frame (border se bahar space)
  image_padding?: number | null; // Space inside frame around image (border ke andar image space)

  // Border Configuration
  border_mode: 'none' | 'modern' | 'classic' | 'custom_image';
  border_same_all: boolean;
  border_width: number;
  border_top_width: number;
  border_right_width: number;
  border_bottom_width: number;
  border_left_width: number;
  border_style: string; // 'solid' | 'double' | 'dashed' | 'dotted' | 'inset' | 'outset'
  border_color: string;

  // Classic Border Selection (10+ options)
  classic_border_style: string;

  // Custom Border Image
  border_image_url?: string | null;

  // Text Styling & Colors
  title_color: string;
  subtitle_color: string;
  badge_color: string;
  button_color?: string;
  font_family: string;
  font_weight: string;

  // Navigation Link (strictly website header / subheader dropdown)
  link_type: 'header' | 'dropdown';
  target_header_id?: string | null;
  target_dropdown_id?: string | null;
  link_url: string;

  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomCardsSettings {
  is_enabled: boolean;
  section_title: string;
  section_subtitle: string;
  title_align: 'left' | 'center' | 'right';
  title_color: string;
  subtitle_color: string;
  section_bg_mode: 'transparent' | 'color' | 'gradient';
  section_bg_color: string;
  section_gradient: string;
  cards_per_row: number; // 3, 4, 5, 6
  card_aspect_ratio: 'square' | 'tall' | 'standard' | 'auto';
  global_card_radius: number;
  global_border_mode: 'none' | 'modern' | 'classic' | 'custom_image';
  global_classic_border: string;
  global_border_color: string;
  global_border_width: number;
  global_text_position: 'above' | 'below' | 'inside_clean' | 'inside_bottom' | 'inside_center';
  card_padding: number; // In-card space around frame
  image_padding: number; // Space inside frame around image
  card_hover_effect: 'none' | 'glow' | 'lift' | 'zoom';
  card_bg_color: string;
}

// Default initial starter cards matching user screenshots
const defaultSeedCustomCards: HomeCustomCardItem[] = [
  {
    id: '60000000-0000-0000-0000-000000000001',
    title: 'Watches & Wearables',
    subtitle: 'Timeless elegance for every occasion',
    badge_text: 'UP TO 80% OFF',
    button_text: 'Shop Now',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop',
    text_position: 'below',
    content_align: 'center',
    vertical_align: 'center',
    bg_color: '#FFFFFF',
    card_radius: 16,
    border_mode: 'classic',
    border_same_all: true,
    border_width: 1,
    border_top_width: 1,
    border_right_width: 1,
    border_bottom_width: 1,
    border_left_width: 1,
    border_style: 'solid',
    border_color: '#D26900',
    classic_border_style: 'victorian-ornate',
    border_image_url: null,
    title_color: '#111827',
    subtitle_color: '#4B5563',
    badge_color: '#D26900',
    font_family: 'Inter',
    font_weight: 'semibold',
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
    id: '60000000-0000-0000-0000-000000000002',
    title: 'Sleepwear & Loungewear',
    subtitle: 'Comfort wrapped in luxurious fabric',
    badge_text: '30-70% OFF',
    button_text: 'Shop Now',
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop',
    text_position: 'below',
    content_align: 'center',
    vertical_align: 'center',
    bg_color: '#FFFFFF',
    card_radius: 16,
    border_mode: 'classic',
    border_same_all: true,
    border_width: 1,
    border_top_width: 1,
    border_right_width: 1,
    border_bottom_width: 1,
    border_left_width: 1,
    border_style: 'solid',
    border_color: '#D26900',
    classic_border_style: 'royal-baroque',
    border_image_url: null,
    title_color: '#111827',
    subtitle_color: '#4B5563',
    badge_color: '#D26900',
    font_family: 'Inter',
    font_weight: 'semibold',
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
    id: '60000000-0000-0000-0000-000000000003',
    title: 'Workwear & Formals',
    subtitle: 'Sharp styles crafted for success',
    badge_text: '40-70% OFF',
    button_text: 'Shop Now',
    image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop',
    text_position: 'below',
    content_align: 'center',
    vertical_align: 'center',
    bg_color: '#FFFFFF',
    card_radius: 16,
    border_mode: 'classic',
    border_same_all: true,
    border_width: 1,
    border_top_width: 1,
    border_right_width: 1,
    border_bottom_width: 1,
    border_left_width: 1,
    border_style: 'solid',
    border_color: '#D26900',
    classic_border_style: 'vintage-filigree',
    border_image_url: null,
    title_color: '#111827',
    subtitle_color: '#4B5563',
    badge_color: '#D26900',
    font_family: 'Inter',
    font_weight: 'semibold',
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
    id: '60000000-0000-0000-0000-000000000004',
    title: 'Eyewear & Sunglasses',
    subtitle: 'Iconic frames with UV protection',
    badge_text: 'UP TO 80% OFF',
    button_text: 'Shop Now',
    image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=600&auto=format&fit=crop',
    text_position: 'below',
    content_align: 'center',
    vertical_align: 'center',
    bg_color: '#FFFFFF',
    card_radius: 16,
    border_mode: 'classic',
    border_same_all: true,
    border_width: 1,
    border_top_width: 1,
    border_right_width: 1,
    border_bottom_width: 1,
    border_left_width: 1,
    border_style: 'solid',
    border_color: '#D26900',
    classic_border_style: 'antique-crest',
    border_image_url: null,
    title_color: '#111827',
    subtitle_color: '#4B5563',
    badge_color: '#D26900',
    font_family: 'Inter',
    font_weight: 'semibold',
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
    id: '60000000-0000-0000-0000-000000000005',
    title: 'Casual Styles',
    subtitle: 'Effortless daily trends & comfort',
    badge_text: '40-80% OFF',
    button_text: 'Shop Now',
    image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop',
    text_position: 'below',
    content_align: 'center',
    vertical_align: 'center',
    bg_color: '#FFFFFF',
    card_radius: 16,
    border_mode: 'classic',
    border_same_all: true,
    border_width: 1,
    border_top_width: 1,
    border_right_width: 1,
    border_bottom_width: 1,
    border_left_width: 1,
    border_style: 'solid',
    border_color: '#D26900',
    classic_border_style: 'greek-key',
    border_image_url: null,
    title_color: '#111827',
    subtitle_color: '#4B5563',
    badge_color: '#D26900',
    font_family: 'Inter',
    font_weight: 'semibold',
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

const defaultCustomCardsSettings: CustomCardsSettings = {
  is_enabled: true,
  section_title: 'Gifts for Every Feeling',
  section_subtitle: 'When emotions matter most, send a gift that speaks from the heart.',
  title_align: 'left',
  title_color: '#111827',
  subtitle_color: '#6B7280',
  section_bg_mode: 'transparent',
  section_bg_color: '#FFFFFF',
  section_gradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
  cards_per_row: 5,
  card_aspect_ratio: 'tall',
  global_card_radius: 16,
  global_border_mode: 'classic',
  global_classic_border: 'victorian-ornate',
  global_border_color: '#D26900',
  global_border_width: 1,
  global_text_position: 'below',
  card_padding: 8,
  image_padding: 0,
  card_hover_effect: 'none',
  card_bg_color: '#FFFFFF',
};

let memoryCustomCardsCache: HomeCustomCardItem[] = [...defaultSeedCustomCards];
let memoryCustomCardsSettings: CustomCardsSettings = { ...defaultCustomCardsSettings };

const isValidUuid = (val: any): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

// Helper to clean up replaced or deleted media
async function cleanupMedia(url?: string | null) {
  if (!url || typeof url !== 'string') return;
  // 1. Cloudflare R2
  try {
    await deleteFromR2(url);
  } catch (err) {
    // notice only
  }

  // 2. Local uploads folder fallback
  try {
    if (url.includes('/uploads/banners/')) {
      const parts = url.split('/uploads/banners/');
      if (parts[1]) {
        const localPath = path.join(__dirname, '../../uploads/banners', parts[1]);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }
    }
  } catch (err) {
    // notice only
  }
}

function sanitizeCustomCard(item: any): HomeCustomCardItem {
  return {
    id: isValidUuid(item.id) ? item.id.trim() : crypto.randomUUID(),
    title: String(item.title || '').trim(),
    subtitle: item.subtitle ? String(item.subtitle).trim() : '',
    badge_text: item.badge_text ? String(item.badge_text).trim() : '',
    button_text: item.button_text ? String(item.button_text).trim() : '',
    image_url: item.image_url && String(item.image_url).trim() ? String(item.image_url).trim() : null,

    text_position: ['above', 'below', 'inside_clean', 'inside_bottom', 'inside_center', 'inside_top'].includes(item.text_position)
      ? item.text_position
      : 'below',
    content_align: ['left', 'center', 'right'].includes(item.content_align) ? item.content_align : 'center',
    vertical_align: ['top', 'center', 'bottom'].includes(item.vertical_align) ? item.vertical_align : 'center',

    bg_color: String(item.bg_color || '#FFFFFF').trim(),
    card_radius: Number(item.card_radius ?? 16),
    card_padding: item.card_padding !== undefined && item.card_padding !== null && item.card_padding !== '' ? Number(item.card_padding) : null,
    image_padding: item.image_padding !== undefined && item.image_padding !== null && item.image_padding !== '' ? Number(item.image_padding) : null,

    border_mode: ['none', 'modern', 'classic', 'custom_image'].includes(item.border_mode)
      ? item.border_mode
      : 'classic',
    border_same_all: item.border_same_all !== false,
    border_width: Number(item.border_width ?? 1),
    border_top_width: Number(item.border_top_width ?? 1),
    border_right_width: Number(item.border_right_width ?? 1),
    border_bottom_width: Number(item.border_bottom_width ?? 1),
    border_left_width: Number(item.border_left_width ?? 1),
    border_style: String(item.border_style || 'solid').trim(),
    border_color: String(item.border_color || '#D26900').trim(),

    classic_border_style: String(item.classic_border_style || 'victorian-ornate').trim(),
    border_image_url: item.border_image_url && String(item.border_image_url).trim() ? String(item.border_image_url).trim() : null,

    title_color: String(item.title_color || '#111827').trim(),
    subtitle_color: String(item.subtitle_color || '#4B5563').trim(),
    badge_color: String(item.badge_color || '#D26900').trim(),
    button_color: String(item.button_color || '#D26900').trim(),
    font_family: String(item.font_family || 'Inter').trim(),
    font_weight: String(item.font_weight || 'semibold').trim(),

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

// Fetch all cards from DB with multi-tier storage fallback
async function fetchAllCustomCardsFromDb(): Promise<HomeCustomCardItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memoryCustomCardsCache;

  // 1. Dedicated 'home_custom_cards' table
  try {
    const { data, error } = await supabase
      .from('home_custom_cards')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      memoryCustomCardsCache = data.map(sanitizeCustomCard);
      return memoryCustomCardsCache;
    }
  } catch (_) {}

  // 2. 'site_settings' table fallback
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'home_custom_cards')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      memoryCustomCardsCache = data.value.map(sanitizeCustomCard);
      return memoryCustomCardsCache;
    }
  } catch (_) {}

  // 3. 'ecommerce' table fallback
  try {
    const { data, error } = await supabase
      .from('ecommerce')
      .select('address')
      .eq('slug', 'home-custom-cards-config')
      .maybeSingle();

    if (!error && data?.address) {
      const parsed = JSON.parse(data.address);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCustomCardsCache = parsed.map(sanitizeCustomCard);
        return memoryCustomCardsCache;
      }
    }
  } catch (_) {}

  return memoryCustomCardsCache;
}

// Fetch master section settings
async function fetchCustomCardsSettingsFromDb(): Promise<CustomCardsSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memoryCustomCardsSettings;

  try {
    const { data, error } = await supabase
      .from('home_banner_settings')
      .select('value')
      .eq('key', 'custom_cards_settings')
      .maybeSingle();

    if (!error && data?.value) {
      memoryCustomCardsSettings = {
        ...defaultCustomCardsSettings,
        ...data.value,
      };
      return memoryCustomCardsSettings;
    }
  } catch (_) {}

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'custom_cards_settings')
      .maybeSingle();

    if (!error && data?.value) {
      memoryCustomCardsSettings = {
        ...defaultCustomCardsSettings,
        ...data.value,
      };
      return memoryCustomCardsSettings;
    }
  } catch (_) {}

  return memoryCustomCardsSettings;
}

// Persist cards across DB tables
async function persistCustomCardsToDb(cards: HomeCustomCardItem[]): Promise<void> {
  memoryCustomCardsCache = [...cards];
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // 1. Try 'home_custom_cards' table
  try {
    const dbPayload = cards.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle || '',
      badge_text: c.badge_text || '',
      button_text: c.button_text || '',
      image_url: c.image_url,
      text_position: c.text_position,
      content_align: c.content_align,
      vertical_align: c.vertical_align,
      bg_color: c.bg_color,
      card_radius: c.card_radius,
      card_padding: c.card_padding !== undefined ? c.card_padding : null,
      image_padding: c.image_padding !== undefined ? c.image_padding : null,
      border_mode: c.border_mode,
      border_same_all: c.border_same_all,
      border_width: c.border_width,
      border_top_width: c.border_top_width,
      border_right_width: c.border_right_width,
      border_bottom_width: c.border_bottom_width,
      border_left_width: c.border_left_width,
      border_style: c.border_style,
      border_color: c.border_color,
      classic_border_style: c.classic_border_style,
      border_image_url: c.border_image_url,
      title_color: c.title_color,
      subtitle_color: c.subtitle_color,
      badge_color: c.badge_color,
      button_color: c.button_color || '#D26900',
      font_family: c.font_family,
      font_weight: c.font_weight,
      link_type: c.link_type,
      target_header_id: c.target_header_id,
      target_dropdown_id: c.target_dropdown_id,
      link_url: c.link_url,
      order_index: c.order_index,
      is_active: c.is_active,
      updated_at: new Date().toISOString(),
    }));

    await supabase.from('home_custom_cards').upsert(dbPayload, { onConflict: 'id' });
  } catch (_) {}

  // 2. Mirror to 'site_settings'
  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'home_custom_cards',
        value: cards,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  // 3. Mirror to 'ecommerce' table
  try {
    await supabase.from('ecommerce').upsert(
      {
        slug: 'home-custom-cards-config',
        name: 'Home Custom Showcase Cards Config',
        email: 'cards@yteddybags.internal',
        address: JSON.stringify(cards),
        isActive: true,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    );
  } catch (_) {}
}

// Persist master settings
async function persistCustomCardsSettingsToDb(settings: CustomCardsSettings): Promise<void> {
  memoryCustomCardsSettings = { ...settings };
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase.from('home_banner_settings').upsert(
      {
        key: 'custom_cards_settings',
        value: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'custom_cards_settings',
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

// GET /api/v1/home-banners/custom-cards (Public)
export const getPublicCustomCards = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [allCards, settings] = await Promise.all([
      fetchAllCustomCardsFromDb(),
      fetchCustomCardsSettingsFromDb(),
    ]);

    const activeCards = allCards
      .filter((c) => c.is_active)
      .sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'Custom cards fetched successfully', {
      items: activeCards,
      settings,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/home-banners/admin/custom-cards (Admin: all cards)
export const getAdminCustomCards = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [allCards, settings] = await Promise.all([
      fetchAllCustomCardsFromDb(),
      fetchCustomCardsSettingsFromDb(),
    ]);

    const sorted = [...allCards].sort((a, b) => a.order_index - b.order_index);
    return successResponse(res, 'All custom cards fetched for admin', {
      items: sorted,
      settings,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/custom-cards (Create Card)
export const createCustomCard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await fetchAllCustomCardsFromDb();
    const newOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.order_index)) + 1 : 1;

    const newCard = sanitizeCustomCard({
      ...req.body,
      id: crypto.randomUUID(),
      order_index: newOrder,
    });

    const updatedList = [...existing, newCard];
    await persistCustomCardsToDb(updatedList);

    return successResponse(res, 'Custom card created successfully', newCard, 201);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/custom-cards/:id (Update Card)
export const updateCustomCard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new AppError('Card ID is required', 400);

    const existing = await fetchAllCustomCardsFromDb();
    const targetIndex = existing.findIndex((c) => c.id === id);

    if (targetIndex === -1) {
      throw new AppError('Custom card not found', 404);
    }

    const currentCard = existing[targetIndex];

    // If image_url was replaced, clean up the previous image from storage
    if (req.body.image_url && req.body.image_url !== currentCard.image_url) {
      await cleanupMedia(currentCard.image_url);
    }

    // If border_image_url was replaced, clean up previous border image
    if (req.body.border_image_url && req.body.border_image_url !== currentCard.border_image_url) {
      await cleanupMedia(currentCard.border_image_url);
    }

    const updatedCard = sanitizeCustomCard({
      ...currentCard,
      ...req.body,
      id,
      order_index: currentCard.order_index,
      created_at: currentCard.created_at,
    });

    existing[targetIndex] = updatedCard;
    await persistCustomCardsToDb(existing);

    return successResponse(res, 'Custom card updated successfully', updatedCard);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/home-banners/admin/custom-cards/:id (Delete Card)
export const deleteCustomCard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new AppError('Card ID is required', 400);

    const existing = await fetchAllCustomCardsFromDb();
    const cardToDelete = existing.find((c) => c.id === id);

    if (cardToDelete) {
      // Clean up associated media from storage
      await cleanupMedia(cardToDelete.image_url);
      await cleanupMedia(cardToDelete.border_image_url);
    }

    const filtered = existing.filter((c) => c.id !== id);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('home_custom_cards').delete().eq('id', id);
      } catch (_) {}
    }

    await persistCustomCardsToDb(filtered);

    return successResponse(res, 'Custom card deleted successfully', { id });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/home-banners/admin/custom-cards/reorder (Reorder Cards)
export const reorderCustomCards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      throw new AppError('orderedIds must be an array of string IDs', 400);
    }

    const existing = await fetchAllCustomCardsFromDb();
    const cardMap = new Map(existing.map((c) => [c.id, c]));

    const reordered: HomeCustomCardItem[] = [];
    orderedIds.forEach((id: string, index: number) => {
      const card = cardMap.get(id);
      if (card) {
        reordered.push({
          ...card,
          order_index: index + 1,
          updated_at: new Date().toISOString(),
        });
        cardMap.delete(id);
      }
    });

    // Append any cards not mentioned
    cardMap.forEach((remainingCard) => {
      reordered.push({
        ...remainingCard,
        order_index: reordered.length + 1,
        updated_at: new Date().toISOString(),
      });
    });

    await persistCustomCardsToDb(reordered);

    return successResponse(res, 'Custom cards reordered successfully', { orderedIds });
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/custom-cards/settings (Update Section Master Settings)
export const updateCustomCardsSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const current = await fetchCustomCardsSettingsFromDb();
    const updated: CustomCardsSettings = {
      ...current,
      ...req.body,
      is_enabled: typeof req.body.is_enabled === 'boolean' ? req.body.is_enabled : current.is_enabled,
      cards_per_row: [3, 4, 5, 6].includes(Number(req.body.cards_per_row)) ? Number(req.body.cards_per_row) : current.cards_per_row,
      card_padding: req.body.card_padding !== undefined ? Number(req.body.card_padding) : current.card_padding,
      image_padding: req.body.image_padding !== undefined ? Number(req.body.image_padding) : (current.image_padding ?? 0),
    };

    await persistCustomCardsSettingsToDb(updated);

    return successResponse(res, 'Custom cards settings updated successfully', updated);
  } catch (error) {
    return next(error);
  }
};

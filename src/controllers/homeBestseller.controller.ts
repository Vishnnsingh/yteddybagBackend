import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { deleteFromR2 } from '../utils/r2Upload';

export interface HomeBestsellerItem {
  id: string;
  product_id?: string | null;
  title: string;
  subtitle?: string | null;
  price: string;
  original_price?: string | null;
  discount_badge?: string | null;
  badge_text?: string | null;
  badge_style: 'discount' | 'luxe' | 'custom';
  rating?: number | string | null;
  reviews_count?: number | string | null;
  image_url?: string | null;
  images?: string[];
  link_type: 'header' | 'dropdown';
  target_header_id?: string | null;
  target_dropdown_id?: string | null;
  link_url: string;
  source_mode?: 'catalog' | 'custom';
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BestsellerSettings {
  is_enabled: boolean;
  section_title: string;
  section_subtitle: string;
  view_all_text: string;
  view_all_url: string;
  show_view_all: boolean;
  card_theme: string;
  card_bg_mode: string; // 'white' | 'color' | 'glass' | 'home-bg'
  card_bg_color: string;
  card_transparency: number; // 0 to 100
  section_bg_mode: string; // 'transparent' | 'color'
  section_bg_color: string;
  cards_per_row?: string; // '2' | '3' | '4' | '5' | '6' | 'scroll'
  view_all_target_header_id?: string | null;
  view_all_target_dropdown_id?: string | null;
  view_all_link_type?: 'header' | 'dropdown';
}

// Starter seed bestsellers matching real YTeddybags products (NO dummy flowers)
const defaultSeedBestsellers: HomeBestsellerItem[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    product_id: '10636e87-6dda-4782-93a9-bc3fa57721bc',
    title: 'Product 1',
    subtitle: 'Product for school bouys',
    price: 'Rs. 1299',
    original_price: 'Rs. 1999',
    discount_badge: '35% OFF',
    badge_text: 'BESTSELLER',
    badge_style: 'discount',
    rating: 4.9,
    reviews_count: 95,
    image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800',
    link_type: 'dropdown',
    target_header_id: '7edc832d-3047-4cd5-8930-ffac9ce244e2',
    target_dropdown_id: '5431af15-920d-4064-8232-d77f7026d412',
    link_url: '/category/kids-toy',
    source_mode: 'catalog',
    order_index: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    product_id: 'f5ef86aa-354d-46ae-98ba-35e1ddb2501b',
    title: 'Product 2',
    subtitle: 'thish si shjha jkahdjabdja',
    price: 'Rs. 99',
    original_price: 'Rs. 199',
    discount_badge: '50% OFF',
    badge_text: 'BESTSELLER',
    badge_style: 'discount',
    rating: 5.0,
    reviews_count: 88885,
    image_url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800',
    link_type: 'dropdown',
    target_header_id: '33333333-3333-3333-3333-333333333333',
    target_dropdown_id: 'a93e279b-ec88-403e-a5bb-9691da9c5de9',
    link_url: '/category/2bag',
    source_mode: 'catalog',
    order_index: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    title: 'Sweet Teddy Backpack',
    subtitle: 'Handcrafted velvet companion for kids & daily adventures',
    price: 'Rs. 1599',
    original_price: 'Rs. 1999',
    discount_badge: '20% OFF',
    badge_text: 'BESTSELLER',
    badge_style: 'discount',
    rating: 4.8,
    reviews_count: 76,
    image_url: 'https://images.unsplash.com/photo-1581557991964-125469da3b8a?q=80&w=800',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/teddy-bags',
    source_mode: 'catalog',
    order_index: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    title: 'Vintage Panda Daypack',
    subtitle: 'Signature edition crafted with durable plush finish',
    price: 'Rs. 2027',
    original_price: 'Rs. 3699',
    discount_badge: '45% OFF',
    badge_text: 'BESTSELLER',
    badge_style: 'luxe',
    rating: 4.9,
    reviews_count: 112,
    image_url: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?q=80&w=800',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/teddy-bags',
    source_mode: 'catalog',
    order_index: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000005',
    title: 'Golden Lamb Travel Pack',
    subtitle: 'Lightweight companion for outings and journeys',
    price: 'Rs. 1199',
    original_price: 'Rs. 1499',
    discount_badge: '20% OFF',
    badge_text: 'BESTSELLER',
    badge_style: 'discount',
    rating: 4.9,
    reviews_count: 125,
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/school-bags',
    source_mode: 'catalog',
    order_index: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000006',
    title: 'Snuggle Kitten Cuddle Carrier',
    subtitle: 'Handcrafted velvet companion with roomy pockets',
    price: 'Rs. 1167',
    original_price: 'Rs. 1599',
    discount_badge: '27% OFF',
    badge_text: 'BESTSELLER',
    badge_style: 'discount',
    rating: 4.7,
    reviews_count: 64,
    image_url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/soft-toys',
    source_mode: 'catalog',
    order_index: 6,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000007',
    title: 'Butter Cream Plush Teddy Buddy',
    subtitle: 'Cute everyday backpack with soft shoulder support',
    price: 'Rs. 1199',
    original_price: 'Rs. 1499',
    discount_badge: '20% OFF',
    badge_text: 'BESTSELLER',
    badge_style: 'discount',
    rating: 4.8,
    reviews_count: 82,
    image_url: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?q=80&w=600&auto=format&fit=crop',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/teddy-bags',
    source_mode: 'catalog',
    order_index: 7,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000008',
    title: 'Midnight Glow Luxury Daypack',
    subtitle: 'Premium plush craftsmanship with designer gold zippers',
    price: 'Rs. 4499',
    original_price: 'Rs. 5299',
    discount_badge: 'LUXE',
    badge_text: 'LUXE',
    badge_style: 'luxe',
    rating: 4.9,
    reviews_count: 140,
    image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/luxe-gifts',
    source_mode: 'catalog',
    order_index: 8,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000009',
    title: 'Pastel Dream Celebration Pack',
    subtitle: 'Charming festive companion with pastel soft touch',
    price: 'Rs. 1849',
    original_price: 'Rs. 2199',
    discount_badge: '16% OFF',
    badge_text: 'BESTSELLER',
    badge_style: 'discount',
    rating: 4.8,
    reviews_count: 53,
    image_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=600&auto=format&fit=crop',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/balloon-decor',
    source_mode: 'catalog',
    order_index: 9,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000010',
    title: 'Hatke Vintage Traveler Satchel',
    subtitle: 'Unique retro plush carrier with heavy-duty durability',
    price: 'Rs. 3299',
    original_price: 'Rs. 3899',
    discount_badge: 'BESTSELLER',
    badge_text: 'BESTSELLER',
    badge_style: 'custom',
    rating: 5.0,
    reviews_count: 210,
    image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop',
    link_type: 'header',
    target_header_id: null,
    target_dropdown_id: null,
    link_url: '/category/hatke',
    source_mode: 'catalog',
    order_index: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let memoryBestsellersCache: HomeBestsellerItem[] = [...defaultSeedBestsellers];
let memoryBestsellerSettings: BestsellerSettings = {
  is_enabled: true,
  section_title: 'Shop By Bestsellers',
  section_subtitle: "Discover India's favourite gifting options, curated bestsellers that make every celebration extra special",
  view_all_text: 'View All Bestsellers',
  view_all_url: '/category/bestsellers',
  show_view_all: true,
  card_theme: 'classic-clean',
  card_bg_mode: 'white',
  card_bg_color: '#FFFFFF',
  card_transparency: 0,
  section_bg_mode: 'transparent',
  section_bg_color: '#FFFFFF',
  cards_per_row: '4',
  view_all_target_header_id: null,
  view_all_target_dropdown_id: null,
  view_all_link_type: 'header',
};

const isValidUuid = (val: any): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

function sanitizeBestsellerItem(item: any): HomeBestsellerItem {
  const images = Array.isArray(item.images)
    ? item.images.map((img: any) => (typeof img === 'string' ? img.trim() : String(img?.url || '').trim())).filter(Boolean)
    : (item.image_url ? [String(item.image_url).trim()] : []);

  return {
    id: isValidUuid(item.id) ? item.id.trim() : (item.id || crypto.randomUUID()),
    product_id: item.product_id ? String(item.product_id).trim() : null,
    title: String(item.title || '').trim(),
    subtitle: item.subtitle && String(item.subtitle).trim() ? String(item.subtitle).trim() : null,
    price: String(item.price || 'Rs. 999').trim(),
    original_price: item.original_price && String(item.original_price).trim() ? String(item.original_price).trim() : null,
    discount_badge: item.discount_badge && String(item.discount_badge).trim() ? String(item.discount_badge).trim() : null,
    badge_text: item.badge_text ? String(item.badge_text).trim() : 'BESTSELLER',
    badge_style: item.badge_style === 'luxe' ? 'luxe' : item.badge_style === 'custom' ? 'custom' : 'discount',
    rating: item.rating ? Number(item.rating) : 4.9,
    reviews_count: item.reviews_count ? Number(item.reviews_count) : 95,
    image_url: images[0] || (item.image_url && String(item.image_url).trim() ? String(item.image_url).trim() : null),
    images: images.length > 0 ? images : undefined,
    link_type: item.link_type === 'dropdown' ? 'dropdown' : 'header',
    target_header_id: isValidUuid(item.target_header_id) ? item.target_header_id.trim() : null,
    target_dropdown_id: isValidUuid(item.target_dropdown_id) ? item.target_dropdown_id.trim() : null,
    link_url: String(item.link_url || '/').trim(),
    source_mode: item.source_mode === 'custom' ? 'custom' : 'catalog',
    order_index: Number(item.order_index) || 0,
    is_active: item.is_active !== false,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Dynamically enrich bestseller items with live product data from products table
 */
async function enrichBestsellersWithCatalog(items: HomeBestsellerItem[]): Promise<HomeBestsellerItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return items;
  try {
    const { data: prods } = await supabase.from('products').select('*');
    if (!Array.isArray(prods) || prods.length === 0) return items;

    const prodsById = new Map<string, any>();
    const prodsByTitle = new Map<string, any>();
    prods.forEach((p) => {
      prodsById.set(p.id, p);
      prodsByTitle.set(p.title.toLowerCase().trim(), p);
    });

    return items.map((item) => {
      // If admin explicitly marked as custom, preserve custom data
      if (item.source_mode === 'custom') {
        return item;
      }
      // Match by product_id or title
      const matched = (item.product_id && prodsById.get(item.product_id)) || prodsByTitle.get(item.title.toLowerCase().trim());
      if (matched) {
        // Collect all images from catalog product
        const productImages: string[] = [];
        if (matched.primary_image) {
          productImages.push(matched.primary_image);
        }
        if (Array.isArray(matched.images)) {
          matched.images.forEach((img: any) => {
            const url = typeof img === 'string' ? img : img?.url;
            if (url && !productImages.includes(url)) {
              productImages.push(url);
            }
          });
        }
        if (productImages.length === 0 && (matched.image_url || item.image_url)) {
          const fallback = matched.image_url || item.image_url;
          if (fallback) productImages.push(fallback);
        }

        return {
          ...item,
          product_id: matched.id,
          title: matched.title || item.title,
          subtitle: matched.subtitle || item.subtitle || 'Handcrafted plush companion for kids & daily adventures',
          price: `Rs. ${matched.price}`,
          original_price: matched.mrp ? `Rs. ${matched.mrp}` : item.original_price,
          discount_badge: matched.discount_percent > 0 ? `(${matched.discount_percent}% OFF)` : (matched.badge_text || item.discount_badge),
          rating: Number(matched.rating) || item.rating || 4.9,
          reviews_count: Number(matched.reviews_count) || item.reviews_count || 95,
          badge_text: matched.badge_text || item.badge_text || 'BESTSELLER',
          image_url: productImages[0] || item.image_url,
          images: productImages.length > 0 ? productImages : (item.images || (item.image_url ? [item.image_url] : [])),
          link_url: matched.dropdown_path || matched.header_path || `/product/${matched.slug}` || item.link_url,
          is_active: matched.is_active !== false && item.is_active !== false,
        };
      }
      return item;
    });
  } catch (_) {
    return items;
  }
}

/**
 * Fetch all bestsellers from DB with multi-tier fallbacks
 */
async function fetchAllBestsellersFromDb(): Promise<HomeBestsellerItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memoryBestsellersCache;

  // 1. Try dedicated 'home_bestsellers' table
  try {
    const { data, error } = await supabase
      .from('home_bestsellers')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      // Check if any legacy flower dummy items exist in data and migrate them to real products
      let hasLegacyFlowers = false;
      const cleanData = data.map((item: any, idx: number) => {
        const title = String(item.title || '');
        if (
          title.includes('Floral') ||
          title.includes('Sunflower') ||
          title.includes('Blush Rose') ||
          title.includes('The Muse') ||
          title.includes('White Orchid')
        ) {
          hasLegacyFlowers = true;
          const fallback = defaultSeedBestsellers[idx % defaultSeedBestsellers.length];
          return {
            ...item,
            title: fallback.title,
            subtitle: fallback.subtitle,
            price: fallback.price,
            original_price: fallback.original_price,
            discount_badge: fallback.discount_badge,
            badge_style: fallback.badge_style,
            image_url: fallback.image_url,
            link_url: fallback.link_url,
          };
        }
        return item;
      });

      if (hasLegacyFlowers) {
        try {
          await supabase.from('home_bestsellers').upsert(cleanData, { onConflict: 'id' });
        } catch (_) {}
      }

      const sanitized = cleanData.map(sanitizeBestsellerItem);
      memoryBestsellersCache = await enrichBestsellersWithCatalog(sanitized);
      return memoryBestsellersCache;

    }
  } catch (_) {}

  // 2. Try 'site_settings' table where key = 'home_bestsellers'
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'home_bestsellers')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      const sanitized = data.value.map(sanitizeBestsellerItem);
      memoryBestsellersCache = await enrichBestsellersWithCatalog(sanitized);
      return memoryBestsellersCache;
    }
  } catch (_) {}

  // 3. Try 'home_banner_settings' where key = 'bestsellers'
  try {
    const { data, error } = await supabase
      .from('home_banner_settings')
      .select('value')
      .eq('key', 'bestsellers')
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      const sanitized = data.value.map(sanitizeBestsellerItem);
      memoryBestsellersCache = await enrichBestsellersWithCatalog(sanitized);
      return memoryBestsellersCache;
    }
  } catch (_) {}

  memoryBestsellersCache = await enrichBestsellersWithCatalog(memoryBestsellersCache);
  return memoryBestsellersCache;
}

/**
 * Persist bestsellers to DB across fallback stores
 */
async function persistBestsellersToDb(items: HomeBestsellerItem[]): Promise<void> {
  memoryBestsellersCache = items;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // 1. Dedicated 'home_bestsellers' table upsert
  try {
    await supabase.from('home_bestsellers').upsert(items, { onConflict: 'id' });
  } catch (_) {}

  // 2. Backup to 'site_settings'
  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'home_bestsellers',
        value: items,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  // 3. Backup to 'home_banner_settings'
  try {
    await supabase.from('home_banner_settings').upsert(
      {
        key: 'bestsellers',
        value: items,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}
}

/**
 * Fetch bestseller settings
 */
async function fetchBestsellerSettings(): Promise<BestsellerSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return memoryBestsellerSettings;

  try {
    const { data: sData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'home_bestsellers_settings')
      .maybeSingle();

    if (sData?.value) {
      memoryBestsellerSettings = {
        is_enabled: sData.value.is_enabled ?? true,
        section_title: sData.value.section_title || 'Shop By Bestsellers',
        section_subtitle: sData.value.section_subtitle || "Discover India's favourite gifting options, curated bestsellers that make every celebration extra special",
        view_all_text: sData.value.view_all_text || 'View All Bestsellers',
        view_all_url: sData.value.view_all_url || '/category/bestsellers',
        show_view_all: sData.value.show_view_all ?? true,
        card_theme: sData.value.card_theme || 'classic-clean',
        card_bg_mode: sData.value.card_bg_mode || 'white',
        card_bg_color: sData.value.card_bg_color || '#FFFFFF',
        card_transparency: typeof sData.value.card_transparency === 'number' ? sData.value.card_transparency : 0,
        section_bg_mode: sData.value.section_bg_mode || 'transparent',
        section_bg_color: sData.value.section_bg_color || '#FFFFFF',
        cards_per_row: sData.value.cards_per_row || '4',
      };
      return memoryBestsellerSettings;
    }

    const { data: bData } = await supabase
      .from('home_banner_settings')
      .select('value')
      .eq('key', 'bestsellers_settings')
      .maybeSingle();

    if (bData?.value) {
      memoryBestsellerSettings = {
        is_enabled: bData.value.is_enabled ?? true,
        section_title: bData.value.section_title || 'Shop By Bestsellers',
        section_subtitle: bData.value.section_subtitle || "Discover India's favourite gifting options, curated bestsellers that make every celebration extra special",
        view_all_text: bData.value.view_all_text || 'View All Bestsellers',
        view_all_url: bData.value.view_all_url || '/category/bestsellers',
        show_view_all: bData.value.show_view_all ?? true,
        card_theme: bData.value.card_theme || 'classic-clean',
        card_bg_mode: bData.value.card_bg_mode || 'white',
        card_bg_color: bData.value.card_bg_color || '#FFFFFF',
        card_transparency: typeof bData.value.card_transparency === 'number' ? bData.value.card_transparency : 0,
        section_bg_mode: bData.value.section_bg_mode || 'transparent',
        section_bg_color: bData.value.section_bg_color || '#FFFFFF',
        cards_per_row: bData.value.cards_per_row || '4',
      };
      return memoryBestsellerSettings;
    }
  } catch (_) {}

  return memoryBestsellerSettings;
}

/**
 * Persist bestseller master settings
 */
async function persistBestsellerSettings(settings: BestsellerSettings): Promise<void> {
  memoryBestsellerSettings = settings;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'home_bestsellers_settings',
        value: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (_) {}

  try {
    await supabase.from('home_banner_settings').upsert(
      {
        key: 'bestsellers_settings',
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

// GET /api/v1/home-banners/bestsellers (Public: active cards & settings)
export const getPublicBestsellers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [settings, items] = await Promise.all([
      fetchBestsellerSettings(),
      fetchAllBestsellersFromDb(),
    ]);

    const activeItems = items.filter((b) => b.is_active);
    activeItems.sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'Bestsellers fetched successfully', {
      is_enabled: settings.is_enabled,
      section_title: settings.section_title,
      section_subtitle: settings.section_subtitle,
      view_all_text: settings.view_all_text,
      view_all_url: settings.view_all_url,
      show_view_all: settings.show_view_all,
      card_theme: settings.card_theme,
      card_bg_mode: settings.card_bg_mode,
      card_bg_color: settings.card_bg_color,
      card_transparency: settings.card_transparency,
      section_bg_mode: settings.section_bg_mode,
      section_bg_color: settings.section_bg_color,
      cards_per_row: settings.cards_per_row || '4',
      items: activeItems,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/home-banners/admin/bestsellers (Admin: all cards & settings)
export const getAdminBestsellers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [settings, items] = await Promise.all([
      fetchBestsellerSettings(),
      fetchAllBestsellersFromDb(),
    ]);

    items.sort((a, b) => a.order_index - b.order_index);

    return successResponse(res, 'Admin bestsellers fetched successfully', {
      is_enabled: settings.is_enabled,
      section_title: settings.section_title,
      section_subtitle: settings.section_subtitle,
      view_all_text: settings.view_all_text,
      view_all_url: settings.view_all_url,
      show_view_all: settings.show_view_all,
      card_theme: settings.card_theme,
      card_bg_mode: settings.card_bg_mode,
      card_bg_color: settings.card_bg_color,
      card_transparency: settings.card_transparency,
      section_bg_mode: settings.section_bg_mode,
      section_bg_color: settings.section_bg_color,
      cards_per_row: settings.cards_per_row || '4',
      items,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/home-banners/admin/bestsellers (Admin: create card)
export const createBestseller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      subtitle = null,
      price = 'Rs. 999',
      original_price = null,
      discount_badge = null,
      badge_text = 'BESTSELLER',
      badge_style = 'discount',
      rating = 4.9,
      reviews_count = 95,
      image_url = null,
      link_type = 'header',
      target_header_id = null,
      target_dropdown_id = null,
      link_url = '/',
      product_id = null,
      source_mode = 'catalog',
      order_index,
      is_active = true,
    } = req.body;

    if (!title || !title.trim()) {
      throw new AppError('Title is required for bestseller card', 400);
    }

    const currentItems = await fetchAllBestsellersFromDb();
    const nextOrder =
      typeof order_index === 'number'
        ? order_index
        : currentItems.length > 0
        ? Math.max(...currentItems.map((b) => b.order_index)) + 1
        : 1;

    const rawNewItem = {
      id: crypto.randomUUID(),
      product_id: product_id ? String(product_id).trim() : null,
      title: title.trim(),
      subtitle: subtitle && String(subtitle).trim() ? String(subtitle).trim() : null,
      price: String(price || 'Rs. 999').trim(),
      original_price: original_price && String(original_price).trim() ? String(original_price).trim() : null,
      discount_badge: discount_badge && String(discount_badge).trim() ? String(discount_badge).trim() : null,
      badge_text: String(badge_text || 'BESTSELLER').trim(),
      badge_style: badge_style === 'luxe' ? 'luxe' : badge_style === 'custom' ? 'custom' : 'discount',
      rating: Number(rating) || 4.9,
      reviews_count: Number(reviews_count) || 95,
      image_url: image_url && String(image_url).trim() ? String(image_url).trim() : null,
      link_type: link_type === 'dropdown' ? 'dropdown' : 'header',
      target_header_id: isValidUuid(target_header_id) ? target_header_id.trim() : null,
      target_dropdown_id: isValidUuid(target_dropdown_id) ? target_dropdown_id.trim() : null,
      link_url: (link_url || '/').trim(),
      source_mode: source_mode === 'custom' ? 'custom' : 'catalog',
      order_index: nextOrder,
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const newItem = sanitizeBestsellerItem(rawNewItem);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const dbPayload = {
          id: newItem.id,
          title: newItem.title,
          subtitle: newItem.subtitle,
          price: newItem.price,
          original_price: newItem.original_price,
          discount_badge: newItem.discount_badge,
          badge_style: newItem.badge_style,
          image_url: newItem.image_url,
          link_type: newItem.link_type,
          target_header_id: newItem.target_header_id,
          target_dropdown_id: newItem.target_dropdown_id,
          link_url: newItem.link_url,
          order_index: newItem.order_index,
          is_active: newItem.is_active,
          created_at: newItem.created_at,
          updated_at: newItem.updated_at,
        };
        const { error: insertErr } = await supabase.from('home_bestsellers').insert(dbPayload);
        if (insertErr) {
          console.warn(`[HomeBestsellers] Insert error for ${newItem.id}:`, insertErr.message);
        }
      } catch (err: any) {
        console.warn(`[HomeBestsellers] Insert exception for ${newItem.id}:`, err?.message || err);
      }
    }

    const updatedList = [...currentItems, newItem];
    await persistBestsellersToDb(updatedList);

    return successResponse(res, 'Bestseller card created successfully', newItem, 201);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/bestsellers/:id (Admin: update card)
export const updateBestseller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentItems = await fetchAllBestsellersFromDb();
    const existingIndex = currentItems.findIndex((b) => b.id === id);

    if (existingIndex === -1) {
      throw new AppError('Bestseller card not found', 404);
    }

    const existing = currentItems[existingIndex];

    // If image has changed or was removed, delete old image from Cloudflare R2
    if (existing.image_url && req.body?.image_url !== undefined && existing.image_url !== req.body.image_url) {
      try {
        await deleteFromR2(existing.image_url);
        console.log(`[Cloudflare R2] Deleted replaced bestseller image: ${existing.image_url}`);
      } catch (err: any) {
        console.warn(`[Cloudflare R2] Failed to delete replaced bestseller image: ${err?.message || err}`);
      }
    }

    const rawUpdated = {
      ...existing,
      ...req.body,
      id,
      updated_at: new Date().toISOString(),
    };
    const updatedItem = sanitizeBestsellerItem(rawUpdated);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const dbPayload = {
          title: updatedItem.title,
          subtitle: updatedItem.subtitle,
          price: updatedItem.price,
          original_price: updatedItem.original_price,
          discount_badge: updatedItem.discount_badge,
          badge_style: updatedItem.badge_style,
          image_url: updatedItem.image_url,
          link_type: updatedItem.link_type,
          target_header_id: updatedItem.target_header_id,
          target_dropdown_id: updatedItem.target_dropdown_id,
          link_url: updatedItem.link_url,
          order_index: updatedItem.order_index,
          is_active: updatedItem.is_active,
          updated_at: updatedItem.updated_at,
        };
        const { error: updateErr } = await supabase.from('home_bestsellers').update(dbPayload).eq('id', id);
        if (updateErr) {
          console.warn(`[HomeBestsellers] Supabase update error for ${id}:`, updateErr.message);
        }
      } catch (err: any) {
        console.warn(`[HomeBestsellers] Supabase update exception for ${id}:`, err?.message || err);
      }
    }

    currentItems[existingIndex] = updatedItem;
    await persistBestsellersToDb(currentItems);

    return successResponse(res, 'Bestseller card updated successfully', updatedItem);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/home-banners/admin/bestsellers/:id (Admin: delete card)
export const deleteBestseller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentItems = await fetchAllBestsellersFromDb();
    const itemToDelete = currentItems.find((b) => b.id === id);

    if (!itemToDelete) {
      throw new AppError('Bestseller card not found', 404);
    }

    // Delete image from Cloudflare R2 if applicable
    if (itemToDelete.image_url) {
      try {
        await deleteFromR2(itemToDelete.image_url);
        console.log(`[Cloudflare R2] Deleted bestseller image: ${itemToDelete.image_url}`);
      } catch (err: any) {
        console.warn(`[Cloudflare R2] Failed to delete bestseller image: ${err?.message || err}`);
      }
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('home_bestsellers').delete().eq('id', id);
      } catch (_) {}
    }

    const filtered = currentItems.filter((b) => b.id !== id);
    await persistBestsellersToDb(filtered);

    return successResponse(res, 'Bestseller card deleted successfully');
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/home-banners/admin/bestsellers/reorder
export const reorderBestsellers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      throw new AppError('orderedIds must be an array of UUIDs', 400);
    }

    const currentItems = await fetchAllBestsellersFromDb();
    const updated = currentItems.map((item) => {
      const newIdx = orderedIds.indexOf(item.id);
      return {
        ...item,
        order_index: newIdx !== -1 ? newIdx + 1 : item.order_index,
        updated_at: new Date().toISOString(),
      };
    });

    updated.sort((a, b) => a.order_index - b.order_index);
    await persistBestsellersToDb(updated);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        for (const item of updated) {
          await supabase
            .from('home_bestsellers')
            .update({ order_index: item.order_index, updated_at: item.updated_at })
            .eq('id', item.id);
        }
      } catch (_) {}
    }

    return successResponse(res, 'Bestsellers reordered successfully', updated);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/home-banners/admin/bestsellers/settings
export const updateBestsellerSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const current = await fetchBestsellerSettings();
    const updated: BestsellerSettings = {
      is_enabled: req.body.is_enabled !== undefined ? Boolean(req.body.is_enabled) : current.is_enabled,
      section_title:
        req.body.section_title !== undefined ? String(req.body.section_title).trim() : current.section_title,
      section_subtitle:
        req.body.section_subtitle !== undefined ? String(req.body.section_subtitle).trim() : current.section_subtitle,
      view_all_text:
        req.body.view_all_text !== undefined ? String(req.body.view_all_text).trim() : current.view_all_text,
      view_all_url:
        req.body.view_all_url !== undefined ? String(req.body.view_all_url).trim() : current.view_all_url,
      show_view_all:
        req.body.show_view_all !== undefined ? Boolean(req.body.show_view_all) : current.show_view_all,
      card_theme:
        req.body.card_theme !== undefined ? String(req.body.card_theme).trim() : current.card_theme,
      card_bg_mode:
        req.body.card_bg_mode !== undefined ? String(req.body.card_bg_mode).trim() : current.card_bg_mode,
      card_bg_color:
        req.body.card_bg_color !== undefined ? String(req.body.card_bg_color).trim() : current.card_bg_color,
      card_transparency:
        typeof req.body.card_transparency === 'number'
          ? Math.max(0, Math.min(100, req.body.card_transparency))
          : current.card_transparency,
      section_bg_mode:
        req.body.section_bg_mode !== undefined ? String(req.body.section_bg_mode).trim() : current.section_bg_mode,
      section_bg_color:
        req.body.section_bg_color !== undefined ? String(req.body.section_bg_color).trim() : current.section_bg_color,
      cards_per_row:
        req.body.cards_per_row !== undefined ? String(req.body.cards_per_row).trim() : current.cards_per_row || '4',
      view_all_target_header_id:
        req.body.view_all_target_header_id !== undefined ? req.body.view_all_target_header_id : current.view_all_target_header_id || null,
      view_all_target_dropdown_id:
        req.body.view_all_target_dropdown_id !== undefined ? req.body.view_all_target_dropdown_id : current.view_all_target_dropdown_id || null,
      view_all_link_type:
        req.body.view_all_link_type !== undefined ? req.body.view_all_link_type : current.view_all_link_type || 'header',
    };

    await persistBestsellerSettings(updated);

    return successResponse(res, 'Bestseller settings updated successfully', updated);
  } catch (error) {
    return next(error);
  }
};

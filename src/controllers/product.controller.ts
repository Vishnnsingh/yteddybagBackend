import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { uploadToR2 } from '../utils/r2Upload';
import { ProductItem } from '../models/product.model';

// In-memory cache synced with database (empty by default, no hardcoded dummy data)
let memoryProductsCache: ProductItem[] = [];

// Slug generator helper (clean by default, no unique suffix)
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return base || 'product';
}

// Fetch all headers and dropdowns to join titles & paths onto products
async function fetchNavMetadataMap(): Promise<{
  headers: Map<string, { title: string; path: string }>;
  dropdowns: Map<string, { title: string; path: string }>;
}> {
  const headers = new Map<string, { title: string; path: string }>();
  const dropdowns = new Map<string, { title: string; path: string }>();
  const supabase = getSupabaseAdmin();
  if (!supabase) return { headers, dropdowns };

  try {
    const { data: hData } = await supabase.from('header_items').select('id, title, path');
    if (Array.isArray(hData)) {
      hData.forEach((h) => headers.set(h.id, { title: h.title, path: h.path || `/category/${h.title.toLowerCase().replace(/\s+/g, '-')}` }));
    }
  } catch (_) {}

  try {
    const { data: dData } = await supabase.from('header_dropdown_items').select('id, title, path');
    if (Array.isArray(dData)) {
      dData.forEach((d) => dropdowns.set(d.id, { title: d.title, path: d.path || `/category/${d.title.toLowerCase().replace(/\s+/g, '-')}` }));
    }
  } catch (_) {}

  return { headers, dropdowns };
}

// Fetch products directly from Supabase 'products' table (returns empty array if table is empty)
export async function fetchAllProductsFromDb(): Promise<ProductItem[]> {
  const supabase = getSupabaseAdmin();
  const { headers, dropdowns } = await fetchNavMetadataMap();

  if (!supabase) {
    return memoryProductsCache.map((p) => enrichProductWithNav(p, headers, dropdowns));
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      memoryProductsCache = data.map((row) => enrichProductWithNav(sanitizeProductRow(row), headers, dropdowns));
      return memoryProductsCache;
    }
  } catch (err: any) {
    console.warn('[Products] Fetch from products table error:', err?.message || err);
  }

  return memoryProductsCache.map((p) => enrichProductWithNav(p, headers, dropdowns));
}

// Persist across both tables
export async function persistProductsToDb(products: ProductItem[]): Promise<void> {
  memoryProductsCache = [...products];
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  if (products.length === 0) {
    try {
      await supabase.from('site_settings').delete().eq('key', 'products_catalog');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (_) {}
    return;
  }

  // 1. Always mirror to 'site_settings' (key = 'products_catalog')
  try {
    await supabase.from('site_settings').upsert(
      {
        key: 'products_catalog',
        value: products,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (err: any) {
    console.warn('[Products] Mirror to site_settings notice:', err?.message || err);
  }

  // 2. Try inserting / updating in 'products' table
  try {
    const rows = products.map((p, idx) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle || null,
      slug: (p.slug || generateSlug(p.title || 'product')).replace(/-[a-f0-9]{4,8}$/i, ''),
      sku: p.sku || null,
      price: Number(p.price),
      mrp: Number(p.mrp),
      discount_percent: Number(p.discount_percent) || 0,
      rating: Number(p.rating) || 4.8,
      reviews_count: Number(p.reviews_count) || 0,
      badge_text: p.badge_text || null,
      images: p.images || [],
      primary_image: p.primary_image || (p.images && p.images[0] ? p.images[0].url : '') || '',
      colors: p.colors || [],
      sizes: p.sizes || [],
      target_header_id: p.target_header_id || null,
      target_dropdown_id: p.target_dropdown_id || null,
      why_love_it: p.why_love_it || [],
      specifications: Array.isArray(p.specifications) ? p.specifications : [],
      description: p.description || '',
      stock_quantity: Number(p.stock_quantity) || 50,
      in_stock: p.in_stock !== false,
      is_active: p.is_active !== false,
      order_index: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
    if (upsertErr) {
      console.error('[Products] Upsert to products table error:', upsertErr.message);
    }
  } catch (err: any) {
    console.warn('[Products] Upsert to products table notice:', err?.message || err);
  }
}

function sanitizeSpecifications(raw: any): { key: string; value: string }[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        key: String(item.key || '').trim(),
        value: String(item.value || '').trim(),
      }))
      .filter((item) => item.key.length > 0 || item.value.length > 0);
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([key, value]) => ({
      key: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: String(value),
    }));
  }
  return [];
}

function sanitizeProductRow(row: any): ProductItem {
  const mrp = Number(row.mrp) || 0;
  const price = Number(row.price) || 0;
  const autoDiscount = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

  let images = Array.isArray(row.images) ? row.images : [];
  if (images.length === 0 && row.primary_image) {
    images = [{ id: 'img-main', url: row.primary_image, is_primary: true }];
  }
  const primaryImage =
    row.primary_image ||
    images.find((i: any) => i.is_primary)?.url ||
    images[0]?.url ||
    '';

  return {
    id: row.id,
    title: row.title || 'Untitled Product',
    subtitle: row.subtitle || null,
    slug: (row.slug ? String(row.slug).replace(/-[a-f0-9]{4,8}$/i, '') : '') || generateSlug(row.title || 'product'),
    sku: row.sku || null,
    price,
    mrp: mrp || price,
    discount_percent: typeof row.discount_percent === 'number' ? row.discount_percent : autoDiscount,
    rating: Number(row.rating) || 4.8,
    reviews_count: Number(row.reviews_count) || 0,
    badge_text: row.badge_text || null,
    badge_style: row.badge_style || 'ribbon',
    badge_color: row.badge_color || '#D26900',
    images,
    primary_image: primaryImage,
    colors: Array.isArray(row.colors) ? row.colors : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    target_header_id: row.target_header_id || null,
    target_dropdown_id: row.target_dropdown_id || null,
    header_title: row.header_title || null,
    header_path: row.header_path || null,
    dropdown_title: row.dropdown_title || null,
    dropdown_path: row.dropdown_path || null,
    why_love_it: Array.isArray(row.why_love_it) ? row.why_love_it : [],
    specifications: sanitizeSpecifications(row.specifications),
    description: row.description || '',
    stock_quantity: Number(row.stock_quantity) || 50,
    in_stock: row.in_stock !== false,
    is_active: row.is_active !== false,
    order_index: Number(row.order_index) || 0,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function enrichProductWithNav(
  p: ProductItem,
  headers: Map<string, { title: string; path: string }>,
  dropdowns: Map<string, { title: string; path: string }>
): ProductItem {
  const h = p.target_header_id ? headers.get(p.target_header_id) : undefined;
  const d = p.target_dropdown_id ? dropdowns.get(p.target_dropdown_id) : undefined;
  return {
    ...p,
    header_title: h?.title || p.header_title || null,
    header_path: h?.path || p.header_path || null,
    dropdown_title: d?.title || p.dropdown_title || null,
    dropdown_path: d?.path || p.dropdown_path || null,
  };
}

// ====================================================================
// CONTROLLERS
// ====================================================================

// GET /api/v1/products (Public: all active products with filters)
export const getPublicProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await fetchAllProductsFromDb();
    let filtered = all.filter((p) => p.is_active);

    const { header_id, dropdown_id, search, sort, limit } = req.query;

    if (header_id && typeof header_id === 'string') {
      filtered = filtered.filter((p) => p.target_header_id === header_id);
    }
    if (dropdown_id && typeof dropdown_id === 'string') {
      filtered = filtered.filter((p) => p.target_dropdown_id === dropdown_id);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.badge_text && p.badge_text.toLowerCase().includes(q))
      );
    }

    if (sort === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'discount') {
      filtered.sort((a, b) => b.discount_percent - a.discount_percent);
    } else {
      // Default: order_index ascending
      filtered.sort((a, b) => a.order_index - b.order_index);
    }

    if (limit && !isNaN(Number(limit))) {
      filtered = filtered.slice(0, Number(limit));
    }

    return successResponse(res, 'Products fetched successfully', filtered);
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/products/:idOrSlug (Public: single product + related products)
export const getPublicProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const all = await fetchAllProductsFromDb();
    const cleanId = id.toLowerCase().trim();
    const product = all.find(
      (p) =>
        p.id === id ||
        (p.slug && p.slug.toLowerCase() === cleanId) ||
        p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanId ||
        (p.slug && p.slug.toLowerCase().startsWith(cleanId)) ||
        cleanId.startsWith(p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    );

    if (!product) {
      throw new AppError(`Product "${id}" not found`, 404);
    }

    // Related products (same header/dropdown, or top items)
    const related = all
      .filter((p) => p.id !== product.id && p.is_active)
      .filter(
        (p) =>
          (product.target_dropdown_id && p.target_dropdown_id === product.target_dropdown_id) ||
          (product.target_header_id && p.target_header_id === product.target_header_id) ||
          true
      )
      .slice(0, 6);

    return successResponse(res, 'Product fetched successfully', {
      product,
      relatedProducts: related,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/products/admin/all (Admin: all products including inactive)
export const getAdminProducts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await fetchAllProductsFromDb();
    const sorted = [...all].sort((a, b) => a.order_index - b.order_index);
    return successResponse(res, 'All products fetched for admin', sorted);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/products/admin (Admin: create product)
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, price, mrp, primary_image } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new AppError('Product title is required', 400);
    }
    if (price === undefined || isNaN(Number(price))) {
      throw new AppError('Valid selling price is required', 400);
    }
    if (mrp === undefined || isNaN(Number(mrp))) {
      throw new AppError('Valid MRP is required', 400);
    }

    const all = await fetchAllProductsFromDb();
    const newId =
      req.body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.body.id)
        ? req.body.id
        : crypto.randomUUID();
    const slug = req.body.slug?.trim()?.replace(/-[a-f0-9]{4,8}$/i, '') || generateSlug(title);

    const numMrp = Number(mrp);
    const numPrice = Number(price);
    const calculatedDiscount =
      req.body.discount_percent !== undefined
        ? Number(req.body.discount_percent)
        : numMrp > numPrice && numMrp > 0
        ? Math.round(((numMrp - numPrice) / numMrp) * 100)
        : 0;

    let images = Array.isArray(req.body.images) ? req.body.images : [];
    const resolvedPrimary =
      primary_image ||
      images.find((i: any) => i.is_primary)?.url ||
      images[0]?.url ||
      '';

    if (images.length === 0) {
      images = [{ id: 'img-1', url: resolvedPrimary, is_primary: true }];
    }

    const newProduct: ProductItem = sanitizeProductRow({
      ...req.body,
      id: newId,
      title: title.trim(),
      slug,
      price: numPrice,
      mrp: numMrp,
      discount_percent: calculatedDiscount,
      primary_image: resolvedPrimary,
      images,
      order_index: all.length + 1,
      is_active: req.body.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    all.push(newProduct);
    await persistProductsToDb(all);

    return successResponse(res, 'Product created successfully', newProduct, 201);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/products/admin/:id (Admin: update product)
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const all = await fetchAllProductsFromDb();
    const idx = all.findIndex((p) => p.id === id);

    if (idx === -1) {
      throw new AppError(`Product "${id}" not found`, 404);
    }

    const existing = all[idx];
    const numMrp = req.body.mrp !== undefined ? Number(req.body.mrp) : existing.mrp;
    const numPrice = req.body.price !== undefined ? Number(req.body.price) : existing.price;

    const discount =
      req.body.discount_percent !== undefined
        ? Number(req.body.discount_percent)
        : numMrp > numPrice && numMrp > 0
        ? Math.round(((numMrp - numPrice) / numMrp) * 100)
        : existing.discount_percent;

    let images = req.body.images !== undefined ? req.body.images : existing.images;
    const primary =
      req.body.primary_image ||
      images.find((i: any) => i.is_primary)?.url ||
      images[0]?.url ||
      existing.primary_image;

    const updated: ProductItem = sanitizeProductRow({
      ...existing,
      ...req.body,
      id,
      mrp: numMrp,
      price: numPrice,
      discount_percent: discount,
      primary_image: primary,
      images,
      updated_at: new Date().toISOString(),
    });

    all[idx] = updated;
    await persistProductsToDb(all);

    return successResponse(res, 'Product updated successfully', updated);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/products/admin/:id (Admin: delete product)
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const all = await fetchAllProductsFromDb();
    const filtered = all.filter((p) => p.id !== id);

    if (filtered.length === all.length) {
      throw new AppError(`Product "${id}" not found`, 404);
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (_) {}
    }

    await persistProductsToDb(filtered);

    return successResponse(res, 'Product deleted successfully', { id });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/v1/products/admin/:id/toggle-status (Admin: toggle is_active)
export const toggleProductStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const all = await fetchAllProductsFromDb();
    const idx = all.findIndex((p) => p.id === id);

    if (idx === -1) {
      throw new AppError(`Product "${id}" not found`, 404);
    }

    const newStatus = !all[idx].is_active;
    const targetProduct = all[idx];
    targetProduct.is_active = newStatus;
    targetProduct.updated_at = new Date().toISOString();

    await persistProductsToDb(all);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      // 1. Direct update to products table
      try {
        await supabase
          .from('products')
          .update({ is_active: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err: any) {
        console.warn('[Products] direct update products table is_active notice:', err?.message || err);
      }

      // 2. Direct update to home_bestsellers table if linked
      try {
        await supabase
          .from('home_bestsellers')
          .update({ is_active: newStatus, updated_at: new Date().toISOString() })
          .or(`product_id.eq.${id},title.ilike.${targetProduct.title}`);
      } catch (_) {}

      // 3. Update home_sections_layout items if linked
      try {
        const { data: layoutRows } = await supabase.from('home_sections_layout').select('*');
        if (Array.isArray(layoutRows) && layoutRows.length > 0) {
          let layoutChanged = false;
          const updatedLayout = layoutRows.map((sec) => {
            if (Array.isArray(sec.items)) {
              let secChanged = false;
              const newItems = sec.items.map((it: any) => {
                if (it.product_id === id || (it.title && it.title.toLowerCase().trim() === targetProduct.title.toLowerCase().trim())) {
                  secChanged = true;
                  layoutChanged = true;
                  return { ...it, is_active: newStatus };
                }
                return it;
              });
              if (secChanged) {
                return {
                  ...sec,
                  items: newItems,
                  settings: {
                    ...(sec.settings || {}),
                    items: newItems,
                  },
                };
              }
            }
            return sec;
          });

          if (layoutChanged) {
            await supabase.from('home_sections_layout').upsert(updatedLayout, { onConflict: 'id' });
          }
        }
      } catch (_) {}
    }

    return successResponse(res, `Product ${newStatus ? 'activated' : 'deactivated'} successfully`, targetProduct);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/products/admin/upload-images (Admin: upload multiple images)
export const uploadProductImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new AppError('No image files provided', 400);
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      let fileUrl = '';
      // 1. Try Cloudflare R2
      try {
        fileUrl = await uploadToR2(file, 'products');
      } catch (r2Err: any) {
        console.warn('[Cloudflare R2] Product upload note, using local fallback:', r2Err?.message || r2Err);
        const ext = path.extname(file.originalname) || '.jpg';
        const filename = `product-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const localDirPath = path.join(__dirname, '../../uploads/products');
        fs.mkdirSync(localDirPath, { recursive: true });
        const localFilePath = path.join(localDirPath, filename);
        fs.writeFileSync(localFilePath, file.buffer);

        const host = req.get('host') || 'localhost:5000';
        const protocol = req.protocol || 'http';
        fileUrl = `${protocol}://${host}/uploads/products/${filename}`;
      }
      uploadedUrls.push(fileUrl);
    }

    return successResponse(
      res,
      `${uploadedUrls.length} image(s) uploaded successfully`,
      { urls: uploadedUrls },
      201
    );
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/products/admin/seed-100 (Seed 100 realistic plush products into database)
export const seedSampleProducts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { headers, dropdowns } = await fetchNavMetadataMap();

    // Find TOYS header and Kids Toy dropdown
    let toysHeaderId: string | null = null;
    let kidsToyDropdownId: string | null = null;

    for (const [id, h] of headers.entries()) {
      if (h.title.toLowerCase().includes('toy')) {
        toysHeaderId = id;
        break;
      }
    }
    if (!toysHeaderId && headers.size > 0) {
      toysHeaderId = headers.keys().next().value || null;
    }

    for (const [id, d] of dropdowns.entries()) {
      if (d.title.toLowerCase().includes('kid') || d.title.toLowerCase().includes('toy')) {
        kidsToyDropdownId = id;
        break;
      }
    }
    if (!kidsToyDropdownId && dropdowns.size > 0) {
      kidsToyDropdownId = dropdowns.keys().next().value || null;
    }

    const SAMPLE_PHOTOS = [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800',
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800',
      'https://images.unsplash.com/photo-1581557991964-125469da3b8a?q=80&w=800',
      'https://images.unsplash.com/photo-1559454403-b8fb88521f11?q=80&w=800',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800',
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800',
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=800',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800',
      'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=800',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800',
      'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=800',
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=800',
      'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800',
      'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?q=80&w=800',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800',
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=800',
    ];

    const PREFIXES = ['Fluffy', 'Honey', 'Pastel', 'Vintage', 'Golden', 'Snuggle', 'Cuddle', 'Velvet', 'Cloud', 'Sweet', 'Little', 'Chubby', 'Cozy', 'Dreamy', 'Panda', 'Berry', 'Sunny', 'Starry', 'Caramel', 'Rainbow'];
    const CREATURES = ['Teddy', 'Bear', 'Bunny', 'Panda', 'Koala', 'Lamb', 'Puppy', 'Kitten', 'Duckling', 'Fox', 'Penguin', 'Elephant', 'Giraffe', 'Deer', 'Unicorn'];
    const TYPES = ['Backpack', 'School Bag', 'Daypack', 'Satchel', 'Sling Bag', 'Travel Pack', 'Pouch', 'Mini Pack', 'Cuddle Carrier', 'Rucksack'];

    const BADGES = ['Bestseller', 'Trending', 'Hot Deal', 'New Arrival', 'Limited Edition', ''];
    const BADGE_STYLES = ['ribbon', 'pill', 'minimal', 'glass', 'energetic'];
    const BADGE_COLORS = ['#D26900', '#E65100', '#FF3F6C', '#059669', '#2563EB', '#111827'];

    const COLOR_PALETTES = [
      [{ name: 'Warm Amber', hex: '#D26900' }, { name: 'Honey Brown', hex: '#8D5B4C' }],
      [{ name: 'Pastel Pink', hex: '#F472B6' }, { name: 'Pearl White', hex: '#F3F4F6' }],
      [{ name: 'Baby Blue', hex: '#60A5FA' }, { name: 'Midnight Navy', hex: '#1E3A8A' }],
      [{ name: 'Emerald Sage', hex: '#059669' }, { name: 'Cream Beige', hex: '#F59E0B' }],
      [{ name: 'Lavender Violet', hex: '#A855F7' }, { name: 'Soft Gray', hex: '#9CA3AF' }],
    ];

    const SIZES_OPTIONS = [
      ['Mini (25cm)', 'Standard (35cm)'],
      ['Standard (35cm)', 'Jumbo (45cm)'],
      ['Free Size'],
      ['Mini (25cm)', 'Standard (35cm)', 'Jumbo (45cm)'],
    ];

    const generatedProducts: ProductItem[] = [];

    for (let i = 1; i <= 100; i++) {
      const pIndex = (i - 1) % PREFIXES.length;
      const cIndex = (i * 2) % CREATURES.length;
      const tIndex = (i * 3) % TYPES.length;

      const title = `${PREFIXES[pIndex]} ${CREATURES[cIndex]} ${TYPES[tIndex]} ${i}`;
      const subtitle = `Handcrafted velvet companion for kids & daily fun (Edition #${i})`;
      const cleanSlug = generateSlug(title);

      const mrp = 1499 + ((i * 100) % 2500); // 1499 to 3999
      const disc = 20 + ((i * 7) % 35); // 20% to 55%
      const price = Math.round(mrp * (1 - disc / 100));

      const img1 = SAMPLE_PHOTOS[(i - 1) % SAMPLE_PHOTOS.length];
      const img2 = SAMPLE_PHOTOS[(i + 4) % SAMPLE_PHOTOS.length];
      const img3 = SAMPLE_PHOTOS[(i + 8) % SAMPLE_PHOTOS.length];

      const badgeText = BADGES[i % BADGES.length];
      const badgeStyle = BADGE_STYLES[i % BADGE_STYLES.length];
      const badgeColor = BADGE_COLORS[i % BADGE_COLORS.length];

      const colors = COLOR_PALETTES[i % COLOR_PALETTES.length];
      const sizes = SIZES_OPTIONS[i % SIZES_OPTIONS.length];

      const rating = Number((4.5 + ((i % 6) * 0.1)).toFixed(1));
      const reviewsCount = 25 + ((i * 13) % 400);

      generatedProducts.push({
        id: crypto.randomUUID(),
        title,
        subtitle,
        slug: cleanSlug,
        sku: `YTB-KID-${1000 + i}`,
        price,
        mrp,
        discount_percent: disc,
        rating,
        reviews_count: reviewsCount,
        badge_text: badgeText || null,
        badge_style: badgeStyle,
        badge_color: badgeColor,
        images: [
          { id: `img-${i}-1`, url: img1, is_primary: true, alt: `${title} Main` },
          { id: `img-${i}-2`, url: img2, is_primary: false, alt: `${title} Side` },
          { id: `img-${i}-3`, url: img3, is_primary: false, alt: `${title} Angle` },
        ],
        primary_image: img1,
        colors,
        sizes,
        target_header_id: toysHeaderId,
        target_dropdown_id: kidsToyDropdownId,
        why_love_it: [
          'Ultra-soft feather-touch velvet plush that never sheds',
          'Ergonomic padded shoulder straps designed for gentle posture',
          'Child-safe anti-scratch YKK zippers with teddy pullers',
        ],
        specifications: [
          { key: 'Material & Fabric', value: '100% Premium Korean Velvet Plush + Non-Toxic PP Cotton Fill' },
          { key: 'Dimensions (H x W x D)', value: '35cm x 28cm x 14cm' },
          { key: 'Item Weight', value: '380 grams' },
          { key: 'Recommended Age Group', value: 'All ages (3+ Years recommended)' },
        ],
        description: `Delight your little one with the ${title}. Handcrafted with ultra-soft Korean velvet fabric, ergonomic padded straps, and charming details.`,
        stock_quantity: 25 + (i % 60),
        in_stock: true,
        is_active: true,
        order_index: i,
        created_at: new Date(Date.now() - (100 - i) * 3600000).toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Persist all 100 to DB & site_settings
    await persistProductsToDb(generatedProducts);

    return successResponse(
      res,
      `Successfully generated & migrated ${generatedProducts.length} demo products to database!`,
      { count: generatedProducts.length }
    );
  } catch (error) {
    return next(error);
  }
};

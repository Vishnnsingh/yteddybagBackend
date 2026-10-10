import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { fetchAllProductsFromDb } from './product.controller';
import { ProductItem } from '../models/product.model';

// In-memory fallback if Supabase table is not yet migrated
interface WishlistRecord {
  id: string;
  userId?: string | null;
  guestId?: string | null;
  productId: string;
  createdAt: string;
}
let memoryWishlist: WishlistRecord[] = [];

// Helper to extract identifier (either authenticated user ID or guest ID)
function getRequesterIdentifiers(req: Request): { userId: string | null; guestId: string | null } {
  const userId = (req as any).user?.userId || null;
  const guestHeader = req.headers['x-guest-id'];
  const guestId = typeof guestHeader === 'string' && guestHeader.trim() ? guestHeader.trim() : null;
  return { userId, guestId };
}

// GET /api/v1/wishlist
export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, guestId } = getRequesterIdentifiers(req);
    if (!userId && !guestId) {
      return successResponse(res, 'Wishlist empty for anonymous guest', []);
    }

    const supabase = getSupabaseAdmin();
    let productIds: string[] = [];

    if (supabase) {
      try {
        let query = supabase.from('wishlist').select('product_id, created_at');
        if (userId) {
          query = query.eq('user_id', userId);
        } else if (guestId) {
          query = query.eq('guest_id', guestId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          productIds = data.map((d: any) => d.product_id);
        }
      } catch (err: any) {
        console.warn('[Wishlist] DB query failed, using memory fallback:', err?.message);
      }
    }

    // Fallback to memory if DB gave nothing and memory has items
    if (productIds.length === 0) {
      productIds = memoryWishlist
        .filter((w) => (userId && w.userId === userId) || (guestId && w.guestId === guestId))
        .map((w) => w.productId);
    }

    const allProducts = await fetchAllProductsFromDb();
    const wishlistedProducts = productIds
      .map((pid) => allProducts.find((p) => p.id === pid))
      .filter(Boolean) as ProductItem[];

    return successResponse(res, 'Wishlist retrieved successfully', wishlistedProducts);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/wishlist/toggle
export const toggleWishlistItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.body;
    if (!productId || typeof productId !== 'string') {
      throw new AppError('Product ID is required', 400);
    }

    const { userId, guestId } = getRequesterIdentifiers(req);
    if (!userId && !guestId) {
      throw new AppError('Session or User identification required', 400);
    }

    const supabase = getSupabaseAdmin();
    let isCurrentlyInWishlist = false;

    // Check in DB
    if (supabase) {
      try {
        let checkQuery = supabase.from('wishlist').select('id').eq('product_id', productId);
        if (userId) {
          checkQuery = checkQuery.eq('user_id', userId);
        } else {
          checkQuery = checkQuery.eq('guest_id', guestId);
        }
        const { data } = await checkQuery.limit(1);
        if (Array.isArray(data) && data.length > 0) {
          isCurrentlyInWishlist = true;
        }
      } catch (_) {}
    }

    // Check in memory fallback
    if (!isCurrentlyInWishlist) {
      isCurrentlyInWishlist = memoryWishlist.some(
        (w) =>
          w.productId === productId &&
          ((userId && w.userId === userId) || (guestId && w.guestId === guestId))
      );
    }

    const allProducts = await fetchAllProductsFromDb();
    const product = allProducts.find((p) => p.id === productId);

    if (isCurrentlyInWishlist) {
      // Remove from wishlist
      if (supabase) {
        try {
          let delQuery = supabase.from('wishlist').delete().eq('product_id', productId);
          if (userId) {
            delQuery = delQuery.eq('user_id', userId);
          } else {
            delQuery = delQuery.eq('guest_id', guestId);
          }
          await delQuery;
        } catch (_) {}
      }

      memoryWishlist = memoryWishlist.filter(
        (w) =>
          !(
            w.productId === productId &&
            ((userId && w.userId === userId) || (guestId && w.guestId === guestId))
          )
      );

      return successResponse(res, 'Product removed from wishlist', {
        inWishlist: false,
        productId,
        product,
      });
    } else {
      // Add to wishlist
      if (supabase) {
        try {
          await supabase.from('wishlist').insert({
            user_id: userId || null,
            guest_id: guestId || null,
            product_id: productId,
          });
        } catch (_) {}
      }

      memoryWishlist.push({
        id: `w-${Date.now()}`,
        userId: userId || null,
        guestId: guestId || null,
        productId,
        createdAt: new Date().toISOString(),
      });

      return successResponse(res, 'Product added to wishlist', {
        inWishlist: true,
        productId,
        product,
      });
    }
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/wishlist/:productId
export const removeWishlistItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { userId, guestId } = getRequesterIdentifiers(req);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let delQuery = supabase.from('wishlist').delete().eq('product_id', productId);
        if (userId) {
          delQuery = delQuery.eq('user_id', userId);
        } else if (guestId) {
          delQuery = delQuery.eq('guest_id', guestId);
        }
        await delQuery;
      } catch (_) {}
    }

    memoryWishlist = memoryWishlist.filter(
      (w) =>
        !(
          w.productId === productId &&
          ((userId && w.userId === userId) || (guestId && w.guestId === guestId))
        )
    );

    return successResponse(res, 'Product removed from wishlist', { productId });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/wishlist/sync (Sync guest products to logged-in user account)
export const syncWishlistOnLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      throw new AppError('Authentication required to sync wishlist', 401);
    }

    const { productIds } = req.body;
    if (Array.isArray(productIds) && productIds.length > 0) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          for (const pid of productIds) {
            await supabase.from('wishlist').upsert(
              { user_id: userId, product_id: pid },
              { onConflict: 'user_id,product_id' }
            );
          }
        } catch (_) {}
      }

      for (const pid of productIds) {
        if (!memoryWishlist.some((w) => w.userId === userId && w.productId === pid)) {
          memoryWishlist.push({
            id: `w-${Date.now()}-${Math.random()}`,
            userId,
            productId: pid,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // Return the full updated wishlist
    return getWishlist(req, res, next);
  } catch (error) {
    return next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { fetchAllProductsFromDb } from './product.controller';
import { CartItemRecord, PopulatedCartItem } from '../models/cart.model';

// In-memory fallback if Supabase table is not yet migrated or offline
let memoryCart: CartItemRecord[] = [];

// Helper to extract identifier (authenticated user ID or guest ID)
function getRequesterIdentifiers(req: Request): { userId: string | null; guestId: string | null } {
  const userId = (req as any).user?.userId || null;
  const guestHeader = req.headers['x-guest-id'];
  const guestId = typeof guestHeader === 'string' && guestHeader.trim() ? guestHeader.trim() : null;
  return { userId, guestId };
}

// Generate simple UUID fallback for memory items
function generateId(): string {
  return 'cart_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

// Helper to populate cart records with full product details
async function populateCartItems(records: CartItemRecord[]): Promise<PopulatedCartItem[]> {
  if (!records || records.length === 0) return [];

  const allProducts = await fetchAllProductsFromDb();
  const populated: PopulatedCartItem[] = [];

  for (const record of records) {
    const product = allProducts.find((p) => p.id === record.productId);
    if (product) {
      populated.push({
        id: record.id,
        productId: record.productId,
        product,
        selectedColor: record.selectedColor || null,
        selectedSize: record.selectedSize || null,
        quantity: Math.max(1, Number(record.quantity) || 1),
        isSelected: record.isSelected !== false,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString(),
      });
    }
  }

  return populated;
}

// GET /api/v1/cart
export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, guestId } = getRequesterIdentifiers(req);
    if (!userId && !guestId) {
      return successResponse(res, 'Cart is empty', []);
    }

    const supabase = getSupabaseAdmin();
    let records: CartItemRecord[] = [];
    let dbSuccess = false;

    if (supabase) {
      try {
        let query = supabase.from('cart').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        } else if (guestId) {
          query = query.eq('guest_id', guestId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          dbSuccess = true;
          records = data.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            guestId: d.guest_id,
            productId: d.product_id,
            selectedColor: d.selected_color,
            selectedSize: d.selected_size,
            quantity: d.quantity || 1,
            isSelected: d.is_selected !== false,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      } catch (err: any) {
        console.warn('[Cart] Supabase getCart failed, using memory fallback:', err?.message);
      }
    }

    if (!dbSuccess) {
      records = memoryCart.filter((c) => (userId && c.userId === userId) || (guestId && c.guestId === guestId));
    }

    const populated = await populateCartItems(records);
    return successResponse(res, 'Cart retrieved successfully', populated);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/cart/add
export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, selectedColor, selectedSize, quantity = 1 } = req.body;
    if (!productId || typeof productId !== 'string') {
      throw new AppError('Product ID is required', 400);
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const { userId, guestId } = getRequesterIdentifiers(req);
    const effectiveGuestId = guestId || (!userId ? 'guest_' + Math.random().toString(36).substring(2, 9) : null);

    const supabase = getSupabaseAdmin();
    let updatedRecord: CartItemRecord | null = null;

    if (supabase) {
      try {
        let findQuery = supabase.from('cart').select('*').eq('product_id', productId);
        if (userId) {
          findQuery = findQuery.eq('user_id', userId);
        } else if (effectiveGuestId) {
          findQuery = findQuery.eq('guest_id', effectiveGuestId);
        }

        if (selectedColor) {
          findQuery = findQuery.eq('selected_color', selectedColor);
        } else {
          findQuery = findQuery.is('selected_color', null);
        }

        if (selectedSize) {
          findQuery = findQuery.eq('selected_size', selectedSize);
        } else {
          findQuery = findQuery.is('selected_size', null);
        }

        const { data: existingItems } = await findQuery.limit(1);

        if (Array.isArray(existingItems) && existingItems.length > 0) {
          const current = existingItems[0];
          const newQty = (current.quantity || 1) + qty;
          const { data: updated } = await supabase
            .from('cart')
            .update({ quantity: newQty, is_selected: true, updated_at: new Date().toISOString() })
            .eq('id', current.id)
            .select()
            .single();

          if (updated) {
            updatedRecord = {
              id: updated.id,
              userId: updated.user_id,
              guestId: updated.guest_id,
              productId: updated.product_id,
              selectedColor: updated.selected_color,
              selectedSize: updated.selected_size,
              quantity: updated.quantity,
              isSelected: updated.is_selected,
              createdAt: updated.created_at,
              updatedAt: updated.updated_at,
            };
          }
        } else {
          const { data: inserted } = await supabase
            .from('cart')
            .insert({
              user_id: userId || null,
              guest_id: effectiveGuestId,
              product_id: productId,
              selected_color: selectedColor || null,
              selected_size: selectedSize || null,
              quantity: qty,
              is_selected: true,
            })
            .select()
            .single();

          if (inserted) {
            updatedRecord = {
              id: inserted.id,
              userId: inserted.user_id,
              guestId: inserted.guest_id,
              productId: inserted.product_id,
              selectedColor: inserted.selected_color,
              selectedSize: inserted.selected_size,
              quantity: inserted.quantity,
              isSelected: inserted.is_selected,
              createdAt: inserted.created_at,
              updatedAt: inserted.updated_at,
            };
          }
        }
      } catch (err: any) {
        console.warn('[Cart] Supabase addToCart error, falling back to memory:', err?.message);
      }
    }

    // Memory fallback if DB was not updated
    if (!updatedRecord) {
      const matchIndex = memoryCart.findIndex(
        (item) =>
          ((userId && item.userId === userId) || (effectiveGuestId && item.guestId === effectiveGuestId)) &&
          item.productId === productId &&
          (item.selectedColor || null) === (selectedColor || null) &&
          (item.selectedSize || null) === (selectedSize || null)
      );

      if (matchIndex > -1) {
        memoryCart[matchIndex].quantity += qty;
        memoryCart[matchIndex].isSelected = true;
        memoryCart[matchIndex].updatedAt = new Date().toISOString();
        updatedRecord = memoryCart[matchIndex];
      } else {
        const newItem: CartItemRecord = {
          id: generateId(),
          userId: userId || null,
          guestId: effectiveGuestId,
          productId,
          selectedColor: selectedColor || null,
          selectedSize: selectedSize || null,
          quantity: qty,
          isSelected: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        memoryCart.unshift(newItem);
        updatedRecord = newItem;
      }
    }

    const populated = await populateCartItems([updatedRecord]);
    return successResponse(res, 'Item added to cart successfully', populated[0]);
  } catch (error) {
    return next(error);
  }
};

// PUT /api/v1/cart/item/:itemId
export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const { quantity, isSelected, selectedColor, selectedSize } = req.body;
    const { userId, guestId } = getRequesterIdentifiers(req);

    if (!itemId) {
      throw new AppError('Cart item ID is required', 400);
    }

    // If quantity is <= 0, delete item
    if (quantity !== undefined && Number(quantity) <= 0) {
      return removeCartItem(req, res, next);
    }

    const supabase = getSupabaseAdmin();
    let updatedRecord: CartItemRecord | null = null;

    if (supabase) {
      try {
        const patch: Record<string, any> = { updated_at: new Date().toISOString() };
        if (quantity !== undefined) patch.quantity = Math.max(1, Number(quantity));
        if (isSelected !== undefined) patch.is_selected = Boolean(isSelected);
        if (selectedColor !== undefined) patch.selected_color = selectedColor;
        if (selectedSize !== undefined) patch.selected_size = selectedSize;

        let query = supabase.from('cart').update(patch).eq('id', itemId);
        if (userId) {
          query = query.eq('user_id', userId);
        } else if (guestId) {
          query = query.eq('guest_id', guestId);
        }

        const { data } = await query.select().single();
        if (data) {
          updatedRecord = {
            id: data.id,
            userId: data.user_id,
            guestId: data.guest_id,
            productId: data.product_id,
            selectedColor: data.selected_color,
            selectedSize: data.selected_size,
            quantity: data.quantity,
            isSelected: data.is_selected,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err: any) {
        console.warn('[Cart] Supabase updateCartItem error, using memory fallback:', err?.message);
      }
    }

    // Memory fallback
    if (!updatedRecord) {
      const item = memoryCart.find((c) => c.id === itemId);
      if (item) {
        if (quantity !== undefined) item.quantity = Math.max(1, Number(quantity));
        if (isSelected !== undefined) item.isSelected = Boolean(isSelected);
        if (selectedColor !== undefined) item.selectedColor = selectedColor;
        if (selectedSize !== undefined) item.selectedSize = selectedSize;
        item.updatedAt = new Date().toISOString();
        updatedRecord = item;
      }
    }

    if (!updatedRecord) {
      throw new AppError('Cart item not found', 404);
    }

    const populated = await populateCartItems([updatedRecord]);
    return successResponse(res, 'Cart item updated successfully', populated[0]);
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/cart/item/:itemId
export const removeCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const { userId, guestId } = getRequesterIdentifiers(req);

    if (!itemId) {
      throw new AppError('Cart item ID is required', 400);
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let query = supabase.from('cart').delete().eq('id', itemId);
        if (userId) {
          query = query.eq('user_id', userId);
        } else if (guestId) {
          query = query.eq('guest_id', guestId);
        }
        await query;
      } catch (err: any) {
        console.warn('[Cart] Supabase removeCartItem error, using memory fallback:', err?.message);
      }
    }

    memoryCart = memoryCart.filter((c) => c.id !== itemId);
    return successResponse(res, 'Cart item removed successfully', { id: itemId });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/cart/clear
export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, guestId } = getRequesterIdentifiers(req);
    const supabase = getSupabaseAdmin();

    if (supabase) {
      try {
        let query = supabase.from('cart').delete();
        if (userId) {
          query = query.eq('user_id', userId);
        } else if (guestId) {
          query = query.eq('guest_id', guestId);
        }
        await query;
      } catch (err: any) {
        console.warn('[Cart] Supabase clearCart error:', err?.message);
      }
    }

    memoryCart = memoryCart.filter((c) => !((userId && c.userId === userId) || (guestId && c.guestId === guestId)));
    return successResponse(res, 'Cart cleared successfully', []);
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/cart/sync
export const syncCartOnLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      throw new AppError('Authentication required to sync cart', 401);
    }

    const { items = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      // Just return current user cart
      return getCart(req, res, next);
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      for (const item of items) {
        if (!item.productId) continue;
        const qty = Math.max(1, Number(item.quantity) || 1);
        try {
          const { data: existing } = await supabase
            .from('cart')
            .select('id, quantity')
            .eq('user_id', userId)
            .eq('product_id', item.productId)
            .eq('selected_color', item.selectedColor || null)
            .eq('selected_size', item.selectedSize || null)
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase
              .from('cart')
              .update({ quantity: existing[0].quantity + qty, is_selected: true, updated_at: new Date().toISOString() })
              .eq('id', existing[0].id);
          } else {
            await supabase.from('cart').insert({
              user_id: userId,
              product_id: item.productId,
              selected_color: item.selectedColor || null,
              selected_size: item.selectedSize || null,
              quantity: qty,
              is_selected: true,
            });
          }
        } catch (_) {}
      }
    }

    return getCart(req, res, next);
  } catch (error) {
    return next(error);
  }
};

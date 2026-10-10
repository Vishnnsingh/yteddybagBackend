import { Router } from 'express';
import { optionalAuthenticate, authenticate } from '../middleware';
import {
  getWishlist,
  toggleWishlistItem,
  removeWishlistItem,
  syncWishlistOnLogin,
} from '../controllers/wishlist.controller';

const router = Router();

// Retrieve user's or guest's wishlist
router.get('/', optionalAuthenticate, getWishlist);

// Toggle product in wishlist (add if not present, remove if present)
router.post('/toggle', optionalAuthenticate, toggleWishlistItem);

// Remove specific product from wishlist
router.delete('/:productId', optionalAuthenticate, removeWishlistItem);

// Sync client-side guest wishlist upon login
router.post('/sync', authenticate, syncWishlistOnLogin);

export default router;

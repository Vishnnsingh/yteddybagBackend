import { Router } from 'express';
import { optionalAuthenticate, authenticate } from '../middleware';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  syncCartOnLogin,
} from '../controllers/cart.controller';

const router = Router();

// Retrieve user's or guest's cart
router.get('/', optionalAuthenticate, getCart);

// Add item to cart (with selectedColor, selectedSize, quantity)
router.post('/add', optionalAuthenticate, addToCart);

// Update cart item (quantity, selection toggle, size, color)
router.put('/item/:itemId', optionalAuthenticate, updateCartItem);

// Remove specific item from cart
router.delete('/item/:itemId', optionalAuthenticate, removeCartItem);

// Clear cart
router.delete('/clear', optionalAuthenticate, clearCart);

// Sync client-side guest cart upon login
router.post('/sync', authenticate, syncCartOnLogin);

export default router;

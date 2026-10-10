import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  deleteAccount,
  getOrders,
} from '../controllers/account.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All account routes require authentication
router.use(authenticate);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Addresses
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.put('/addresses/:id/default', setDefaultAddress);

// Orders
router.get('/orders', getOrders);

// Delete account
router.delete('/delete-account', deleteAccount);

export default router;

import { Router } from 'express';
import { adminLogin, adminLogout, getAdminProfile, createAdmin } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public admin auth routes
router.post('/auth/login', adminLogin);
router.post('/auth/create', createAdmin); // Remove or protect this in production

// Protected admin routes (requires admin role)
router.get('/auth/profile', authenticate, authorize('admin'), getAdminProfile);
router.post('/auth/logout', adminLogout);

export default router;

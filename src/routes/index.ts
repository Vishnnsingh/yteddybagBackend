import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import headerNavRoutes from './headerNav.routes';
import accountRoutes from './account.routes';
import homeBannerRoutes from './homeBanner.routes';
import productRoutes from './product.routes';
import wishlistRoutes from './wishlist.routes';
import cartRoutes from './cart.routes';
import orderRoutes from './order.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/header-nav', headerNavRoutes);
router.use('/home-banners', homeBannerRoutes);
router.use('/products', productRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/account', accountRoutes);
router.use('/', healthRoutes);

export default router;


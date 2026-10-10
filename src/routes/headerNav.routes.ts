import { Router } from 'express';
import upload from '../middleware/upload';
import {
  getPublicHeaderNav,
  getAllHeaderNavAdmin,
  createHeaderItem,
  updateHeaderItem,
  deleteHeaderItem,
  createDropdownItem,
  updateDropdownItem,
  deleteDropdownItem,
  getLoginBanner,
  updateLoginBanner,
  uploadBannerImage,
  deleteBannerImage,
  getAllPublicPages,
  getPublicPageBySlug,
  updatePublicPage,
  getBgTheme,
  updateBgTheme,
  uploadBgThemeDoodle,
  deleteBgThemeDoodle,
  uploadDropdownItemImage,
  uploadHeaderItemImage,
} from '../controllers/headerNav.controller';

const router = Router();

// Public route for customer header navigation
router.get('/', getPublicHeaderNav);

// Public route for login page offer banner
router.get('/login-banner', getLoginBanner);

// Public route for background theme configuration (desktop & mobile)
router.get('/bg-theme', getBgTheme);

// Public routes for legal & help pages (Terms of Use, Privacy Policy, Get Help)
router.get('/pages', getAllPublicPages);
router.get('/pages/:slug', getPublicPageBySlug);

// Admin routes for managing header and dropdowns (open to dashboard)
router.get('/admin/all', getAllHeaderNavAdmin);

// Admin route for login offer banner (specific route must come before :id)
router.put('/admin/login-banner', updateLoginBanner);
router.post('/admin/upload-banner-image', upload.single('image'), uploadBannerImage);
router.post('/admin/delete-banner-image', deleteBannerImage);

// Admin routes for background theme configuration (desktop & mobile cloud doodles)
router.put('/admin/bg-theme', updateBgTheme);
router.post('/admin/bg-theme/upload-doodle', upload.any(), uploadBgThemeDoodle);
router.post('/admin/bg-theme/delete-doodle', deleteBgThemeDoodle);

// Admin route for legal & help pages (specific route must come before :id)
router.put('/admin/pages/:slug', updatePublicPage);

router.post('/admin', createHeaderItem);
router.post('/admin/upload-header-image', upload.single('image'), uploadHeaderItemImage);
router.put('/admin/:id', updateHeaderItem);
router.delete('/admin/:id', deleteHeaderItem);

router.post('/admin/:headerId/sub-items', createDropdownItem);
router.post('/admin/upload-dropdown-image', upload.single('image'), uploadDropdownItemImage);
router.put('/admin/sub-items/:subId', updateDropdownItem);
router.delete('/admin/sub-items/:subId', deleteDropdownItem);

export default router;

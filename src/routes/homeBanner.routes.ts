import { Router } from 'express';
import mediaUpload from '../middleware/mediaUpload';
import {
  getPublicBanners,
  getAdminBanners,
  uploadBannerMedia,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  getBannerTheme,
  updateBannerTheme,
} from '../controllers/homeBanner.controller';
import {
  getPublicSubBanners,
  getAdminSubBanners,
  createSubBanner,
  updateSubBanner,
  deleteSubBanner,
  reorderSubBanners,
  updateSubBannerSettings,
} from '../controllers/homeSubBanner.controller';
import {
  getPublicOccasions,
  getAdminOccasions,
  createOccasion,
  updateOccasion,
  deleteOccasion,
  reorderOccasions,
  updateOccasionSettings,
} from '../controllers/homeOccasion.controller';
import {
  getPublicBestsellers,
  getAdminBestsellers,
  createBestseller,
  updateBestseller,
  deleteBestseller,
  reorderBestsellers,
  updateBestsellerSettings,
} from '../controllers/homeBestseller.controller';
import {
  getPublicPromoBanners,
  getAdminPromoBanners,
  createPromoBanner,
  updatePromoBanner,
  deletePromoBanner,
  reorderPromoBanners,
  updatePromoBannerSettings,
} from '../controllers/homePromoBanner.controller';
import {
  getPublicCustomCards,
  getAdminCustomCards,
  createCustomCard,
  updateCustomCard,
  deleteCustomCard,
  reorderCustomCards,
  updateCustomCardsSettings,
} from '../controllers/homeCustomCard.controller';
import {
  getPublicSectionsLayout,
  getAdminSectionsLayout,
  getSingleSectionLayout,
  updateSectionsLayout,
  updateSingleSectionLayout,
  addSection,
  duplicateSection,
  deleteSection,
  addSectionItem,
  updateSectionItem,
  deleteSectionItem,
  reorderSectionItems,
  resetSectionsLayout,
} from '../controllers/homeSectionLayout.controller';

const router = Router();

// Public routes for home page banner carousel, theme, sub-banners, occasions, bestsellers, promo banners, custom cards & layout
router.get('/', getPublicBanners);
router.get('/theme', getBannerTheme);
router.get('/sub-banners', getPublicSubBanners);
router.get('/occasions', getPublicOccasions);
router.get('/bestsellers', getPublicBestsellers);
router.get('/promo-banner', getPublicPromoBanners);
router.get('/custom-cards', getPublicCustomCards);
router.get('/layout', getPublicSectionsLayout);

// Admin routes for managing Home Sections dynamic layout, reordering, duplication, per-section items & spacing
router.get('/admin/layout', getAdminSectionsLayout);
router.put('/admin/layout', updateSectionsLayout);
router.post('/admin/layout/section', addSection);
router.get('/admin/layout/section/:id', getSingleSectionLayout);
router.put('/admin/layout/section/:id', updateSingleSectionLayout);
router.post('/admin/layout/section/:id/duplicate', duplicateSection);
router.delete('/admin/layout/section/:id', deleteSection);
router.post('/admin/layout/section/:id/items', addSectionItem);
router.put('/admin/layout/section/:id/items/:itemId', updateSectionItem);
router.delete('/admin/layout/section/:id/items/:itemId', deleteSectionItem);
router.patch('/admin/layout/section/:id/items/reorder', reorderSectionItems);
router.post('/admin/layout/reset', resetSectionsLayout);

// Admin routes for managing banners & theme
router.get('/admin/all', getAdminBanners);
router.post('/admin/upload-media', mediaUpload.single('file'), uploadBannerMedia);
router.post('/admin', createBanner);
router.patch('/admin/reorder', reorderBanners);
router.put('/admin/theme', updateBannerTheme);
router.put('/admin/:id', updateBanner);
router.delete('/admin/:id', deleteBanner);

// Admin routes for managing sub-banners & master settings
router.get('/admin/sub-banners', getAdminSubBanners);
router.post('/admin/sub-banners', createSubBanner);
router.put('/admin/sub-banners/settings', updateSubBannerSettings);
router.patch('/admin/sub-banners/reorder', reorderSubBanners);
router.put('/admin/sub-banners/:id', updateSubBanner);
router.delete('/admin/sub-banners/:id', deleteSubBanner);

// Admin routes for managing occasions & master settings
router.get('/admin/occasions', getAdminOccasions);
router.post('/admin/occasions', createOccasion);
router.put('/admin/occasions/settings', updateOccasionSettings);
router.patch('/admin/occasions/reorder', reorderOccasions);
router.put('/admin/occasions/:id', updateOccasion);
router.delete('/admin/occasions/:id', deleteOccasion);

// Admin routes for managing bestsellers & master settings
router.get('/admin/bestsellers', getAdminBestsellers);
router.post('/admin/bestsellers', createBestseller);
router.put('/admin/bestsellers/settings', updateBestsellerSettings);
router.patch('/admin/bestsellers/reorder', reorderBestsellers);
router.put('/admin/bestsellers/:id', updateBestseller);
router.delete('/admin/bestsellers/:id', deleteBestseller);

// Admin routes for managing promo banners & master settings
router.get('/admin/promo-banners', getAdminPromoBanners);
router.post('/admin/promo-banners', createPromoBanner);
router.put('/admin/promo-banners/settings', updatePromoBannerSettings);
router.patch('/admin/promo-banners/reorder', reorderPromoBanners);
router.put('/admin/promo-banners/:id', updatePromoBanner);
router.delete('/admin/promo-banners/:id', deletePromoBanner);

// Admin routes for managing custom showcase cards & master settings
router.get('/admin/custom-cards', getAdminCustomCards);
router.post('/admin/custom-cards', createCustomCard);
router.put('/admin/custom-cards/settings', updateCustomCardsSettings);
router.patch('/admin/custom-cards/reorder', reorderCustomCards);
router.put('/admin/custom-cards/:id', updateCustomCard);
router.delete('/admin/custom-cards/:id', deleteCustomCard);

export default router;

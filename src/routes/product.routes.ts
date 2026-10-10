import { Router } from 'express';
import mediaUpload from '../middleware/mediaUpload';
import {
  getPublicProducts,
  getFilteredProducts,
  getPublicProductById,
  getRelatedProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  uploadProductImages,
  seedSampleProducts,
} from '../controllers/product.controller';

const router = Router();

// ==========================================
// PUBLIC USER-FACING PRODUCT ROUTES
// ==========================================
// GET /api/v1/products - List products with filter, search, sorting & pagination
router.get('/', getPublicProducts);

// GET /api/v1/products/filter - Multi-criteria product filter endpoint (categories, price, discount, color)
router.get('/filter', getFilteredProducts);

// GET /api/v1/products/detail/:id - Get single product detail by UUID or slug (includes related products)
router.get('/detail/:id', getPublicProductById);

// GET /api/v1/products/related/:id - Dedicated related products endpoint for More You'll Adore (up to 50 items)
router.get('/related/:id', getRelatedProducts);

// ==========================================
// ADMIN PRODUCT MANAGEMENT ROUTES
// ==========================================
// GET /api/v1/products/admin/all - Get all products (active + inactive) for admin table
router.get('/admin/all', getAdminProducts);

// POST /api/v1/products/admin/upload-images - Upload multiple product images (R2 with local fallback)
router.post('/admin/upload-images', mediaUpload.array('files', 10), uploadProductImages);

// POST /api/v1/products/admin - Create new product
router.post('/admin', createProduct);

// PUT /api/v1/products/admin/:id - Update product
router.put('/admin/:id', updateProduct);

// PATCH /api/v1/products/admin/:id/toggle-status - Toggle active/inactive status
router.patch('/admin/:id/toggle-status', toggleProductStatus);

// DELETE /api/v1/products/admin/:id - Delete product
router.delete('/admin/:id', deleteProduct);

// POST /api/v1/products/admin/seed-100 - Seed 100 demo products into database
router.post('/admin/seed-100', seedSampleProducts);

export default router;

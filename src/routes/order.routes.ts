import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  adminGetAllOrders,
  adminUpdateOrderStatus,
  adminDeleteOrder,
  checkDeliveryPincode,
  adminCreateDelhiveryShipment,
  getDelhiveryTracking,
  adminCancelDelhiveryShipment,
  adminGetShippingLabel,
  markOrderAsPaid,
} from '../controllers/order.controller';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

// 1. Delhivery Pincode & Tracking Public / Customer Routes
router.get('/shipping/check-pincode', checkDeliveryPincode);
router.get('/shipping/track/:waybill', getDelhiveryTracking);

// 2. Customer Order Operations
router.post('/', optionalAuthenticate, createOrder);
router.get('/my-orders', optionalAuthenticate, getMyOrders);
router.get('/my-orders/:id', optionalAuthenticate, getOrderById);
router.patch('/my-orders/:id/cancel', optionalAuthenticate, cancelMyOrder);
router.patch('/my-orders/:id/pay', optionalAuthenticate, markOrderAsPaid);

// 3. Admin Order Management & Delhivery Logistics
router.get('/admin/all', adminGetAllOrders);
router.patch('/admin/:id/status', adminUpdateOrderStatus);
router.delete('/admin/:id', adminDeleteOrder);
router.post('/admin/:id/create-delhivery-shipment', adminCreateDelhiveryShipment);
router.get('/admin/:id/delhivery-track', getDelhiveryTracking);
router.post('/admin/:id/cancel-delhivery-shipment', adminCancelDelhiveryShipment);
router.get('/admin/:id/shipping-label', adminGetShippingLabel);

export default router;

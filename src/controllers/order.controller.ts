import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import type {
  OrderRecord,
  EcommerceOrderStatus,
  EcommercePaymentStatus,
} from '../models/order.model';
import { delhiveryService } from '../services/delhivery.service';

// In-memory fallback / cache in case Supabase table is not yet migrated
let memoryOrders: OrderRecord[] = [];

// Helper to validate whether a string is a valid UUID
export const isValidUuid = (val: any): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());

// Helper to fetch backup from site_settings table
async function getStoredBackupOrders(supabase: any): Promise<OrderRecord[]> {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'all_ecommerce_orders')
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      return data.value;
    }
  } catch (err) {
    console.warn('[Orders] Error loading site_settings backup:', err);
  }
  return memoryOrders;
}

// Helper to persist backup to site_settings table
async function persistBackupOrders(supabase: any, orders: OrderRecord[]) {
  memoryOrders = orders;
  try {
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('key', 'all_ecommerce_orders')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('site_settings')
        .update({ value: orders, updated_at: new Date().toISOString() })
        .eq('key', 'all_ecommerce_orders');
    } else {
      await supabase.from('site_settings').insert({
        key: 'all_ecommerce_orders',
        value: orders,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[Orders] Error saving site_settings backup:', err);
  }
}

// Convert DB snake_case row to OrderRecord camelCase
function mapDbRowToOrder(row: any): OrderRecord {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email || null,
    customerPhone: row.customer_phone,
    shippingAddress: row.shipping_address || {},
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status || 'Pending',
    paymentDetails: row.payment_details || null,
    orderStatus: row.order_status || 'Placed',
    totalMrp: Number(row.total_mrp) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    couponCode: row.coupon_code || null,
    couponDiscount: Number(row.coupon_discount) || 0,
    shippingFee: Number(row.shipping_fee) || 0,
    platformFee: Number(row.platform_fee) || 0,
    totalAmount: Number(row.total_amount) || 0,
    items: Array.isArray(row.items) ? row.items : [],
    trackingNumber: row.tracking_number || row.delhivery_waybill || null,
    courierPartner: row.courier_partner || (row.delhivery_waybill ? 'Delhivery B2C Express' : null),
    notes: row.notes || null,
    delhiveryWaybill: row.delhivery_waybill || row.tracking_number || null,
    delhiveryStatus: row.delhivery_status || null,
    delhiveryStatusCode: row.delhivery_status_code || null,
    delhiveryScans: Array.isArray(row.delhivery_scans) ? row.delhivery_scans : [],
    delhiveryLabelUrl: row.delhivery_label_url || null,
    estimatedDeliveryDate: row.estimated_delivery_date || null,
    pickupLocation: row.pickup_location || null,
    cancellationReason: row.cancellation_reason || null,
    cancellationComment: row.cancellation_comment || null,
    cancelledAt: row.cancelled_at || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// Convert OrderRecord to DB snake_case payload
function mapOrderToDbRow(order: OrderRecord): any {
  return {
    id: isValidUuid(order.id) ? order.id : crypto.randomUUID(),
    order_number: order.orderNumber,
    user_id: isValidUuid(order.userId) ? order.userId?.trim() : null,
    customer_name: order.customerName,
    customer_email: order.customerEmail || null,
    customer_phone: order.customerPhone,
    shipping_address: order.shippingAddress,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    payment_details: order.paymentDetails,
    order_status: order.orderStatus,
    total_mrp: order.totalMrp,
    discount_amount: order.discountAmount,
    coupon_code: order.couponCode,
    coupon_discount: order.couponDiscount,
    shipping_fee: order.shippingFee,
    platform_fee: order.platformFee,
    total_amount: order.totalAmount,
    items: order.items,
    tracking_number: order.delhiveryWaybill || order.trackingNumber,
    courier_partner: order.courierPartner,
    notes: order.notes,
    delhivery_waybill: order.delhiveryWaybill || order.trackingNumber,
    delhivery_status: order.delhiveryStatus,
    delhivery_status_code: order.delhiveryStatusCode,
    delhivery_scans: order.delhiveryScans,
    delhivery_label_url: order.delhiveryLabelUrl,
    estimated_delivery_date: order.estimatedDeliveryDate,
    pickup_location: order.pickupLocation,
    cancellation_reason: order.cancellationReason || null,
    cancellation_comment: order.cancellationComment || null,
    cancelled_at: order.cancelledAt || null,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

// 1. Create New Order (Customer Checkout)
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId || null;
    const {
      items,
      shippingAddress,
      paymentMethod = 'COD',
      paymentDetails = null,
      totalMrp = 0,
      discountAmount = 0,
      couponCode = null,
      couponDiscount = 0,
      shippingFee = 0,
      platformFee = 0,
      totalAmount,
      notes = null,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Order must contain at least one item', 400);
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.pincode) {
      throw new AppError('Shipping address is required and must be complete', 400);
    }

    if (totalAmount === undefined || totalAmount === null || Number(totalAmount) < 0) {
      throw new AppError('Valid total amount is required', 400);
    }

    const customerName =
      shippingAddress.name ||
      (req as any).user?.name ||
      (req as any).user?.email?.split('@')[0] ||
      'Customer';
    const customerPhone = shippingAddress.mobile || (req as any).user?.phone || '9999999999';
    const customerEmail = (req as any).user?.email || null;

    const generatedOrderNumber = `YTEDDY-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowIso = new Date().toISOString();

    const isPaidOnline = ['UPI', 'CARD', 'NETBANKING', 'WALLET'].includes(
      String(paymentMethod).toUpperCase()
    );

    const orderId = crypto.randomUUID();

    const newOrder: OrderRecord = {
      id: orderId,
      orderNumber: generatedOrderNumber,
      userId: isValidUuid(userId) ? userId : null,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: {
        name: shippingAddress.name || customerName,
        mobile: shippingAddress.mobile || customerPhone,
        address: shippingAddress.address,
        locality: shippingAddress.locality || '',
        city: shippingAddress.city,
        state: shippingAddress.state || 'Delhi',
        pincode: shippingAddress.pincode,
        type: shippingAddress.type || 'HOME',
      },
      paymentMethod: String(paymentMethod).toUpperCase(),
      paymentStatus: isPaidOnline ? 'Paid' : 'Pending',
      paymentDetails,
      orderStatus: 'Placed',
      totalMrp: Number(totalMrp) || Number(totalAmount),
      discountAmount: Number(discountAmount) || 0,
      couponCode,
      couponDiscount: Number(couponDiscount) || 0,
      shippingFee: Number(shippingFee) || 0,
      platformFee: Number(platformFee) || 0,
      totalAmount: Number(totalAmount),
      items: items.map((it: any) => ({
        productId: it.productId || it.product?.id || it.id,
        title: it.title || it.product?.title || 'Teddy Bag Item',
        primaryImage: it.primaryImage || it.product?.primary_image || (it.product?.images && it.product.images[0]?.url) || '',
        price: Number(it.price || it.product?.price || 0),
        mrp: Number(it.mrp || it.product?.mrp || it.price || 0),
        quantity: Math.max(1, Number(it.quantity) || 1),
        selectedColor: it.selectedColor || null,
        selectedSize: it.selectedSize || null,
        status: 'Confirmed' as EcommerceOrderStatus,
      })),
      trackingNumber: null,
      courierPartner: null,
      notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const supabase = getSupabaseAdmin();

    if (supabase) {
      // 1. Save to public.orders table
      const dbPayload = mapOrderToDbRow(newOrder);
      const { data: inserted, error: insertErr } = await supabase
        .from('orders')
        .insert(dbPayload)
        .select()
        .single();

      if (insertErr) {
        console.error('[Orders] Direct insert to orders table failed:', insertErr.message || insertErr);
        // Fallback retry without optional columns in case table structure differs
        const basePayload: any = {
          id: dbPayload.id,
          order_number: dbPayload.order_number,
          user_id: dbPayload.user_id,
          customer_name: dbPayload.customer_name,
          customer_email: dbPayload.customer_email,
          customer_phone: dbPayload.customer_phone,
          shipping_address: dbPayload.shipping_address,
          payment_method: dbPayload.payment_method,
          payment_status: dbPayload.payment_status,
          payment_details: dbPayload.payment_details,
          order_status: dbPayload.order_status,
          total_mrp: dbPayload.total_mrp,
          discount_amount: dbPayload.discount_amount,
          coupon_code: dbPayload.coupon_code,
          coupon_discount: dbPayload.coupon_discount,
          shipping_fee: dbPayload.shipping_fee,
          platform_fee: dbPayload.platform_fee,
          total_amount: dbPayload.total_amount,
          items: dbPayload.items,
          tracking_number: dbPayload.tracking_number,
          courier_partner: dbPayload.courier_partner,
          notes: dbPayload.notes,
          created_at: dbPayload.created_at,
          updated_at: dbPayload.updated_at,
        };
        const { data: retryData, error: retryErr } = await supabase
          .from('orders')
          .insert(basePayload)
          .select()
          .single();
        if (!retryErr && retryData) {
          newOrder.id = retryData.id;
        } else if (retryErr) {
          console.error('[Orders] Fallback insert failed:', retryErr.message || retryErr);
        }
      } else if (inserted) {
        newOrder.id = inserted.id;
      }

      // 2. Clear Cart items for user in DB if logged in
      if (userId && isValidUuid(userId)) {
        try {
          await supabase.from('cart').delete().eq('user_id', userId);
        } catch (e) {
          console.warn('[Orders] Error clearing user cart in DB:', e);
        }
      }

      // 3. Always maintain backup in site_settings & memory
      const existingBackup = await getStoredBackupOrders(supabase);
      const updatedBackup = [newOrder, ...existingBackup.filter((o) => o.id !== newOrder.id)];
      await persistBackupOrders(supabase, updatedBackup);
    } else {
      memoryOrders = [newOrder, ...memoryOrders];
    }

    return successResponse(res, 'Order placed successfully', newOrder, 201);
  } catch (err) {
    return next(err);
  }
};

// 2. Get Logged-in User's Orders ("My Orders")
export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { status, search } = req.query;
    const supabase = getSupabaseAdmin();
    let allOrders: OrderRecord[] = [];

    if (supabase) {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

      if (userId && isValidUuid(userId)) {
        // Query by user_id or associated customer_email / phone
        const { data: userRow } = await supabase.from('users').select('email, phone').eq('id', userId).maybeSingle();
        let matchOr: string[] = [`user_id.eq.${userId}`];
        if (userRow?.email) matchOr.push(`customer_email.eq.${userRow.email}`);
        if (userRow?.phone) matchOr.push(`customer_phone.eq.${userRow.phone}`);

        query = query.or(matchOr.join(','));
      } else {
        const guestEmail = (req.query.email as string) || (req.headers['x-guest-email'] as string);
        const guestPhone = (req.query.phone as string) || (req.headers['x-guest-phone'] as string);
        if (guestEmail || guestPhone) {
          let matchOr: string[] = [];
          if (guestEmail) matchOr.push(`customer_email.eq.${guestEmail}`);
          if (guestPhone) matchOr.push(`customer_phone.eq.${guestPhone}`);
          query = query.or(matchOr.join(','));
        } else {
          return successResponse(res, 'My orders fetched successfully', []);
        }
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        allOrders = data.map(mapDbRowToOrder);
      } else {
        const backup = await getStoredBackupOrders(supabase);
        allOrders = backup.filter((o) => (userId && o.userId === userId));
      }
    } else {
      allOrders = memoryOrders.filter((o) => (userId && o.userId === userId));
    }

    // Apply Filter by Status if provided
    if (status && typeof status === 'string' && status !== 'All') {
      allOrders = allOrders.filter(
        (o) => o.orderStatus.toLowerCase() === status.toLowerCase()
      );
    }

    // Apply Search Filter if provided (by order number or product title)
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      allOrders = allOrders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.items.some((it) => it.title.toLowerCase().includes(q))
      );
    }

    return successResponse(res, 'My orders fetched successfully', allOrders);
  } catch (err) {
    return next(err);
  }
};

// 3. Get Single Order Details (Customer or Admin)
export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const supabase = getSupabaseAdmin();
    let order: OrderRecord | null = null;

    if (supabase) {
      let query = supabase.from('orders').select('*');
      if (isValidUuid(id)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('order_number', id);
      }
      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        order = mapDbRowToOrder(data);
      } else {
        const backup = await getStoredBackupOrders(supabase);
        order = backup.find((o) => o.id === id || o.orderNumber === id) || null;
      }
    } else {
      order = memoryOrders.find((o) => o.id === id || o.orderNumber === id) || null;
    }

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Verify ownership (unless admin)
    if (userRole !== 'admin' && userRole !== 'super_admin' && order.userId && order.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    return successResponse(res, 'Order details fetched successfully', order);
  } catch (err) {
    return next(err);
  }
};

// 4. Cancel My Order (Customer Action)
export const cancelMyOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, comment, itemIndex, productId } = req.body || {};
    const userId = (req as any).user?.userId || (req as any).user?.id;

    const supabase = getSupabaseAdmin();
    let order: OrderRecord | null = null;

    if (supabase) {
      let query = supabase.from('orders').select('*');
      if (isValidUuid(id)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('order_number', id);
      }
      const { data } = await query.maybeSingle();
      if (data) {
        order = mapDbRowToOrder(data);
      } else {
        const alt = await supabase
          .from('orders')
          .select('*')
          .or(`id.eq.${id},order_number.eq.${id}`)
          .maybeSingle();
        if (alt.data) order = mapDbRowToOrder(alt.data);
      }
    }
    if (!order) {
      const backup = await getStoredBackupOrders(supabase);
      order = backup.find((o) => o.id === id || o.orderNumber === id) || null;
    }

    if (!order) throw new AppError('Order not found', 404);
    if (order.userId && userId && order.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    if (['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(order.orderStatus)) {
      throw new AppError(`Order cannot be cancelled in '${order.orderStatus}' status`, 400);
    }

    const now = new Date().toISOString();

    // Determine if user is cancelling a specific item or the entire order
    let targetIndex = -1;
    if (typeof itemIndex === 'number' && itemIndex >= 0 && itemIndex < order.items.length) {
      targetIndex = itemIndex;
    } else if (productId) {
      targetIndex = order.items.findIndex(
        (it) => String(it.productId) === String(productId) && it.status !== 'Cancelled'
      );
    }

    if (targetIndex !== -1) {
      // Cancel ONLY this specific item
      const targetItem = order.items[targetIndex];
      targetItem.status = 'Cancelled';
      targetItem.cancellationReason = reason || 'Cancelled by customer';
      targetItem.cancellationComment = comment || null;
      targetItem.cancelledAt = now;

      // Check whether ALL items in this order are now cancelled
      const allCancelled = order.items.every((it) => it.status === 'Cancelled');
      if (allCancelled) {
        order.orderStatus = 'Cancelled';
        order.cancellationReason = reason || 'All items cancelled';
        order.cancellationComment = comment || null;
        order.cancelledAt = now;
      }

      const itemNote = `Item cancelled: "${targetItem.title}" (${reason || 'Customer request'}${comment ? ` - ${comment}` : ''})`;
      order.notes = order.notes ? `${order.notes} | ${itemNote}` : itemNote;
      order.updatedAt = now;
    } else {
      // Full order cancel
      order.orderStatus = 'Cancelled';
      order.updatedAt = now;
      order.cancelledAt = now;
      if (reason) order.cancellationReason = reason;
      if (comment) order.cancellationComment = comment;

      order.items = order.items.map((it) => ({
        ...it,
        status: 'Cancelled',
        cancellationReason: it.cancellationReason || reason || 'Order cancelled by customer',
        cancellationComment: it.cancellationComment || comment || null,
        cancelledAt: it.cancelledAt || now,
      }));

      const formattedNote = reason
        ? `Cancelled: ${reason}${comment ? ` - ${comment}` : ''}`
        : (order.notes || 'Order cancelled by customer');
      order.notes = formattedNote;
    }

    // Attempt to cancel shipment with Delhivery if waybill was already generated
    if (order.delhiveryWaybill && order.orderStatus === 'Cancelled') {
      try {
        await delhiveryService.cancelShipment(order.delhiveryWaybill);
        order.delhiveryStatus = 'Cancelled';
      } catch (dErr: any) {
        console.warn('[cancelMyOrder] Auto-cancel Delhivery waybill notice:', dErr?.message);
      }
    }

    if (supabase) {
      const updatePayload: any = {
        items: order.items,
        order_status: order.orderStatus,
        updated_at: now,
        notes: order.notes,
        cancellation_reason: order.cancellationReason || null,
        cancellation_comment: order.cancellationComment || null,
        cancelled_at: order.cancelledAt || null,
        delhivery_status: order.delhiveryStatus || null,
      };

      // 1. Primary update attempting full payload
      let updatedInDb = false;
      if (isValidUuid(order.id)) {
        const { error } = await supabase.from('orders').update(updatePayload).eq('id', order.id);
        if (!error) updatedInDb = true;
      }
      if (order.orderNumber) {
        const { error } = await supabase.from('orders').update(updatePayload).eq('order_number', order.orderNumber);
        if (!error) updatedInDb = true;
      }

      // 2. Fallback update if migration columns (cancellation_reason etc) are missing in legacy DB
      if (!updatedInDb) {
        const fallbackPayload = {
          items: order.items,
          order_status: order.orderStatus,
          updated_at: now,
          notes: order.notes,
        };
        if (isValidUuid(order.id)) {
          await supabase.from('orders').update(fallbackPayload).eq('id', order.id);
        }
        if (order.orderNumber) {
          await supabase.from('orders').update(fallbackPayload).eq('order_number', order.orderNumber);
        }
      }

      // 3. Persist in backup json storage as well
      const backup = await getStoredBackupOrders(supabase);
      const updated = backup.map((o) => (o.id === order!.id || o.orderNumber === order!.orderNumber ? order! : o));
      await persistBackupOrders(supabase, updated);
    }

    return successResponse(res, 'Order cancelled successfully', order);
  } catch (err) {
    return next(err);
  }
};

// 5. Admin Get All Orders (With 10 per page pagination, search, status filter)
export const adminGetAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10); // Standard 10 per page
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'All';

    const supabase = getSupabaseAdmin();
    let allOrders: OrderRecord[] = [];

    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        allOrders = data.map(mapDbRowToOrder);
      } else {
        allOrders = await getStoredBackupOrders(supabase);
      }
    } else {
      allOrders = memoryOrders;
    }

    // Sort newest first
    allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate Status Breakdown Counts across entire dataset
    const statusCounts = {
      total: allOrders.length,
      placed: allOrders.filter((o) => o.orderStatus === 'Placed').length,
      confirmed: allOrders.filter((o) => o.orderStatus === 'Confirmed').length,
      packed: allOrders.filter((o) => o.orderStatus === 'Packed').length,
      shipped: allOrders.filter((o) => o.orderStatus === 'Shipped').length,
      outForDelivery: allOrders.filter((o) => o.orderStatus === 'Out for Delivery').length,
      delivered: allOrders.filter((o) => o.orderStatus === 'Delivered').length,
      cancelled: allOrders.filter((o) => o.orderStatus === 'Cancelled').length,
    };

    // Filter by Status
    let filteredOrders = allOrders;
    if (status && status !== 'All') {
      filteredOrders = filteredOrders.filter(
        (o) => o.orderStatus.toLowerCase() === status.toLowerCase()
      );
    }

    // Filter by Search Query (Order Number, Customer Name, Mobile, Product Title)
    if (search) {
      filteredOrders = filteredOrders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.customerName.toLowerCase().includes(search) ||
          o.customerPhone.includes(search) ||
          o.items.some((it) => it.title.toLowerCase().includes(search))
      );
    }

    // Compute Pagination
    const totalCount = filteredOrders.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + limit);

    return successResponse(res, 'Admin orders fetched successfully', {
      orders: paginatedOrders,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
      statusCounts,
    });
  } catch (err) {
    return next(err);
  }
};

// 6. Admin Update Order Status & Tracking (CRUD)
export const adminUpdateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      orderStatus,
      paymentStatus,
      trackingNumber,
      courierPartner,
      notes,
    } = req.body;

    const validStatuses: EcommerceOrderStatus[] = [
      'Placed',
      'Confirmed',
      'Packed',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
    ];

    if (orderStatus && !validStatuses.includes(orderStatus as EcommerceOrderStatus)) {
      throw new AppError(`Invalid status '${orderStatus}'. Allowed: ${validStatuses.join(', ')}`, 400);
    }

    const supabase = getSupabaseAdmin();
    let targetOrder: OrderRecord | null = null;

    if (supabase) {
      let query = supabase.from('orders').select('*');
      if (isValidUuid(id)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('order_number', id);
      }
      const { data } = await query.maybeSingle();
      if (data) targetOrder = mapDbRowToOrder(data);
    }
    if (!targetOrder) {
      const backup = await getStoredBackupOrders(supabase);
      targetOrder = backup.find((o) => o.id === id || o.orderNumber === id) || null;
    }

    if (!targetOrder) {
      throw new AppError('Order not found', 404);
    }

    // Update fields
    const nowIso = new Date().toISOString();
    if (orderStatus) targetOrder.orderStatus = orderStatus as EcommerceOrderStatus;
    if (paymentStatus) targetOrder.paymentStatus = paymentStatus as EcommercePaymentStatus;
    if (trackingNumber !== undefined) targetOrder.trackingNumber = trackingNumber;
    if (courierPartner !== undefined) targetOrder.courierPartner = courierPartner;
    if (notes !== undefined) targetOrder.notes = notes;
    targetOrder.updatedAt = nowIso;

    // Persist to Supabase
    if (supabase) {
      let upd = supabase
        .from('orders')
        .update({
          order_status: targetOrder.orderStatus,
          payment_status: targetOrder.paymentStatus,
          tracking_number: targetOrder.trackingNumber,
          courier_partner: targetOrder.courierPartner,
          notes: targetOrder.notes,
          updated_at: nowIso,
        });
      if (isValidUuid(targetOrder.id)) {
        upd = upd.eq('id', targetOrder.id);
      } else {
        upd = upd.eq('order_number', targetOrder.orderNumber);
      }
      await upd;

      const backup = await getStoredBackupOrders(supabase);
      const updated = backup.map((o) => (o.id === targetOrder!.id || o.orderNumber === targetOrder!.orderNumber ? targetOrder! : o));
      await persistBackupOrders(supabase, updated);
    }

    return successResponse(res, `Order updated to '${targetOrder.orderStatus}' successfully`, targetOrder);
  } catch (err) {
    return next(err);
  }
};

// 7. Admin Delete Order (CRUD)
export const adminDeleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    if (supabase) {
      let del = supabase.from('orders').delete();
      if (isValidUuid(id)) {
        del = del.eq('id', id);
      } else {
        del = del.eq('order_number', id);
      }
      await del;
      const backup = await getStoredBackupOrders(supabase);
      const remaining = backup.filter((o) => o.id !== id && o.orderNumber !== id);
      await persistBackupOrders(supabase, remaining);
    } else {
      memoryOrders = memoryOrders.filter((o) => o.id !== id && o.orderNumber !== id);
    }

    return successResponse(res, 'Order removed successfully', { id });
  } catch (err) {
    return next(err);
  }
};

// 8. Public / Customer: Check Delivery by Pincode (Delhivery B2C Serviceability)
export const checkDeliveryPincode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pincode } = req.query;
    if (!pincode || typeof pincode !== 'string') {
      throw new AppError('Please provide a 6-digit PIN code', 400);
    }
    const result = await delhiveryService.checkPincode(pincode);
    return successResponse(res, result.message, result);
  } catch (err) {
    return next(err);
  }
};

// 9. Admin: Create / Manifest Delhivery B2C Shipment for an Order
export const adminCreateDelhiveryShipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { weightGrams, pickupWarehouse } = req.body;
    const supabase = getSupabaseAdmin();

    let order: OrderRecord | null = null;
    if (supabase) {
      let query = supabase.from('orders').select('*');
      if (isValidUuid(id)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('order_number', id);
      }
      const { data } = await query.maybeSingle();
      if (data) order = mapDbRowToOrder(data);
    }
    if (!order) {
      const backup = await getStoredBackupOrders(supabase);
      order = backup.find((o) => o.id === id || o.orderNumber === id) || null;
    }
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const shipmentResult = await delhiveryService.createB2CShipment(order, {
      weightGrams: Number(weightGrams) || undefined,
      pickupWarehouse: pickupWarehouse || undefined,
    });

    const nowIso = new Date().toISOString();
    order.delhiveryWaybill = shipmentResult.waybill;
    order.trackingNumber = shipmentResult.waybill;
    order.courierPartner = shipmentResult.courierPartner;
    order.delhiveryStatus = shipmentResult.status;
    order.delhiveryStatusCode = shipmentResult.statusCode;
    order.delhiveryScans = shipmentResult.scans;
    order.delhiveryLabelUrl = shipmentResult.labelUrl;
    order.estimatedDeliveryDate = shipmentResult.estimatedDeliveryDate;
    order.pickupLocation = shipmentResult.pickupLocation;
    if (order.orderStatus === 'Placed' || order.orderStatus === 'Confirmed') {
      order.orderStatus = 'Packed';
    }
    order.updatedAt = nowIso;

    // Persist to DB and backup
    if (supabase) {
      await supabase
        .from('orders')
        .update({
          delhivery_waybill: order.delhiveryWaybill,
          tracking_number: order.trackingNumber,
          courier_partner: order.courierPartner,
          delhivery_status: order.delhiveryStatus,
          delhivery_status_code: order.delhiveryStatusCode,
          delhivery_scans: order.delhiveryScans,
          delhivery_label_url: order.delhiveryLabelUrl,
          estimated_delivery_date: order.estimatedDeliveryDate,
          pickup_location: order.pickupLocation,
          order_status: order.orderStatus,
          updated_at: nowIso,
        })
        .eq('id', id);

      const backup = await getStoredBackupOrders(supabase);
      const updated = backup.map((o) => (o.id === id ? order! : o));
      await persistBackupOrders(supabase, updated);
    }

    return successResponse(res, `Delhivery shipment manifested! AWB #${order.delhiveryWaybill}`, {
      order,
      shipment: shipmentResult,
    });
  } catch (err) {
    return next(err);
  }
};

// 10. Admin / Customer: Track Delhivery Shipment
export const getDelhiveryTracking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { waybill } = req.params;
    const { orderNumber } = req.query;
    const tracking = await delhiveryService.trackShipment(waybill, orderNumber as string | undefined);
    return successResponse(res, 'Tracking details retrieved', tracking);
  } catch (err) {
    return next(err);
  }
};

// 11. Admin: Cancel Delhivery Shipment
export const adminCancelDelhiveryShipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    let order: OrderRecord | null = null;
    if (supabase) {
      let query = supabase.from('orders').select('*');
      if (isValidUuid(id)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('order_number', id);
      }
      const { data } = await query.maybeSingle();
      if (data) order = mapDbRowToOrder(data);
    }
    if (!order) {
      const backup = await getStoredBackupOrders(supabase);
      order = backup.find((o) => o.id === id || o.orderNumber === id) || null;
    }
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const waybill = order.delhiveryWaybill || order.trackingNumber;
    let cancelResult = { success: true, message: 'No shipment to cancel' };
    if (waybill) {
      cancelResult = await delhiveryService.cancelShipment(waybill);
    }

    const nowIso = new Date().toISOString();
    order.orderStatus = 'Cancelled';
    order.delhiveryStatus = 'Cancelled';
    order.updatedAt = nowIso;

    if (supabase) {
      let upd = supabase
        .from('orders')
        .update({
          order_status: 'Cancelled',
          delhivery_status: 'Cancelled',
          updated_at: nowIso,
        });
      if (isValidUuid(order.id)) {
        upd = upd.eq('id', order.id);
      } else {
        upd = upd.eq('order_number', order.orderNumber);
      }
      await upd;

      const backup = await getStoredBackupOrders(supabase);
      const updated = backup.map((o) => (o.id === order!.id || o.orderNumber === order!.orderNumber ? order! : o));
      await persistBackupOrders(supabase, updated);
    }

    return successResponse(res, cancelResult.message || 'Shipment cancelled', { order, cancelResult });
  } catch (err) {
    return next(err);
  }
};

// 12. Admin: Get Printable Shipping Label / Packing Slip
export const adminGetShippingLabel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    let order: OrderRecord | null = null;
    if (supabase) {
      let query = supabase.from('orders').select('*');
      if (isValidUuid(id)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('order_number', id);
      }
      const { data } = await query.maybeSingle();
      if (data) order = mapDbRowToOrder(data);
    }
    if (!order) {
      const backup = await getStoredBackupOrders(supabase);
      order = backup.find((o) => o.id === id || o.orderNumber === id) || null;
    }
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const waybill = order.delhiveryWaybill || order.trackingNumber;
    if (!waybill) {
      throw new AppError('No waybill generated yet for this order. Please manifest shipment first.', 400);
    }

    const labelUrl = delhiveryService.getShippingLabelUrl(waybill);
    return successResponse(res, 'Shipping label generated', {
      waybill,
      orderNumber: order.orderNumber,
      labelUrl,
      order,
    });
  } catch (err) {
    return next(err);
  }
};

// 13. Customer: Mark Order as Paid (Pre-payment)
export const markOrderAsPaid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { paymentDetails } = req.body || {};
    const supabase = getSupabaseAdmin();
    let order: OrderRecord | null = null;
    if (supabase) {
      let query = supabase.from('orders').select('*');
      if (isValidUuid(id)) query = query.eq('id', id);
      else query = query.eq('order_number', id);
      const { data } = await query.maybeSingle();
      if (data) order = mapDbRowToOrder(data);
    }
    if (!order) {
      const backup = await getStoredBackupOrders(supabase);
      order = backup.find((o) => o.id === id || o.orderNumber === id) || null;
    }
    if (!order) throw new AppError('Order not found', 404);

    const nowIso = new Date().toISOString();
    order.paymentStatus = 'Paid';
    order.paymentMethod = 'UPI (Prepaid)';
    order.paymentDetails = paymentDetails || { method: 'UPI', paidAt: nowIso };
    order.updatedAt = nowIso;

    if (supabase) {
      let upd = supabase.from('orders').update({
        payment_status: 'Paid',
        payment_method: order.paymentMethod,
        payment_details: order.paymentDetails,
        updated_at: nowIso,
      });
      if (isValidUuid(order.id)) upd = upd.eq('id', order.id);
      else upd = upd.eq('order_number', order.orderNumber);
      await upd;

      const backup = await getStoredBackupOrders(supabase);
      const updated = backup.map((o) => (o.id === order!.id || o.orderNumber === order!.orderNumber ? order! : o));
      await persistBackupOrders(supabase, updated);
    }

    return successResponse(res, 'Payment updated successfully! Your order is now prepaid.', order);
  } catch (err) {
    return next(err);
  }
};


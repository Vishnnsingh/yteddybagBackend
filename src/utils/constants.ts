export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  CANCELLED: 'cancelled',
});

export const USER_ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ECOMMERCE_ADMIN: 'ecommerce_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  KITCHEN: 'kitchen',
  CUSTOMER: 'customer',
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

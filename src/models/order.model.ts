export type EcommerceOrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type EcommercePaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface OrderItemProduct {
  productId: string;
  title: string;
  primaryImage?: string;
  price: number;
  mrp?: number;
  quantity: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
  status?: EcommerceOrderStatus;
  cancellationReason?: string | null;
  cancellationComment?: string | null;
  cancelledAt?: string | null;
}

export interface ShippingAddressSnapshot {
  name: string;
  mobile: string;
  address: string;
  locality?: string;
  city: string;
  state: string;
  pincode: string;
  type?: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  shippingAddress: ShippingAddressSnapshot;
  paymentMethod: string;
  paymentStatus: EcommercePaymentStatus;
  paymentDetails?: any;
  orderStatus: EcommerceOrderStatus;
  totalMrp: number;
  discountAmount: number;
  couponCode?: string | null;
  couponDiscount: number;
  shippingFee: number;
  platformFee: number;
  totalAmount: number;
  items: OrderItemProduct[];
  trackingNumber?: string | null;
  courierPartner?: string | null;
  notes?: string | null;
  // Delhivery Logistics fields
  delhiveryWaybill?: string | null;
  delhiveryStatus?: string | null;
  delhiveryStatusCode?: string | null;
  delhiveryScans?: Array<{
    dateTime: string;
    status: string;
    location: string;
    instructions?: string;
  }>;
  delhiveryLabelUrl?: string | null;
  estimatedDeliveryDate?: string | null;
  pickupLocation?: string | null;
  cancellationReason?: string | null;
  cancellationComment?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Order = OrderRecord;
export type OrderItem = OrderItemProduct;

export const OrderModel = {
  table: 'orders',
} as const;

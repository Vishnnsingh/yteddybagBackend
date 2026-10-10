import type { PaymentStatus } from '../utils/constants';

export interface Payment {
  id: string;
  orderId: string;
  ecommerceId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export const PaymentModel = {
  table: 'payments',
} as const;

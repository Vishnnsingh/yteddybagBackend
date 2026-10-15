import { ProductItem } from './product.model';

export interface CartItemRecord {
  id: string;
  userId?: string | null;
  guestId?: string | null;
  productId: string;
  selectedColor?: string | null;
  selectedSize?: string | null;
  quantity: number;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PopulatedCartItem {
  id: string;
  productId: string;
  product: ProductItem;
  selectedColor: string | null;
  selectedSize: string | null;
  quantity: number;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
}

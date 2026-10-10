export interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
  alt?: string;
  color_name?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
  image_url?: string;
}

export interface ProductSpecificationItem {
  key: string;
  value: string;
}

export interface ProductItem {
  id: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  sku?: string | null;
  price: number;
  mrp: number;
  discount_percent: number;
  rating: number;
  reviews_count: number;
  badge_text?: string | null;
  badge_style?: string | null;
  badge_color?: string | null;
  images: ProductImage[];
  primary_image: string;
  colors: ProductColor[];
  sizes: string[];
  target_header_id?: string | null;
  target_dropdown_id?: string | null;
  header_title?: string | null;
  header_path?: string | null;
  dropdown_title?: string | null;
  dropdown_path?: string | null;
  why_love_it: string[];
  specifications: ProductSpecificationItem[];
  description: string;
  stock_quantity: number;
  in_stock: boolean;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

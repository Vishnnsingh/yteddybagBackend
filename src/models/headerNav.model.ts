export interface HeaderDropdownItem {
  id: string;
  header_item_id: string;
  title: string;
  sub_heading?: string | null;
  layout?: 'column' | 'row' | null;
  image_url?: string | null;
  path: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeaderItem {
  id: string;
  title: string;
  path: string;
  order_index: number;
  is_active: boolean;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  dropdown_items?: HeaderDropdownItem[];
}

export interface SavedBannerImageItem {
  url: string;
  name: string;
  is_default?: boolean;
}

export interface LoginBannerConfig {
  id?: string;
  is_active: boolean;
  image_url: string;
  heading: string;
  subheading: string;
  coupon_code: string;
  badge_text: string;
  terms_text: string;
  bg_color: string;
  saved_images?: (string | SavedBannerImageItem)[];
  updated_at: string;
}

export interface DoodleItem {
  id: string;
  url: string;
  name: string;
  created_at: string;
  isActive?: boolean;
}

export interface DeviceBgConfig {
  bg_type: 'default' | 'color' | 'gradient' | 'custom';
  bg_color: string;
  gradient_to: string;
  use_gradient: boolean;
  pattern_size: number;
  pattern_opacity: number;
  pattern_gap: number;
  apply_to_login?: boolean;
  doodles: DoodleItem[];
}

export interface BgThemeConfig {
  desktop: DeviceBgConfig;
  mobile: DeviceBgConfig;
  apply_to_login?: boolean;
  updated_at: string;
}

export const HeaderNavModel = {
  headerItemsTable: 'header_items',
  dropdownItemsTable: 'header_dropdown_items',
  siteSettingsTable: 'site_settings',
} as const;

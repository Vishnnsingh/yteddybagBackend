-- ====================================================================
-- Products Setup Migration for YTeddybags
-- Run this in Supabase SQL Editor
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500) DEFAULT NULL,
    slug VARCHAR(350) UNIQUE NOT NULL,
    sku VARCHAR(100) DEFAULT NULL,
    price NUMERIC(10,2) NOT NULL,
    mrp NUMERIC(10,2) NOT NULL,
    discount_percent INT DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 4.8,
    reviews_count INT DEFAULT 0,
    badge_text VARCHAR(100) DEFAULT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    primary_image TEXT DEFAULT '',
    colors JSONB DEFAULT '[]'::jsonb,
    sizes JSONB DEFAULT '[]'::jsonb,
    target_header_id VARCHAR(100) DEFAULT NULL,
    target_dropdown_id VARCHAR(100) DEFAULT NULL,
    why_love_it JSONB DEFAULT '[]'::jsonb,
    specifications JSONB DEFAULT '[]'::jsonb,
    description TEXT DEFAULT '',
    stock_quantity INT DEFAULT 50,
    in_stock BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS products_slug_idx ON public.products (slug);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products (is_active);
CREATE INDEX IF NOT EXISTS products_target_header_idx ON public.products (target_header_id);
CREATE INDEX IF NOT EXISTS products_target_dropdown_idx ON public.products (target_dropdown_id);
CREATE INDEX IF NOT EXISTS products_order_index_idx ON public.products (order_index);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON public.products (created_at DESC);

-- Enable Row Level Security (RLS) & Grant Access
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins have full access to products" ON public.products;
CREATE POLICY "Admins have full access to products" ON public.products
    FOR ALL USING (true);

-- Permissions
GRANT ALL PRIVILEGES ON public.products TO postgres, anon, authenticated, service_role;

-- If table was previously created with delivery_info column, safely drop it:
ALTER TABLE public.products DROP COLUMN IF EXISTS delivery_info;

-- Ensure categories metadata & price/discount indexes exist for filtering
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS header_title VARCHAR(255) DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dropdown_title VARCHAR(255) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS products_price_idx ON public.products (price);
CREATE INDEX IF NOT EXISTS products_discount_idx ON public.products (discount_percent);

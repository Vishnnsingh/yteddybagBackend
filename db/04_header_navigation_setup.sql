-- ====================================================================
-- Header Navigation and Dropdown Setup for YTeddybags
-- ====================================================================

-- 1. Create 'header_items' table (Top level navigation items next to logo)
CREATE TABLE IF NOT EXISTS public.header_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    path VARCHAR(255) DEFAULT '/',
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Create 'header_dropdown_items' table (Sub-items for each header item)
CREATE TABLE IF NOT EXISTS public.header_dropdown_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    header_item_id UUID NOT NULL REFERENCES public.header_items(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    sub_heading VARCHAR(255) DEFAULT NULL,
    layout VARCHAR(20) DEFAULT 'column',
    path VARCHAR(255) DEFAULT '/',
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Migration for existing installations
ALTER TABLE public.header_items ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;
ALTER TABLE public.header_dropdown_items ADD COLUMN IF NOT EXISTS sub_heading VARCHAR(255) DEFAULT NULL;
ALTER TABLE public.header_dropdown_items ADD COLUMN IF NOT EXISTS layout VARCHAR(20) DEFAULT 'column';
ALTER TABLE public.header_dropdown_items ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- 3. High Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS header_items_order_idx ON public.header_items (order_index);
CREATE INDEX IF NOT EXISTS header_items_is_active_idx ON public.header_items (is_active);

CREATE INDEX IF NOT EXISTS header_dropdown_header_id_idx ON public.header_dropdown_items (header_item_id);
CREATE INDEX IF NOT EXISTS header_dropdown_order_idx ON public.header_dropdown_items (order_index);
CREATE INDEX IF NOT EXISTS header_dropdown_is_active_idx ON public.header_dropdown_items (is_active);

-- 4. Grant Permissions to all roles
GRANT ALL PRIVILEGES ON public.header_items TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON public.header_dropdown_items TO postgres, anon, authenticated, service_role;

-- 5. Seed Initial Popular E-commerce Categories (Optional Starter Data)
INSERT INTO public.header_items (id, title, path, order_index, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Teddy Bags', '/category/teddy-bags', 1, true),
    ('22222222-2222-2222-2222-222222222222', 'School Bags', '/category/school-bags', 2, true),
    ('33333333-3333-3333-3333-333333333333', 'Soft Toys', '/category/soft-toys', 3, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.header_dropdown_items (header_item_id, title, path, order_index, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Plush Teddy Backpacks', '/category/plush-backpacks', 1, true),
    ('11111111-1111-1111-1111-111111111111', 'Mini Teddy Slings', '/category/mini-slings', 2, true),
    ('22222222-2222-2222-2222-222222222222', 'Kindergarten Bags', '/category/kindergarten', 1, true),
    ('22222222-2222-2222-2222-222222222222', 'Primary School Bags', '/category/primary-school', 2, true),
    ('33333333-3333-3333-3333-333333333333', 'Giant Teddy Bears', '/category/giant-teddies', 1, true),
    ('33333333-3333-3333-3333-333333333333', 'Musical Plush Toys', '/category/musical-toys', 2, true)
ON CONFLICT DO NOTHING;

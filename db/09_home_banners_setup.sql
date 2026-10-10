-- ====================================================================
-- Home Hero Banners Setup for YTeddybags
-- ====================================================================

-- 1. Create 'home_banners' table
CREATE TABLE IF NOT EXISTS public.home_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) DEFAULT '',
    subtitle VARCHAR(255) DEFAULT '',
    button_text VARCHAR(100) DEFAULT 'SHOP NOW',
    media_type VARCHAR(20) DEFAULT 'image', -- 'image' | 'video'
    media_url TEXT NOT NULL,
    link_url TEXT DEFAULT '/',
    link_type VARCHAR(50) DEFAULT 'custom', -- 'header' | 'dropdown' | 'custom'
    target_header_id UUID DEFAULT NULL,
    target_dropdown_id UUID DEFAULT NULL,
    show_overlay BOOLEAN DEFAULT true,
    overlay_position VARCHAR(20) DEFAULT 'center', -- 'left' | 'center' | 'right'
    title_color VARCHAR(50) DEFAULT '#FFFFFF',
    subtitle_color VARCHAR(50) DEFAULT '#F3F4F6',
    button_bg_color VARCHAR(50) DEFAULT '#8B2500',
    button_text_color VARCHAR(50) DEFAULT '#FFFFFF',
    font_family VARCHAR(100) DEFAULT 'Inter',
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Migration support
ALTER TABLE public.home_banners ADD COLUMN IF NOT EXISTS title_color VARCHAR(50) DEFAULT '#FFFFFF';
ALTER TABLE public.home_banners ADD COLUMN IF NOT EXISTS subtitle_color VARCHAR(50) DEFAULT '#F3F4F6';
ALTER TABLE public.home_banners ADD COLUMN IF NOT EXISTS button_bg_color VARCHAR(50) DEFAULT '#8B2500';
ALTER TABLE public.home_banners ADD COLUMN IF NOT EXISTS button_text_color VARCHAR(50) DEFAULT '#FFFFFF';
ALTER TABLE public.home_banners ADD COLUMN IF NOT EXISTS font_family VARCHAR(100) DEFAULT 'Inter';

-- 2. Indexes
CREATE INDEX IF NOT EXISTS home_banners_order_idx ON public.home_banners (order_index);
CREATE INDEX IF NOT EXISTS home_banners_is_active_idx ON public.home_banners (is_active);

-- 3. Permissions
GRANT ALL PRIVILEGES ON public.home_banners TO postgres, anon, authenticated, service_role;

-- 4. Initial Seed Banners (High Quality Starter Banners)
INSERT INTO public.home_banners (
    id, title, subtitle, button_text, media_type, media_url, link_url, link_type, show_overlay, overlay_position, order_index, is_active
)
VALUES 
    (
        '10000000-0000-0000-0000-000000000001',
        'Your work-to-wherever satchel.',
        'Handcrafted luxury backpacks & bags for your everyday journey.',
        'SHOP NOW',
        'image',
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1920&auto=format&fit=crop',
        '/category/teddy-bags',
        'header',
        true,
        'right',
        1,
        true
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'Playful Companions, Every Day.',
        'Discover our signature plush teddy backpacks crafted for young adventurers.',
        'EXPLORE COLLECTION',
        'image',
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1920&auto=format&fit=crop',
        '/category/plush-backpacks',
        'dropdown',
        true,
        'left',
        2,
        true
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'Ready For School & Beyond',
        'Ergonomic, lightweight & ultra-durable school bags designed for kids.',
        'SHOP SCHOOL BAGS',
        'image',
        'https://images.unsplash.com/photo-1577733966973-d680bffd2e80?q=80&w=1920&auto=format&fit=crop',
        '/category/school-bags',
        'header',
        true,
        'center',
        3,
        true
    )
ON CONFLICT (id) DO NOTHING;

-- 5. Banner Settings Table (Stores active theme & layout preferences)
CREATE TABLE IF NOT EXISTS public.home_banner_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

GRANT ALL PRIVILEGES ON public.home_banner_settings TO postgres, anon, authenticated, service_role;

INSERT INTO public.home_banner_settings (key, value)
VALUES 
    ('banner_theme', '{"theme": "peek-carousel"}'::jsonb),
    ('sub_banner_settings', '{"is_enabled": true, "default_hover_bg": "#F3F4F6"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 6. Home Sub-Banners Table (Quick Category Strips below Banner)
CREATE TABLE IF NOT EXISTS public.home_sub_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT DEFAULT '/',
    link_type VARCHAR(50) DEFAULT 'header', -- 'header' | 'dropdown' | 'custom'
    target_header_id UUID DEFAULT NULL,
    target_dropdown_id UUID DEFAULT NULL,
    hover_bg_color VARCHAR(50) DEFAULT '#F3F4F6',
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS home_sub_banners_order_idx ON public.home_sub_banners (order_index);
CREATE INDEX IF NOT EXISTS home_sub_banners_is_active_idx ON public.home_sub_banners (is_active);

GRANT ALL PRIVILEGES ON public.home_sub_banners TO postgres, anon, authenticated, service_role;

-- Starter Seed Items for Quick Category Sub-banner
INSERT INTO public.home_sub_banners (
    id, title, image_url, link_url, link_type, hover_bg_color, order_index, is_active
)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'Same Day', 'https://api.iconify.design/lucide:truck.svg?color=%23D26900', '/category/same-day', 'custom', '#FFF7ED', 1, true),
    ('20000000-0000-0000-0000-000000000002', 'Plush Bags', 'https://api.iconify.design/lucide:backpack.svg?color=%23D26900', '/category/plush-backpacks', 'custom', '#FFF7ED', 2, true),
    ('20000000-0000-0000-0000-000000000003', 'Teddy Toys', 'https://api.iconify.design/lucide:smile.svg?color=%23D26900', '/category/soft-toys', 'custom', '#FFF7ED', 3, true),
    ('20000000-0000-0000-0000-000000000004', 'Personalised', 'https://api.iconify.design/lucide:sparkles.svg?color=%23D26900', '/category/personalised', 'custom', '#FFF7ED', 4, true),
    ('20000000-0000-0000-0000-000000000005', 'School Bags', 'https://api.iconify.design/lucide:briefcase.svg?color=%23D26900', '/category/school-bags', 'custom', '#FFF7ED', 5, true),
    ('20000000-0000-0000-0000-000000000006', 'Gift Hampers', 'https://api.iconify.design/lucide:gift.svg?color=%23D26900', '/category/gift-hampers', 'custom', '#FFF7ED', 6, true),
    ('20000000-0000-0000-0000-000000000007', 'Balloon Decor', 'https://api.iconify.design/lucide:party-popper.svg?color=%23D26900', '/category/balloon-decor', 'custom', '#FFF7ED', 7, true),
    ('20000000-0000-0000-0000-000000000008', 'Trendy Gifts', 'https://api.iconify.design/lucide:flame.svg?color=%23D26900', '/category/trendy-gifts', 'custom', '#FFF7ED', 8, true),
    ('20000000-0000-0000-0000-000000000009', 'LUXE Gifts', 'https://api.iconify.design/lucide:gem.svg?color=%23D26900', '/category/luxe-gifts', 'custom', '#FFF7ED', 9, true),
    ('20000000-0000-0000-0000-000000000010', 'Hatke Edit', 'https://api.iconify.design/lucide:wand-2.svg?color=%23D26900', '/category/hatke', 'custom', '#FFF7ED', 10, true)
ON CONFLICT (id) DO NOTHING;



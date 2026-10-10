-- 11_home_bestsellers_setup.sql
-- Table & default seed for "Shop By Bestsellers" Section below Occasions

CREATE TABLE IF NOT EXISTS public.home_bestsellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) DEFAULT NULL,
    price VARCHAR(50) NOT NULL DEFAULT '₹999',
    original_price VARCHAR(50) DEFAULT NULL,
    discount_badge VARCHAR(50) DEFAULT NULL,
    badge_style VARCHAR(50) DEFAULT 'discount', -- 'discount' | 'luxe' | 'custom'
    image_url TEXT DEFAULT NULL,
    link_type VARCHAR(50) DEFAULT 'header', -- 'header' | 'dropdown'
    target_header_id UUID DEFAULT NULL,
    target_dropdown_id UUID DEFAULT NULL,
    link_url TEXT DEFAULT '/',
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS home_bestsellers_order_idx ON public.home_bestsellers (order_index);
CREATE INDEX IF NOT EXISTS home_bestsellers_is_active_idx ON public.home_bestsellers (is_active);

GRANT ALL PRIVILEGES ON public.home_bestsellers TO postgres, anon, authenticated, service_role;

-- Bestsellers Section Master Settings
INSERT INTO public.home_banner_settings (key, value)
VALUES 
    ('bestsellers_settings', '{
        "is_enabled": true,
        "section_title": "Shop By Bestsellers",
        "section_subtitle": "Discover India''s favourite gifting options, curated bestsellers that make every celebration extra special",
        "view_all_text": "View All Bestsellers",
        "view_all_url": "/category/bestsellers",
        "show_view_all": true,
        "card_theme": "classic-clean",
        "card_bg_mode": "white",
        "card_bg_color": "#FFFFFF",
        "card_transparency": 0
    }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Starter Seed Bestseller Cards matching user reference image
INSERT INTO public.home_bestsellers (
    id, title, price, original_price, discount_badge, badge_style, image_url, link_type, link_url, order_index, is_active
)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        'Pretty in Pink Floral Vase',
        '₹1,649',
        '₹1,849',
        '11% OFF',
        'discount',
        'https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/teddy-bags',
        1,
        true
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        'Radiant Sunflower Symphony',
        '₹1,999',
        '₹2,249',
        '11% OFF',
        'discount',
        'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/personalised',
        2,
        true
    ),
    (
        '40000000-0000-0000-0000-000000000003',
        'Blush Rose Garden',
        '₹949',
        '₹1,099',
        '14% OFF',
        'discount',
        'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/school-bags',
        3,
        true
    ),
    (
        '40000000-0000-0000-0000-000000000004',
        'The Muse',
        '₹3,699',
        NULL,
        'LUXE',
        'luxe',
        'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/plush-backpacks',
        4,
        true
    ),
    (
        '40000000-0000-0000-0000-000000000005',
        'White Orchid Classic Bouquet',
        '₹599',
        NULL,
        NULL,
        'discount',
        'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/trendy-gifts',
        5,
        true
    ),
    (
        '40000000-0000-0000-0000-000000000006',
        'Sweet Heart Hamper Gift Box',
        '₹2,299',
        '₹2,699',
        '15% OFF',
        'discount',
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/gift-hampers',
        6,
        true
    ),
    (
        '40000000-0000-0000-0000-000000000007',
        'Butter Cream Plush Teddy Buddy',
        '₹1,199',
        '₹1,499',
        '20% OFF',
        'discount',
        'https://images.unsplash.com/photo-1559454403-b8fb88521f11?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/teddy-bags',
        7,
        true
    ),
    (
        '40000000-0000-0000-0000-000000000008',
        'Midnight Glow Luxury Lamp',
        '₹4,499',
        '₹5,299',
        'LUXE',
        'luxe',
        'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/luxe-gifts',
        8,
        true
    ),
    (
        '40000000-0000-0000-0000-000000000009',
        'Pastel Dream Celebration Pack',
        '₹1,849',
        '₹2,199',
        '16% OFF',
        'discount',
        'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/balloon-decor',
        9,
        true
    ),
    (
        '40000000-0000-0000-0000-000000000010',
        'Hatke Vintage Traveler Satchel',
        '₹3,299',
        '₹3,899',
        'BESTSELLER',
        'custom',
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop',
        'header',
        '/category/hatke',
        10,
        true
    )
ON CONFLICT (id) DO NOTHING;

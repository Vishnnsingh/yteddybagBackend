-- 12_home_promo_banner_setup.sql
-- Table & default seed for "Joyful Promo Banner" Section directly below Bestsellers

CREATE TABLE IF NOT EXISTS public.home_promo_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) DEFAULT 'Joyful Gifts To',
    subtitle VARCHAR(255) DEFAULT 'Make It Special',
    title_color VARCHAR(50) DEFAULT '#FFFFFF',
    subtitle_color VARCHAR(50) DEFAULT '#111827',
    text_position VARCHAR(50) DEFAULT 'left', -- 'left' | 'center' | 'right' | 'none'
    font_size VARCHAR(50) DEFAULT 'medium', -- 'small' | 'medium' | 'large'
    image_url TEXT NOT NULL,
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS home_promo_banners_order_idx ON public.home_promo_banners (order_index);
CREATE INDEX IF NOT EXISTS home_promo_banners_is_active_idx ON public.home_promo_banners (is_active);

GRANT ALL PRIVILEGES ON public.home_promo_banners TO postgres, anon, authenticated, service_role;

-- Master settings in home_banner_settings
INSERT INTO public.home_banner_settings (key, value)
VALUES 
    ('promo_banner_settings', '{
        "is_enabled": true,
        "autoplay": true,
        "autoplay_interval": 4000,
        "banner_height": "standard",
        "show_dots": true,
        "border_radius": "rounded-2xl"
    }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Starter Seed Promo Banner matching user reference image
INSERT INTO public.home_promo_banners (
    id, title, subtitle, title_color, subtitle_color, text_position, font_size, image_url, order_index, is_active
)
VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        'Joyful Gifts To',
        'Make It Special',
        '#FFFFFF',
        '#111827',
        'left',
        'medium',
        'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1600&auto=format&fit=crop',
        1,
        true
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        'Handcrafted With Love',
        'Celebrate Every Smile',
        '#FFFFFF',
        '#78350F',
        'left',
        'medium',
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1600&auto=format&fit=crop',
        2,
        true
    )
ON CONFLICT (id) DO NOTHING;

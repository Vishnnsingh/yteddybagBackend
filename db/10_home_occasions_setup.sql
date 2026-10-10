-- 10_home_occasions_setup.sql
-- Table & default seed for "Gifts For Every Occasion" Section below Sub-Banner

CREATE TABLE IF NOT EXISTS public.home_occasions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    date_badge VARCHAR(50) DEFAULT NULL,
    image_url TEXT DEFAULT NULL,
    bg_color VARCHAR(50) DEFAULT '#F9D3B4',
    link_type VARCHAR(50) DEFAULT 'header', -- 'header' | 'dropdown'
    target_header_id UUID DEFAULT NULL,
    target_dropdown_id UUID DEFAULT NULL,
    link_url TEXT DEFAULT '/',
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS home_occasions_order_idx ON public.home_occasions (order_index);
CREATE INDEX IF NOT EXISTS home_occasions_is_active_idx ON public.home_occasions (is_active);

GRANT ALL PRIVILEGES ON public.home_occasions TO postgres, anon, authenticated, service_role;

-- Occasion Section Master Settings
INSERT INTO public.home_banner_settings (key, value)
VALUES 
    ('occasions_settings', '{"is_enabled": true, "section_title": "Gifts For Every Occasion"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Starter Seed Occasion Cards matching user reference image
INSERT INTO public.home_occasions (
    id, title, date_badge, image_url, bg_color, link_type, link_url, order_index, is_active
)
VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        'Birthday',
        NULL,
        'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?q=80&w=600&auto=format&fit=crop',
        '#F9D3B4',
        'header',
        '/category/teddy-bags',
        1,
        true
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        'Boyfriend Day',
        '3RD OCT',
        'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop',
        '#FAD2D8',
        'header',
        '/category/personalised',
        2,
        true
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        'Congratulations',
        NULL,
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=600&auto=format&fit=crop',
        '#ADCBE3',
        'header',
        '/category/school-bags',
        3,
        true
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        'Anniversary',
        NULL,
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop',
        '#F8C3CD',
        'header',
        '/category/plush-backpacks',
        4,
        true
    ),
    (
        '30000000-0000-0000-0000-000000000005',
        'Coffee Day',
        NULL,
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop',
        '#F9D3B4',
        'header',
        '/category/trendy-gifts',
        5,
        true
    )
ON CONFLICT (id) DO NOTHING;

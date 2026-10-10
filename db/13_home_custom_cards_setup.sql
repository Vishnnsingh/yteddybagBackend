-- ====================================================================
-- 13_home_custom_cards_setup.sql
-- Highly Customizable Showcase Cards Section with Classic & Modern Borders,
-- Flexible Text Positions, Dynamic Columns, and Header Navigation Linking
-- ====================================================================

-- 1. Create 'home_custom_cards' table
CREATE TABLE IF NOT EXISTS public.home_custom_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) DEFAULT '',
    subtitle VARCHAR(255) DEFAULT '',
    badge_text VARCHAR(100) DEFAULT '',
    button_text VARCHAR(100) DEFAULT '',
    image_url TEXT DEFAULT NULL,
    
    -- Card Layout & Positioning
    text_position VARCHAR(50) DEFAULT 'below', -- 'above' | 'below' | 'inside_clean' | 'inside_bottom' | 'inside_center' | 'inside_top'
    content_align VARCHAR(20) DEFAULT 'center', -- 'left' | 'center' | 'right'
    vertical_align VARCHAR(20) DEFAULT 'center', -- 'top' | 'center' | 'bottom'
    
    -- Card Specific Styling overrides
    bg_color VARCHAR(50) DEFAULT 'transparent',
    card_radius INT DEFAULT 16, -- border radius in px
    
    -- Border Configuration (Image 4 & Image 5 styles)
    border_mode VARCHAR(50) DEFAULT 'classic', -- 'none' | 'modern' | 'classic' | 'custom_image'
    border_same_all BOOLEAN DEFAULT true,
    border_width INT DEFAULT 1,
    border_top_width INT DEFAULT 1,
    border_right_width INT DEFAULT 1,
    border_bottom_width INT DEFAULT 1,
    border_left_width INT DEFAULT 1,
    border_style VARCHAR(30) DEFAULT 'solid', -- 'solid' | 'double' | 'dashed' | 'dotted' | 'inset' | 'outset'
    border_color VARCHAR(50) DEFAULT '#D26900',
    
    -- Classic Border Selection (10+ ornate vintage styles)
    classic_border_style VARCHAR(50) DEFAULT 'victorian-ornate',
    
    -- Custom Border Image (Upload or URL)
    border_image_url TEXT DEFAULT NULL,
    
    -- Text Styling
    title_color VARCHAR(50) DEFAULT '#111827',
    subtitle_color VARCHAR(50) DEFAULT '#4B5563',
    badge_color VARCHAR(50) DEFAULT '#D26900',
    button_color VARCHAR(50) DEFAULT '#D26900',
    font_family VARCHAR(100) DEFAULT 'Inter',
    font_weight VARCHAR(50) DEFAULT 'semibold', -- 'normal' | 'medium' | 'semibold' | 'bold'
    
    -- Navigation Link (strictly website header / subheader dropdown)
    link_type VARCHAR(50) DEFAULT 'header', -- 'header' | 'dropdown'
    target_header_id UUID DEFAULT NULL,
    target_dropdown_id UUID DEFAULT NULL,
    link_url TEXT DEFAULT '/',
    
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Ensure button_color column exists if table was already created
ALTER TABLE public.home_custom_cards ADD COLUMN IF NOT EXISTS button_color VARCHAR(50) DEFAULT '#D26900';

-- Indexes for lightning-fast retrieval
CREATE INDEX IF NOT EXISTS home_custom_cards_order_idx ON public.home_custom_cards (order_index);
CREATE INDEX IF NOT EXISTS home_custom_cards_is_active_idx ON public.home_custom_cards (is_active);

-- Permissions
GRANT ALL PRIVILEGES ON public.home_custom_cards TO postgres, anon, authenticated, service_role;

-- 2. Master Section Settings in 'home_banner_settings'
INSERT INTO public.home_banner_settings (key, value)
VALUES 
    (
        'custom_cards_settings', 
        '{
            "is_enabled": true,
            "section_title": "Gifts for Every Feeling",
            "section_subtitle": "When emotions matter most, send a gift that speaks from the heart.",
            "title_align": "left",
            "title_color": "#111827",
            "subtitle_color": "#6B7280",
            "section_bg_mode": "transparent",
            "section_bg_color": "#FFFFFF",
            "section_gradient": "linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)",
            "cards_per_row": 5,
            "card_aspect_ratio": "tall",
            "global_card_radius": 16,
            "global_border_mode": "classic",
            "global_classic_border": "victorian-ornate",
            "global_border_color": "#D26900",
            "global_border_width": 1,
            "global_text_position": "below",
            "card_padding": 12,
            "card_hover_effect": "none",
            "card_bg_color": "#FFFFFF"
        }'::jsonb
    )
ON CONFLICT (key) DO NOTHING;

-- 3. Initial Seed Showcase Cards (matching user images: Gifts & Products with Classic Frames)
INSERT INTO public.home_custom_cards (
    id, title, subtitle, badge_text, button_text, image_url,
    text_position, content_align, vertical_align, bg_color, card_radius,
    border_mode, border_same_all, border_width, border_style, border_color,
    classic_border_style, title_color, subtitle_color, badge_color, font_family,
    link_type, link_url, order_index, is_active
)
VALUES
    (
        '60000000-0000-0000-0000-000000000001',
        'Watches & Wearables',
        'Timeless elegance for every occasion',
        'UP TO 80% OFF',
        'Shop Now',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop',
        'below', 'center', 'center', '#FFFFFF', 16,
        'classic', true, 1, 'solid', '#D26900',
        'victorian-ornate', '#111827', '#4B5563', '#D26900', 'Inter',
        'header', '/category/teddy-bags', 1, true
    ),
    (
        '60000000-0000-0000-0000-000000000002',
        'Sleepwear & Loungewear',
        'Comfort wrapped in luxurious fabric',
        '30-70% OFF',
        'Shop Now',
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop',
        'below', 'center', 'center', '#FFFFFF', 16,
        'classic', true, 1, 'solid', '#D26900',
        'royal-baroque', '#111827', '#4B5563', '#D26900', 'Inter',
        'header', '/category/personalised', 2, true
    ),
    (
        '60000000-0000-0000-0000-000000000003',
        'Workwear & Formals',
        'Sharp styles crafted for success',
        '40-70% OFF',
        'Shop Now',
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop',
        'below', 'center', 'center', '#FFFFFF', 16,
        'classic', true, 1, 'solid', '#D26900',
        'vintage-filigree', '#111827', '#4B5563', '#D26900', 'Inter',
        'header', '/category/school-bags', 3, true
    ),
    (
        '60000000-0000-0000-0000-000000000004',
        'Eyewear & Sunglasses',
        'Iconic frames with UV protection',
        'UP TO 80% OFF',
        'Shop Now',
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=600&auto=format&fit=crop',
        'below', 'center', 'center', '#FFFFFF', 16,
        'classic', true, 1, 'solid', '#D26900',
        'antique-crest', '#111827', '#4B5563', '#D26900', 'Inter',
        'header', '/category/plush-backpacks', 4, true
    ),
    (
        '60000000-0000-0000-0000-000000000005',
        'Casual Styles',
        'Effortless daily trends & comfort',
        '40-80% OFF',
        'Shop Now',
        'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop',
        'below', 'center', 'center', '#FFFFFF', 16,
        'classic', true, 1, 'solid', '#D26900',
        'greek-key', '#111827', '#4B5563', '#D26900', 'Inter',
        'header', '/category/trendy-gifts', 5, true
    )
ON CONFLICT (id) DO NOTHING;

-- Add button_color column if not exists
ALTER TABLE public.home_custom_cards ADD COLUMN IF NOT EXISTS button_color VARCHAR(50) DEFAULT '#D26900';

-- Add in-card space (card_padding) and inside-border image padding (image_padding)
ALTER TABLE public.home_custom_cards ADD COLUMN IF NOT EXISTS card_padding INT DEFAULT NULL;
ALTER TABLE public.home_custom_cards ADD COLUMN IF NOT EXISTS image_padding INT DEFAULT NULL;

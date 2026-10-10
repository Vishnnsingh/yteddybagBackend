-- ====================================================================
-- Home Sections Dynamic Layout & Spacing Setup for YTeddybags
-- Allows arranging sections in any order, duplicating any section,
-- and setting in-section padding & outer-section margin in rem units.
-- ====================================================================

-- 1. Create table for persistent section layout blocks (or alter to NUMERIC if already exists)
CREATE TABLE IF NOT EXISTS public.home_sections_layout (
    id VARCHAR(100) PRIMARY KEY,
    section_type VARCHAR(50) NOT NULL, -- 'hero_banner' | 'sub_banner' | 'occasions' | 'bestsellers' | 'custom_cards' | 'promo_banner'
    custom_label VARCHAR(150) DEFAULT '',
    is_enabled BOOLEAN DEFAULT true,
    order_index INT DEFAULT 0,
    padding_top NUMERIC(6,2) DEFAULT 1.0,
    padding_bottom NUMERIC(6,2) DEFAULT 1.5,
    margin_top NUMERIC(6,2) DEFAULT 0.0,
    margin_bottom NUMERIC(6,2) DEFAULT 0.0,
    bg_color VARCHAR(50) DEFAULT 'transparent',
    theme VARCHAR(100),
    section_title VARCHAR(255),
    section_subtitle VARCHAR(500),
    card_theme VARCHAR(100),
    cards_per_row VARCHAR(50),
    border_mode VARCHAR(50),
    classic_border_style VARCHAR(100),
    card_aspect_ratio VARCHAR(50),
    text_position VARCHAR(50),
    section_bg_mode VARCHAR(50),
    section_bg_color VARCHAR(100),
    banner_height VARCHAR(50),
    border_radius VARCHAR(50),
    settings JSONB DEFAULT '{}'::jsonb,
    items JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Alter columns if table was created previously with integer types or missing override columns
ALTER TABLE public.home_sections_layout ALTER COLUMN padding_top TYPE NUMERIC(6,2);
ALTER TABLE public.home_sections_layout ALTER COLUMN padding_bottom TYPE NUMERIC(6,2);
ALTER TABLE public.home_sections_layout ALTER COLUMN margin_top TYPE NUMERIC(6,2);
ALTER TABLE public.home_sections_layout ALTER COLUMN margin_bottom TYPE NUMERIC(6,2);

-- Independent Section Overrides (ensures duplicated sections save separate settings)
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS theme VARCHAR(100);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS section_title VARCHAR(255);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS section_subtitle VARCHAR(500);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS card_theme VARCHAR(100);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS cards_per_row VARCHAR(50);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS border_mode VARCHAR(50);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS classic_border_style VARCHAR(100);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS card_aspect_ratio VARCHAR(50);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS text_position VARCHAR(50);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS section_bg_mode VARCHAR(50);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS section_bg_color VARCHAR(100);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS banner_height VARCHAR(50);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS border_radius VARCHAR(50);
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.home_sections_layout ADD COLUMN IF NOT EXISTS items JSONB DEFAULT NULL;

-- If default 6 sections have empty items array '[]'::jsonb, convert to NULL so they fall back to section's main tables
UPDATE public.home_sections_layout 
SET items = NULL 
WHERE id IN ('hero_banner_1', 'sub_banner_1', 'occasions_1', 'bestsellers_1', 'custom_cards_1', 'promo_banner_1') 
  AND items = '[]'::jsonb;

CREATE INDEX IF NOT EXISTS home_sections_layout_order_idx ON public.home_sections_layout (order_index);
CREATE INDEX IF NOT EXISTS home_sections_layout_is_enabled_idx ON public.home_sections_layout (is_enabled);

GRANT ALL PRIVILEGES ON public.home_sections_layout TO postgres, anon, authenticated, service_role;

-- 2. Seed Default 6 Sections Layout in REM
INSERT INTO public.home_sections_layout (
    id, section_type, custom_label, is_enabled, order_index, padding_top, padding_bottom, margin_top, margin_bottom, bg_color
)
VALUES
    ('hero_banner_1', 'hero_banner', 'Hero Banner Carousel', true, 1, 0.0, 0.0, 0.0, 0.0, 'transparent'),
    ('sub_banner_1', 'sub_banner', 'Quick Categories (Sub-Banner)', true, 2, 0.5, 0.75, 0.0, 0.0, 'transparent'),
    ('occasions_1', 'occasions', 'Gifts For Every Occasion', true, 3, 1.5, 2.0, 0.0, 0.0, 'transparent'),
    ('bestsellers_1', 'bestsellers', 'Shop By Bestsellers', true, 4, 2.0, 2.5, 0.0, 0.0, 'transparent'),
    ('custom_cards_1', 'custom_cards', 'Showcase Cards (Gifts for Every Feeling)', true, 5, 2.0, 2.5, 0.0, 0.0, 'transparent'),
    ('promo_banner_1', 'promo_banner', 'Special Promo Strip Banner', true, 6, 1.5, 2.0, 0.0, 0.0, 'transparent')
ON CONFLICT (id) DO UPDATE SET
    padding_top = EXCLUDED.padding_top,
    padding_bottom = EXCLUDED.padding_bottom,
    margin_top = EXCLUDED.margin_top,
    margin_bottom = EXCLUDED.margin_bottom;

-- 3. Also register default in home_banner_settings
INSERT INTO public.home_banner_settings (key, value)
VALUES
    (
        'home_sections_layout',
        '[
            {"id": "hero_banner_1", "section_type": "hero_banner", "custom_label": "Hero Banner Carousel", "is_enabled": true, "order_index": 1, "padding_top": 0.0, "padding_bottom": 0.0, "margin_top": 0.0, "margin_bottom": 0.0, "bg_color": "transparent"},
            {"id": "sub_banner_1", "section_type": "sub_banner", "custom_label": "Quick Categories (Sub-Banner)", "is_enabled": true, "order_index": 2, "padding_top": 0.5, "padding_bottom": 0.75, "margin_top": 0.0, "margin_bottom": 0.0, "bg_color": "transparent"},
            {"id": "occasions_1", "section_type": "occasions", "custom_label": "Gifts For Every Occasion", "is_enabled": true, "order_index": 3, "padding_top": 1.5, "padding_bottom": 2.0, "margin_top": 0.0, "margin_bottom": 0.0, "bg_color": "transparent"},
            {"id": "bestsellers_1", "section_type": "bestsellers", "custom_label": "Shop By Bestsellers", "is_enabled": true, "order_index": 4, "padding_top": 2.0, "padding_bottom": 2.5, "margin_top": 0.0, "margin_bottom": 0.0, "bg_color": "transparent"},
            {"id": "custom_cards_1", "section_type": "custom_cards", "custom_label": "Showcase Cards (Gifts for Every Feeling)", "is_enabled": true, "order_index": 5, "padding_top": 2.0, "padding_bottom": 2.5, "margin_top": 0.0, "margin_bottom": 0.0, "bg_color": "transparent"},
            {"id": "promo_banner_1", "section_type": "promo_banner", "custom_label": "Special Promo Strip Banner", "is_enabled": true, "order_index": 6, "padding_top": 1.5, "padding_bottom": 2.0, "margin_top": 0.0, "margin_bottom": 0.0, "bg_color": "transparent"}
        ]'::jsonb
    )
ON CONFLICT (key) DO NOTHING;

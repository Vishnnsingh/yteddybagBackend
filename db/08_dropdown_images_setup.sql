-- ====================================================================
-- Migration: Add image_url to header_items & header_dropdown_items for mobile sidebar navigation
-- ====================================================================

ALTER TABLE public.header_items 
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.header_items.image_url IS 'Cloudflare R2 image URL for mobile sidebar drawer main category icon';

ALTER TABLE public.header_dropdown_items 
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.header_dropdown_items.image_url IS 'Cloudflare R2 image URL for mobile sidebar drawer subcategory thumbnails';


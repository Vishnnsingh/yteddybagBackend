-- 19_occasions_image_scale.sql
-- Add image_scale and image_position columns to home_occasions table

ALTER TABLE public.home_occasions 
ADD COLUMN IF NOT EXISTS image_scale NUMERIC DEFAULT 1.0;

ALTER TABLE public.home_occasions 
ADD COLUMN IF NOT EXISTS image_position VARCHAR(50) DEFAULT 'bottom-right';

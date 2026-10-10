-- ====================================================================
-- Wishlist Setup Migration for YTeddybags
-- Run this in Supabase SQL Editor
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.users(id) ON DELETE CASCADE,
    guest_id VARCHAR(100) NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS wishlist_user_id_idx ON public.wishlist (user_id);
CREATE INDEX IF NOT EXISTS wishlist_guest_id_idx ON public.wishlist (guest_id);
CREATE INDEX IF NOT EXISTS wishlist_product_id_idx ON public.wishlist (product_id);

-- Enable RLS & policies
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to wishlist" ON public.wishlist;
CREATE POLICY "Public full access to wishlist" ON public.wishlist
    FOR ALL USING (true);

GRANT ALL PRIVILEGES ON public.wishlist TO postgres, anon, authenticated, service_role;

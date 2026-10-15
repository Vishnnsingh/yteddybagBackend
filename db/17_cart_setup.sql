-- ====================================================================
-- Cart Setup Migration for YTeddybags
-- Run this in Supabase SQL Editor
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.users(id) ON DELETE CASCADE,
    guest_id VARCHAR(100) NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    selected_color VARCHAR(100) NULL,
    selected_size VARCHAR(100) NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    is_selected BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS cart_user_id_idx ON public.cart (user_id);
CREATE INDEX IF NOT EXISTS cart_guest_id_idx ON public.cart (guest_id);
CREATE INDEX IF NOT EXISTS cart_product_id_idx ON public.cart (product_id);

-- Enable Row Level Security & Policies
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to cart" ON public.cart;
CREATE POLICY "Public full access to cart" ON public.cart
    FOR ALL USING (true);

GRANT ALL PRIVILEGES ON public.cart TO postgres, anon, authenticated, service_role;

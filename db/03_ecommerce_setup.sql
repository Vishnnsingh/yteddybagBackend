-- ====================================================================
-- Ecommerce Table for YTeddybags
-- ====================================================================

-- 1. Migration: If 'restaurants' table existed previously, rename to 'ecommerce'
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'restaurants'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ecommerce'
    ) THEN
        ALTER TABLE public.restaurants RENAME TO ecommerce;
    END IF;
END $$;

-- 2. Create 'ecommerce' table
CREATE TABLE IF NOT EXISTS public.ecommerce (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo VARCHAR(500) NULL,
    address TEXT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS ecommerce_slug_idx ON public.ecommerce (slug);
CREATE INDEX IF NOT EXISTS ecommerce_email_idx ON public.ecommerce (email);

-- 3. Grant Permissions
GRANT ALL PRIVILEGES ON public.ecommerce TO postgres, anon, authenticated, service_role;

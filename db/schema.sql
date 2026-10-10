-- ====================================================================
-- YTeddybags Database Schema (Supabase / PostgreSQL)
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Schema Permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ====================================================================
-- 3. Ecommerce Table (Store Settings & Info)
-- ====================================================================
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

-- ====================================================================
-- 4. Users Table (Customer Authentication & Profiles)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ecommerceId" VARCHAR(255) NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NULL,
    role VARCHAR(50) DEFAULT 'user',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Migration if column restaurantId previously existed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'restaurantId'
    ) THEN
        ALTER TABLE public.users RENAME COLUMN "restaurantId" TO "ecommerceId";
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- Row Level Security (RLS) for Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
CREATE POLICY "Enable insert for authenticated users only" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (
    auth.uid() = id
);

-- ====================================================================
-- 5. Admins Table (Dashboard Admin Login & Management)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Drop password column if it previously existed (handled securely by Supabase Auth)
ALTER TABLE public.admins DROP COLUMN IF EXISTS password;

CREATE INDEX IF NOT EXISTS admins_email_idx ON public.admins (email);

-- ====================================================================
-- 6. Grant Permissions to All Roles
-- ====================================================================
GRANT ALL PRIVILEGES ON public.ecommerce TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON public.users TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON public.admins TO postgres, anon, authenticated, service_role;

-- ====================================================================
-- 7. Header Navigation & Dropdown Sub-Items
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.header_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    path VARCHAR(255) DEFAULT '/',
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.header_dropdown_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    header_item_id UUID NOT NULL REFERENCES public.header_items(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    path VARCHAR(255) DEFAULT '/',
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- High-performance B-tree indexes
CREATE INDEX IF NOT EXISTS header_items_order_idx ON public.header_items (order_index);
CREATE INDEX IF NOT EXISTS header_items_is_active_idx ON public.header_items (is_active);
CREATE INDEX IF NOT EXISTS header_dropdown_header_id_idx ON public.header_dropdown_items (header_item_id);
CREATE INDEX IF NOT EXISTS header_dropdown_order_idx ON public.header_dropdown_items (order_index);
CREATE INDEX IF NOT EXISTS header_dropdown_is_active_idx ON public.header_dropdown_items (is_active);

GRANT ALL PRIVILEGES ON public.header_items TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON public.header_dropdown_items TO postgres, anon, authenticated, service_role;


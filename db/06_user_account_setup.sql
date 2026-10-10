-- ====================================================================
-- User Account, Extended Profile & Addresses Setup for YTeddybags
-- ====================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Optional: Add extra profile columns to users table if desired in Supabase
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'gender'
    ) THEN
        ALTER TABLE public.users ADD COLUMN gender VARCHAR(20) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'dateOfBirth'
    ) THEN
        ALTER TABLE public.users ADD COLUMN "dateOfBirth" VARCHAR(50) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'location'
    ) THEN
        ALTER TABLE public.users ADD COLUMN location VARCHAR(255) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'alternateMobile'
    ) THEN
        ALTER TABLE public.users ADD COLUMN "alternateMobile" VARCHAR(20) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'hintName'
    ) THEN
        ALTER TABLE public.users ADD COLUMN "hintName" VARCHAR(100) NULL;
    END IF;
END $$;

-- 3. Dedicated User Addresses Table (Native table in Supabase)
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    address TEXT NOT NULL,
    locality VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'HOME',
    "isDefault" BOOLEAN DEFAULT false,
    "openOnSaturday" BOOLEAN DEFAULT false,
    "openOnSunday" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Migration for existing user_addresses table:
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS "openOnSaturday" BOOLEAN DEFAULT false;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS "openOnSunday" BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS user_addresses_user_id_idx ON public.user_addresses (user_id);

-- Permissions
GRANT ALL PRIVILEGES ON public.user_addresses TO postgres, anon, authenticated, service_role;

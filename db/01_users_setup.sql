-- Supabase Setup Script for YTeddybags E-commerce Users

-- 0. Extensions & Permissions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 1. Create the Users Table
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

-- 2. Create Index on email for faster auth lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- 3. Row Level Security (RLS) - Optional but recommended for Supabase
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (useful for custom auth signup flows)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
CREATE POLICY "Enable insert for authenticated users only" ON public.users FOR INSERT WITH CHECK (true);

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (
  auth.uid() = id
);

-- Note: The getSupabaseAdmin() in your backend uses the SERVICE_ROLE_KEY,
-- which bypasses RLS policies entirely, so your backend will always be able
-- to insert/select/update regardless of the above policies.

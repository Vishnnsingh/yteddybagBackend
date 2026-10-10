-- ====================================================================
-- Admins Table for YTeddybags Dashboard (Supabase)
-- Passwords are fully managed and encrypted inside Supabase Auth (auth.users)
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

-- Drop password column if it previously existed
ALTER TABLE public.admins DROP COLUMN IF EXISTS password;

-- Index on email for faster lookups
CREATE INDEX IF NOT EXISTS admins_email_idx ON public.admins (email);

-- Grant permissions
GRANT ALL PRIVILEGES ON public.admins TO postgres, anon, authenticated, service_role;

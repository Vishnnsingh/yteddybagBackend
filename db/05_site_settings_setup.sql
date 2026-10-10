-- ====================================================================
-- Site Settings Table for YTeddybags (Login Banner, Site Configuration)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS site_settings_key_idx ON public.site_settings (key);

GRANT ALL PRIVILEGES ON public.site_settings TO postgres, anon, authenticated, service_role;

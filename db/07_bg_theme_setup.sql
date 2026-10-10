-- ====================================================================
-- Background Theme Setup for YTeddybags (Desktop & Mobile Cloud Doodles)
-- ====================================================================

-- Ensure site_settings table exists
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS site_settings_key_idx ON public.site_settings (key);

GRANT ALL PRIVILEGES ON public.site_settings TO postgres, anon, authenticated, service_role;

-- Seed default background theme configuration (matching default login background)
INSERT INTO public.site_settings (key, value, updated_at)
VALUES (
    'bg_theme',
    '{
        "desktop": {
            "bg_type": "default",
            "bg_color": "#FDF0EC",
            "gradient_to": "#FDF5F2",
            "use_gradient": true,
            "pattern_size": 55,
            "pattern_opacity": 0.25,
            "pattern_gap": 65,
            "doodles": []
        },
        "mobile": {
            "bg_type": "default",
            "bg_color": "#FDF0EC",
            "gradient_to": "#FDF5F2",
            "use_gradient": true,
            "pattern_size": 40,
            "pattern_opacity": 0.22,
            "pattern_gap": 50,
            "doodles": []
        },
        "updated_at": "2026-09-30T18:50:00.000Z"
    }'::jsonb,
    NOW()
)
ON CONFLICT (key) DO NOTHING;

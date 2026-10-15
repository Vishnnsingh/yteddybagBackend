-- ====================================================================
-- Orders Setup Migration for YTeddybags
-- Run this in Supabase SQL Editor
-- ====================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(150) NULL,
    customer_phone VARCHAR(50) NOT NULL,
    shipping_address JSONB NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'COD',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    payment_details JSONB NULL,
    order_status VARCHAR(50) NOT NULL DEFAULT 'Placed',
    total_mrp NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    coupon_code VARCHAR(50) NULL,
    coupon_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL,
    tracking_number VARCHAR(100) NULL,
    courier_partner VARCHAR(100) NULL,
    notes TEXT NULL,
    -- Delhivery Logistics Fields
    delhivery_waybill VARCHAR(100) NULL,
    delhivery_status VARCHAR(100) NULL,
    delhivery_status_code VARCHAR(50) NULL,
    delhivery_scans JSONB NULL,
    delhivery_label_url TEXT NULL,
    estimated_delivery_date VARCHAR(100) NULL,
    pickup_location VARCHAR(150) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Idempotent Column Additions for existing table installations
DO $$ 
BEGIN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delhivery_waybill VARCHAR(100) NULL;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delhivery_status VARCHAR(100) NULL;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delhivery_status_code VARCHAR(50) NULL;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delhivery_scans JSONB NULL;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delhivery_label_url TEXT NULL;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_date VARCHAR(100) NULL;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(150) NULL;
    -- Cancellation reason & comments
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255) NULL;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_comment TEXT NULL;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE NULL;
END $$;

-- Highly optimized indexes for fast search, filter, and pagination
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS orders_order_status_idx ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_phone_idx ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS orders_delhivery_waybill_idx ON public.orders (delhivery_waybill);

-- Enable Row Level Security & Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to orders" ON public.orders;
CREATE POLICY "Public full access to orders" ON public.orders
    FOR ALL USING (true);

GRANT ALL PRIVILEGES ON public.orders TO postgres, anon, authenticated, service_role;

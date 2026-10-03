-- ==============================================================================
-- MR. KUKOOO COMPLETE SUPABASE SCHEMA & MIGRATIONS SCRIPT
-- Safe to run multiple times in your Supabase SQL Editor
-- ==============================================================================

-- 1. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT
);

-- 2. Ingredients
CREATE TABLE IF NOT EXISTS public.ingredients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity INT DEFAULT 0,
    unit TEXT,
    low_stock_threshold INT,
    auto_deduct BOOLEAN DEFAULT false,
    price_per_unit NUMERIC DEFAULT 0,
    cost_per_unit NUMERIC DEFAULT 0
);

-- Ensure all ingredient columns exist
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS auto_deduct BOOLEAN DEFAULT false;
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC DEFAULT 0;
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC DEFAULT 0;

-- 3. Products
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    category_id TEXT REFERENCES public.categories(id),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    quantity INT DEFAULT 0,
    is_deal BOOLEAN DEFAULT false,
    deal_items JSONB DEFAULT '[]'::jsonb,
    homepage_sections JSONB DEFAULT '[]'::jsonb,
    branch_ids JSONB DEFAULT '["branch-chak-104sb"]'::jsonb,
    has_sizes BOOLEAN DEFAULT false,
    sizes JSONB DEFAULT '[]'::jsonb,
    ingredient_ids JSONB DEFAULT '[]'::jsonb
);

-- Ensure all product columns exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_deal BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deal_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS homepage_sections JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS branch_ids JSONB DEFAULT '["branch-chak-104sb"]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredient_ids JSONB DEFAULT '[]'::jsonb;

-- 4. Offers
CREATE TABLE IF NOT EXISTS public.offers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    promo_image_url TEXT,
    active_status BOOLEAN DEFAULT true,
    redirect_type TEXT DEFAULT 'none',
    redirect_target TEXT,
    branch_ids JSONB DEFAULT '["branch-chak-104sb"]'::jsonb
);

-- Ensure all offer columns exist
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS redirect_type TEXT DEFAULT 'none';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS redirect_target TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS branch_ids JSONB DEFAULT '["branch-chak-104sb"]'::jsonb;

-- 5. Orders
CREATE TABLE IF NOT EXISTS public.orders (
    order_id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    table_number TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC DEFAULT 0,
    order_type TEXT,
    status TEXT DEFAULT 'Pending',
    payment_status TEXT DEFAULT 'unpaid',
    source TEXT DEFAULT 'Web',
    timestamp TEXT,
    branch_id TEXT,
    delivery_fee NUMERIC DEFAULT 0,
    special_instructions TEXT,
    voucher_code TEXT,
    discount_amount NUMERIC DEFAULT 0,
    customer_coords JSONB,
    delivery_distance NUMERIC DEFAULT 0,
    is_edited BOOLEAN DEFAULT false
);

-- Ensure all order columns exist if table was created previously with older schema
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Web';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS voucher_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_coords JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_distance NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- 7. Addons
CREATE TABLE IF NOT EXISTS public.addons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    type TEXT,
    branch_ids JSONB DEFAULT '["branch-chak-104sb"]'::jsonb
);

-- Ensure all addon columns exist
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS branch_ids JSONB DEFAULT '["branch-chak-104sb"]'::jsonb;

-- 8. Branches
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    lat NUMERIC,
    lng NUMERIC,
    maps_link TEXT
);

-- 9. Users (Staff Roles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Homepage Sections
CREATE TABLE IF NOT EXISTS public.homepage_sections_doc (
    id TEXT PRIMARY KEY DEFAULT '_homepage_sections_',
    sections JSONB DEFAULT '[]'::jsonb
);

-- 11. Order Analytics Archives (Historical Summaries for Purged Orders)
CREATE TABLE IF NOT EXISTS public.order_analytics_archives (
    id TEXT PRIMARY KEY,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    total_orders INT DEFAULT 0,
    completed_orders INT DEFAULT 0,
    cancelled_orders INT DEFAULT 0,
    gross_revenue NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    net_profit NUMERIC DEFAULT 0,
    total_discounts NUMERIC DEFAULT 0,
    total_delivery_fees NUMERIC DEFAULT 0,
    order_types JSONB DEFAULT '{}'::jsonb,
    item_breakdown JSONB DEFAULT '[]'::jsonb,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Realtime Configuration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ingredients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;
  END IF;
END $$;

-- Disable Row Level Security (RLS) for unrestricted public and POS operations
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections_doc DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_analytics_archives DISABLE ROW LEVEL SECURITY;

-- High-Speed Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON public.orders(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_order_archives_dates ON public.order_analytics_archives(start_date, end_date);

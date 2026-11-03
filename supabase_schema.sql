-- ========================================================
-- Universe Hub Mobile Store - Supabase Database Schema
-- Run this entire script in Supabase SQL Editor
-- ========================================================

-- 1. Create PRODUCTS Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  badge TEXT,
  is_featured BOOLEAN DEFAULT false,
  stock INTEGER DEFAULT 10,
  rating NUMERIC DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  image TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  specs JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create CATEGORIES Table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "group" TEXT DEFAULT 'iphones',
  "groupName" TEXT DEFAULT 'iPhones',
  icon TEXT,
  "inNav" BOOLEAN DEFAULT true,
  "inFilter" BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create BRANDS Table
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create ORDERS Table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  postal_code TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  shipping NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'processing',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create REPAIR_ORDERS Table
CREATE TABLE IF NOT EXISTS public.repair_orders (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  device_brand TEXT,
  device_model TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  issue_description TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create REVIEWS Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT NOT NULL,
  verified BOOLEAN DEFAULT true,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create STORE_SETTINGS Table
CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & SET PERMISSIVE POLICIES
-- ========================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Products Policies (Public can read; Public/Admin can insert/update)
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow product modifications" ON public.products;
CREATE POLICY "Allow product modifications" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Categories Policies
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow category modifications" ON public.categories;
CREATE POLICY "Allow category modifications" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- Brands Policies
DROP POLICY IF EXISTS "Public can view brands" ON public.brands;
CREATE POLICY "Public can view brands" ON public.brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow brand modifications" ON public.brands;
CREATE POLICY "Allow brand modifications" ON public.brands FOR ALL USING (true) WITH CHECK (true);

-- Orders Policies (Public can insert orders; Store can read/update)
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow order reading and updates" ON public.orders;
CREATE POLICY "Allow order reading and updates" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- Repair Orders Policies
DROP POLICY IF EXISTS "Public can insert repairs" ON public.repair_orders;
CREATE POLICY "Public can insert repairs" ON public.repair_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow repair reading and updates" ON public.repair_orders;
CREATE POLICY "Allow repair reading and updates" ON public.repair_orders FOR ALL USING (true) WITH CHECK (true);

-- Reviews Policies
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;
CREATE POLICY "Public can view reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert reviews" ON public.reviews;
CREATE POLICY "Public can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Store Settings Policies
DROP POLICY IF EXISTS "Public can view settings" ON public.store_settings;
CREATE POLICY "Public can view settings" ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow settings modifications" ON public.store_settings;
CREATE POLICY "Allow settings modifications" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);

-- ========================================================
-- ENABLE REALTIME ON RELEVANT TABLES
-- ========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;


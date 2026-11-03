-- ========================================================
-- Universe Hub Mobile Store - Supabase Database Schema
-- Wrapped in a single procedural block to satisfy "Only singular query allowed"
-- ========================================================

DO $$
BEGIN
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

  -- Security Policies
  EXECUTE 'ALTER TABLE public.products ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY';

  DROP POLICY IF EXISTS "Allow all on products" ON public.products;
  CREATE POLICY "Allow all on products" ON public.products FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all on categories" ON public.categories;
  CREATE POLICY "Allow all on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all on brands" ON public.brands;
  CREATE POLICY "Allow all on brands" ON public.brands FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all on orders" ON public.orders;
  CREATE POLICY "Allow all on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all on repair_orders" ON public.repair_orders;
  CREATE POLICY "Allow all on repair_orders" ON public.repair_orders FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all on reviews" ON public.reviews;
  CREATE POLICY "Allow all on reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow all on store_settings" ON public.store_settings;
  CREATE POLICY "Allow all on store_settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
END $$;

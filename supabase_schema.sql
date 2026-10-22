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
-- Create each account in Supabase Auth, then insert its Auth user UUID and role
-- here using the SQL editor. Self-service staff registration is intentionally disabled.
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

-- Tables used by the application but not defined in earlier schema versions
CREATE TABLE IF NOT EXISTS public.vouchers (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    value NUMERIC DEFAULT 0,
    min_order NUMERIC DEFAULT 0,
    max_uses INT DEFAULT 0,
    times_used INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS value NUMERIC DEFAULT 0;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS min_order NUMERIC DEFAULT 0;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS max_uses INT DEFAULT 0;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS times_used INT DEFAULT 0;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Keep fields used by the current application when upgrading older databases.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_token TEXT;

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

-- Fail closed: enable RLS for every table in public, including tables created
-- outside this script. Only the explicitly granted policies below are exposed.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- Replace any older app-table policies so no permissive policy survives beside
-- the role rules defined below.
DO $$
DECLARE
  policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'categories', 'ingredients', 'products', 'offers', 'orders', 'addons',
        'branches', 'users', 'homepage_sections_doc', 'order_analytics_archives',
        'vouchers', 'store_settings'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_staff_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = ANY(required_roles)
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_staff_role(TEXT[]) TO authenticated;
REVOKE ALL ON FUNCTION public.has_staff_role(TEXT[]) FROM PUBLIC, anon;

-- Public menu data is read-only. Sensitive cost and order data is not granted
-- to anon, even where a public row-read policy exists.
GRANT SELECT ON public.categories, public.offers, public.addons, public.branches
  TO anon, authenticated;
GRANT SELECT (id, name, description, price, category_id, image_url, is_available,
              quantity, is_deal, deal_items, homepage_sections, branch_ids,
              has_sizes, sizes, ingredient_ids)
  ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT (id, quantity) ON public.ingredients TO anon;
GRANT SELECT ON public.ingredients TO authenticated;
GRANT SELECT (id, sections) ON public.homepage_sections_doc TO anon;
GRANT SELECT ON public.homepage_sections_doc TO authenticated;
GRANT SELECT (id, code, type, value, min_order, max_uses, times_used, is_active)
  ON public.vouchers TO anon;
GRANT SELECT ON public.vouchers TO authenticated;
GRANT SELECT (key, value) ON public.store_settings TO anon;
GRANT SELECT ON public.store_settings TO authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.orders, public.order_analytics_archives TO authenticated;

GRANT INSERT (order_id, customer_name, customer_phone, customer_address, table_number,
              items, total_amount, order_type, status, payment_status, source,
              timestamp, branch_id, delivery_fee, special_instructions, voucher_code,
              discount_amount, customer_coords, delivery_distance, is_edited, subtotal,
              discount_type, discount_value, tracking_token)
  ON public.orders TO anon;
GRANT INSERT, UPDATE, DELETE ON public.categories, public.products, public.ingredients,
  public.offers, public.addons, public.branches, public.homepage_sections_doc,
  public.order_analytics_archives, public.vouchers, public.store_settings,
  public.orders TO authenticated;
GRANT UPDATE (quantity) ON public.products, public.ingredients TO authenticated;
GRANT UPDATE (status) ON public.orders TO authenticated;

-- A staff role is assigned only after a real Supabase Auth user is provisioned.
DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS categories_manager_write ON public.categories;
CREATE POLICY categories_manager_write ON public.categories
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));

DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS products_staff_write ON public.products;
CREATE POLICY products_staff_write ON public.products
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));
DROP POLICY IF EXISTS products_employee_read ON public.products;
CREATE POLICY products_employee_read ON public.products
  FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['employee']));
DROP POLICY IF EXISTS products_employee_stock_update ON public.products;
CREATE POLICY products_employee_stock_update ON public.products
  FOR UPDATE TO authenticated
  USING (public.has_staff_role(ARRAY['employee']))
  WITH CHECK (public.has_staff_role(ARRAY['employee']));

DROP POLICY IF EXISTS ingredients_public_stock_read ON public.ingredients;
CREATE POLICY ingredients_public_stock_read ON public.ingredients
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS ingredients_staff_read ON public.ingredients;
CREATE POLICY ingredients_staff_read ON public.ingredients
  FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['manager', 'employee']));
DROP POLICY IF EXISTS ingredients_manager_write ON public.ingredients;
CREATE POLICY ingredients_manager_write ON public.ingredients
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));
DROP POLICY IF EXISTS ingredients_employee_stock_update ON public.ingredients;
CREATE POLICY ingredients_employee_stock_update ON public.ingredients
  FOR UPDATE TO authenticated
  USING (public.has_staff_role(ARRAY['employee']))
  WITH CHECK (public.has_staff_role(ARRAY['employee']));

DROP POLICY IF EXISTS offers_public_read ON public.offers;
CREATE POLICY offers_public_read ON public.offers
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS offers_manager_write ON public.offers;
CREATE POLICY offers_manager_write ON public.offers
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));

DROP POLICY IF EXISTS addons_public_read ON public.addons;
CREATE POLICY addons_public_read ON public.addons
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS addons_manager_write ON public.addons;
CREATE POLICY addons_manager_write ON public.addons
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));

DROP POLICY IF EXISTS branches_public_read ON public.branches;
CREATE POLICY branches_public_read ON public.branches
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS branches_manager_write ON public.branches;
CREATE POLICY branches_manager_write ON public.branches
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));

DROP POLICY IF EXISTS homepage_sections_public_read ON public.homepage_sections_doc;
CREATE POLICY homepage_sections_public_read ON public.homepage_sections_doc
  FOR SELECT TO anon, authenticated USING (id = '_homepage_sections_');
DROP POLICY IF EXISTS homepage_sections_manager_write ON public.homepage_sections_doc;
CREATE POLICY homepage_sections_manager_write ON public.homepage_sections_doc
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));

DROP POLICY IF EXISTS orders_public_insert ON public.orders;
-- Guest checkout needs one narrow INSERT path. The submitted amount is still
-- client-provided; verify prices/payment server-side before enabling online pay.
CREATE POLICY orders_public_insert ON public.orders
  FOR INSERT TO anon
  WITH CHECK (
    tracking_token ~ '^[0-9a-f]{64}$'
    AND status = 'Pending'
    AND payment_status = 'unpaid'
    AND source = 'Web'
    AND is_edited = false
    AND COALESCE(customer_name, '') <> ''
    AND COALESCE(customer_phone, '') <> ''
    AND total_amount >= 0
    AND COALESCE(discount_amount, 0) >= 0
    AND CASE
      WHEN jsonb_typeof(items) = 'array' THEN jsonb_array_length(items) > 0
      ELSE false
    END
  );
DROP POLICY IF EXISTS orders_staff_read ON public.orders;
CREATE POLICY orders_staff_read ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['manager', 'employee']));
DROP POLICY IF EXISTS orders_staff_insert ON public.orders;
CREATE POLICY orders_staff_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_role(ARRAY['manager', 'employee']));
DROP POLICY IF EXISTS orders_staff_update ON public.orders;
CREATE POLICY orders_staff_update ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_staff_role(ARRAY['manager', 'employee']))
  WITH CHECK (public.has_staff_role(ARRAY['manager', 'employee']));
DROP POLICY IF EXISTS orders_manager_delete ON public.orders;
CREATE POLICY orders_manager_delete ON public.orders
  FOR DELETE TO authenticated
  USING (public.has_staff_role(ARRAY['manager']));

DROP POLICY IF EXISTS users_read_own_role ON public.users;
CREATE POLICY users_read_own_role ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS users_manager_read ON public.users;
CREATE POLICY users_manager_read ON public.users
  FOR SELECT TO authenticated USING (public.has_staff_role(ARRAY['manager']));

DROP POLICY IF EXISTS archives_manager_access ON public.order_analytics_archives;
CREATE POLICY archives_manager_access ON public.order_analytics_archives
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));

DROP POLICY IF EXISTS vouchers_public_active_read ON public.vouchers;
CREATE POLICY vouchers_public_active_read ON public.vouchers
  FOR SELECT TO anon USING (is_active = true);
DROP POLICY IF EXISTS vouchers_staff_read ON public.vouchers;
CREATE POLICY vouchers_staff_read ON public.vouchers
  FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['manager', 'employee']));
DROP POLICY IF EXISTS vouchers_manager_write ON public.vouchers;
CREATE POLICY vouchers_manager_write ON public.vouchers
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));

DROP POLICY IF EXISTS store_settings_public_read ON public.store_settings;
CREATE POLICY store_settings_public_read ON public.store_settings
  FOR SELECT TO anon USING (key = 'voucher_settings');
DROP POLICY IF EXISTS store_settings_staff_read ON public.store_settings;
CREATE POLICY store_settings_staff_read ON public.store_settings
  FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['manager', 'employee']));
DROP POLICY IF EXISTS store_settings_manager_write ON public.store_settings;
CREATE POLICY store_settings_manager_write ON public.store_settings
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));

-- Keep employee database credentials limited to the fields their POS actions
-- need, despite the shared authenticated database role.
CREATE OR REPLACE FUNCTION public.enforce_employee_column_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF public.has_staff_role(ARRAY['manager']) THEN
    RETURN NEW;
  END IF;
  IF NOT public.has_staff_role(ARRAY['employee']) THEN
    RAISE EXCEPTION 'Staff authorization required';
  END IF;

  IF TG_TABLE_NAME = 'orders'
     AND (to_jsonb(OLD) - 'status') IS DISTINCT FROM (to_jsonb(NEW) - 'status') THEN
    RAISE EXCEPTION 'Employees may only update order status';
  ELSIF TG_TABLE_NAME IN ('products', 'ingredients')
     AND (to_jsonb(OLD) - 'quantity') IS DISTINCT FROM (to_jsonb(NEW) - 'quantity') THEN
    RAISE EXCEPTION 'Employees may only update stock quantity';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_employee_column_access() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_employee_column_guard ON public.orders;
CREATE TRIGGER orders_employee_column_guard BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_column_access();
DROP TRIGGER IF EXISTS products_employee_column_guard ON public.products;
CREATE TRIGGER products_employee_column_guard BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_column_access();
DROP TRIGGER IF EXISTS ingredients_employee_column_guard ON public.ingredients;
CREATE TRIGGER ingredients_employee_column_guard BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_column_access();

CREATE OR REPLACE FUNCTION public.get_order_tracking(p_order_id TEXT, p_tracking_token TEXT)
RETURNS TABLE(order_id TEXT, status TEXT, "timestamp" TEXT, total_amount NUMERIC, order_type TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT o.order_id, o.status, o."timestamp", o.total_amount, o.order_type
  FROM public.orders AS o
  WHERE o.order_id = p_order_id
    AND o.tracking_token = p_tracking_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_order_tracking(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_order_voucher_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.voucher_code IS NOT NULL THEN
    UPDATE public.vouchers
    SET times_used = COALESCE(times_used, 0) + 1
    WHERE code = upper(NEW.voucher_code) AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_order_voucher_usage() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_increment_voucher_usage ON public.orders;
CREATE TRIGGER orders_increment_voucher_usage AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.increment_order_voucher_usage();

CREATE OR REPLACE FUNCTION public.deduct_order_item_stock(
  p_product_id TEXT,
  p_quantity INTEGER,
  p_size_name TEXT DEFAULT NULL,
  p_depth INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  product_row public.products%ROWTYPE;
  item JSONB;
  ingredient_entry JSONB;
  ingredient_id TEXT;
  portion NUMERIC;
  has_mapped_ingredients BOOLEAN := false;
  child_product_id TEXT;
  child_quantity INTEGER;
  child_size_name TEXT;
BEGIN
  IF p_depth > 5 THEN
    RAISE EXCEPTION 'Product deal nesting exceeds the supported limit';
  END IF;

  SELECT * INTO product_row
  FROM public.products
  WHERE id = p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % does not exist', p_product_id;
  END IF;
  IF NOT product_row.is_available THEN
    RAISE EXCEPTION 'Product % is unavailable', p_product_id;
  END IF;

  IF product_row.is_deal AND jsonb_array_length(COALESCE(product_row.deal_items, '[]'::jsonb)) > 0 THEN
    FOR item IN SELECT value FROM jsonb_array_elements(product_row.deal_items)
    LOOP
      child_product_id := item->>'product_id';
      child_quantity := GREATEST(1, COALESCE(NULLIF(item->>'quantity', '')::INTEGER, 1)) * p_quantity;
      child_size_name := COALESCE(item->'size'->>'name', item->>'size');
      IF child_product_id IS NOT NULL THEN
        PERFORM public.deduct_order_item_stock(child_product_id, child_quantity, child_size_name, p_depth + 1);
      END IF;
    END LOOP;
    RETURN;
  END IF;

  FOR ingredient_entry IN SELECT value FROM jsonb_array_elements(COALESCE(product_row.ingredient_ids, '[]'::jsonb))
  LOOP
    ingredient_id := CASE
      WHEN jsonb_typeof(ingredient_entry) = 'string' THEN ingredient_entry #>> '{}'
      ELSE ingredient_entry->>'id'
    END;
    IF ingredient_id IS NOT NULL AND ingredient_id <> '' THEN
      portion := GREATEST(1, COALESCE(NULLIF(ingredient_entry->>'quantity', '')::NUMERIC, 1));
      UPDATE public.ingredients
      SET quantity = GREATEST(0, COALESCE(quantity, 0) - CEIL(portion * p_quantity)::INTEGER)
      WHERE id = ingredient_id
        AND COALESCE(quantity, 0) >= CEIL(portion * p_quantity)::INTEGER;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for ingredient %', ingredient_id;
      END IF;
      has_mapped_ingredients := true;
    END IF;
  END LOOP;

  IF p_size_name IS NOT NULL AND product_row.has_sizes THEN
    FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(product_row.sizes, '[]'::jsonb))
    LOOP
      IF item->>'name' = p_size_name THEN
        FOR ingredient_entry IN SELECT value FROM jsonb_array_elements(COALESCE(item->'ingredient_ids', '[]'::jsonb))
        LOOP
          ingredient_id := CASE
            WHEN jsonb_typeof(ingredient_entry) = 'string' THEN ingredient_entry #>> '{}'
            ELSE ingredient_entry->>'id'
          END;
          IF ingredient_id IS NOT NULL AND ingredient_id <> '' THEN
            portion := GREATEST(1, COALESCE(NULLIF(ingredient_entry->>'quantity', '')::NUMERIC, 1));
            UPDATE public.ingredients
            SET quantity = GREATEST(0, COALESCE(quantity, 0) - CEIL(portion * p_quantity)::INTEGER)
            WHERE id = ingredient_id
              AND COALESCE(quantity, 0) >= CEIL(portion * p_quantity)::INTEGER;
            IF NOT FOUND THEN
              RAISE EXCEPTION 'Insufficient stock for ingredient %', ingredient_id;
            END IF;
            has_mapped_ingredients := true;
          END IF;
        END LOOP;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NOT has_mapped_ingredients THEN
    UPDATE public.products
    SET quantity = GREATEST(0, COALESCE(quantity, 0) - p_quantity)
    WHERE id = p_product_id
      AND COALESCE(quantity, 0) >= p_quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.deduct_order_item_stock(TEXT, INTEGER, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.deduct_public_order_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  order_item JSONB;
  product_id TEXT;
  item_quantity INTEGER;
  size_name TEXT;
BEGIN
  IF auth.role() <> 'anon' OR NEW.tracking_token IS NULL THEN
    RETURN NEW;
  END IF;

  FOR order_item IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
  LOOP
    product_id := COALESCE(order_item->>'product_id', order_item->>'id');
    item_quantity := GREATEST(1, COALESCE(NULLIF(order_item->>'quantity', '')::INTEGER, 1));
    size_name := COALESCE(order_item->'size'->>'name', order_item->>'size');
    IF product_id IS NOT NULL THEN
      PERFORM public.deduct_order_item_stock(product_id, item_quantity, size_name);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.deduct_public_order_stock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_deduct_public_order_stock ON public.orders;
CREATE TRIGGER orders_deduct_public_order_stock AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.deduct_public_order_stock();

-- High-Speed Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON public.orders(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_order_archives_dates ON public.order_analytics_archives(start_date, end_date);

-- ============================================================================
-- REFACTOR MIGRATION: RECIPE-BASED INVENTORY & INGREDIENT ANALYTICS (FIXED)
-- ============================================================================

-- Step 0: Temporarily disable the employee guard trigger so administrative 
-- schema backfills can update the ingredients table without requiring an active staff session
DROP TRIGGER IF EXISTS ingredients_employee_column_guard ON public.ingredients;


-- 1. INGREDIENTS TABLE UPDATES
-- Add display_unit, base_unit, conversion_factor, and stock_quantity
ALTER TABLE public.ingredients 
  ADD COLUMN IF NOT EXISTS display_unit TEXT DEFAULT 'KG',
  ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'Grams',
  ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC DEFAULT 0;

-- Backfill stock_quantity from existing quantity multiplied by conversion_factor
-- if stock_quantity is 0 or null and quantity > 0
UPDATE public.ingredients
SET 
  display_unit = COALESCE(display_unit, 'KG'),
  base_unit = COALESCE(base_unit, 'Grams'),
  conversion_factor = COALESCE(conversion_factor, 1000),
  stock_quantity = CASE 
    WHEN (stock_quantity IS NULL OR stock_quantity = 0) AND (quantity IS NOT NULL AND quantity > 0)
    THEN quantity * COALESCE(conversion_factor, 1000)
    ELSE COALESCE(stock_quantity, quantity, 0)
  END;

-- Keep legacy quantity column in sync with stock_quantity
UPDATE public.ingredients
SET quantity = ROUND(stock_quantity)::INT
WHERE quantity IS DISTINCT FROM ROUND(stock_quantity)::INT;

-- Re-enable the employee column guard trigger on ingredients
CREATE TRIGGER ingredients_employee_column_guard BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_column_access();


-- 2. RECIPE MAPPING TABLE
-- Relational table defining exact base-unit recipe requirements per menu product or size
CREATE TABLE IF NOT EXISTS public.recipe_mapping (
  id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
  menu_item_id TEXT NOT NULL,
  size_name TEXT,
  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  required_quantity NUMERIC NOT NULL DEFAULT 1,
  unit_used TEXT NOT NULL DEFAULT 'Grams',
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE(menu_item_id, size_name, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_mapping_menu_item ON public.recipe_mapping(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_mapping_ingredient ON public.recipe_mapping(ingredient_id);


-- 3. LOGGING TABLES

-- Table: order_ingredient_logs
CREATE TABLE IF NOT EXISTS public.order_ingredient_logs (
  id TEXT PRIMARY KEY DEFAULT ('log_' || replace(gen_random_uuid()::text, '-', '')),
  order_id TEXT NOT NULL,
  menu_item_id TEXT,
  menu_item_name TEXT,
  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity_deducted NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_ing_logs_order ON public.order_ingredient_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_ing_logs_ingredient ON public.order_ingredient_logs(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_order_ing_logs_created_at ON public.order_ingredient_logs(created_at DESC);

-- Table: wastage_log
CREATE TABLE IF NOT EXISTS public.wastage_log (
  id TEXT PRIMARY KEY DEFAULT ('wst_' || replace(gen_random_uuid()::text, '-', '')),
  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  wasted_quantity NUMERIC NOT NULL,
  reason TEXT,
  reported_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wastage_log_ingredient ON public.wastage_log(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_wastage_log_created_at ON public.wastage_log(created_at DESC);


-- 4. RLS & PERMISSIONS FOR NEW TABLES
ALTER TABLE public.recipe_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_ingredient_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wastage_log ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.recipe_mapping, public.order_ingredient_logs, public.wastage_log TO authenticated;
GRANT SELECT (id, menu_item_id, size_name, ingredient_id, required_quantity, unit_used) ON public.recipe_mapping TO anon;
GRANT INSERT, UPDATE, DELETE ON public.recipe_mapping, public.order_ingredient_logs, public.wastage_log TO authenticated;

-- Policies for recipe_mapping
DROP POLICY IF EXISTS recipe_mapping_read ON public.recipe_mapping;
CREATE POLICY recipe_mapping_read ON public.recipe_mapping
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS recipe_mapping_write ON public.recipe_mapping;
CREATE POLICY recipe_mapping_write ON public.recipe_mapping
  FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['manager']))
  WITH CHECK (public.has_staff_role(ARRAY['manager']));

-- Policies for order_ingredient_logs
DROP POLICY IF EXISTS order_ingredient_logs_staff_read ON public.order_ingredient_logs;
CREATE POLICY order_ingredient_logs_staff_read ON public.order_ingredient_logs
  FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['manager', 'employee']));

DROP POLICY IF EXISTS order_ingredient_logs_staff_insert ON public.order_ingredient_logs;
CREATE POLICY order_ingredient_logs_staff_insert ON public.order_ingredient_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_role(ARRAY['manager', 'employee']));

-- Policies for wastage_log
DROP POLICY IF EXISTS wastage_log_staff_read ON public.wastage_log;
CREATE POLICY wastage_log_staff_read ON public.wastage_log
  FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['manager', 'employee']));

DROP POLICY IF EXISTS wastage_log_staff_insert ON public.wastage_log;
CREATE POLICY wastage_log_staff_insert ON public.wastage_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_role(ARRAY['manager', 'employee']));


-- 5. AUTOMATED TRIGGER: DEDUCT RECIPE-BASED STOCK ON ORDER COMPLETED
-- Executes when orders.status updates to 'completed' (case-insensitive)
CREATE OR REPLACE FUNCTION public.process_completed_order_ingredients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  order_item JSONB;
  prod_id TEXT;
  item_qty NUMERIC;
  size_name TEXT;
  rec RECORD;
  direct_ing JSONB;
  ing_id TEXT;
  req_qty NUMERIC;
  total_deduct NUMERIC;
  has_recipe_match BOOLEAN;
BEGIN
  -- Only execute when status transitioned to 'completed'
  IF (LOWER(COALESCE(NEW.status, '')) = 'completed') 
     AND (LOWER(COALESCE(OLD.status, '')) IS DISTINCT FROM 'completed') THEN

    FOR order_item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      prod_id := COALESCE(order_item->>'product_id', order_item->>'id');
      item_qty := GREATEST(1, COALESCE(NULLIF(order_item->>'quantity', '')::NUMERIC, 1));
      size_name := COALESCE(order_item->'size'->>'name', order_item->>'size');
      has_recipe_match := false;

      -- 1. Try relational recipe_mapping table first
      FOR rec IN 
        SELECT 
          rm.ingredient_id,
          rm.required_quantity,
          rm.unit_used
        FROM public.recipe_mapping rm
        WHERE rm.menu_item_id = prod_id
          AND (
            (size_name IS NOT NULL AND rm.size_name = size_name)
            OR (size_name IS NULL AND rm.size_name IS NULL)
            OR (rm.size_name IS NULL)
          )
      LOOP
        has_recipe_match := true;
        total_deduct := rec.required_quantity * item_qty;

        -- Log to order_ingredient_logs
        INSERT INTO public.order_ingredient_logs (
          order_id,
          menu_item_id,
          menu_item_name,
          ingredient_id,
          quantity_deducted
        ) VALUES (
          NEW.order_id,
          prod_id,
          COALESCE(order_item->>'name', 'Menu Item'),
          rec.ingredient_id,
          total_deduct
        );

        -- Deduct from ingredients stock_quantity and quantity
        UPDATE public.ingredients
        SET 
          stock_quantity = GREATEST(0, COALESCE(stock_quantity, quantity, 0) - total_deduct),
          quantity = GREATEST(0, COALESCE(quantity, 0) - CEIL(total_deduct)::INT)
        WHERE id = rec.ingredient_id;
      END LOOP;

      -- 2. If no relational recipe_mapping found, fall back to embedded product/size JSON recipe mappings
      IF NOT has_recipe_match THEN
        -- Check size-specific embedded ingredients
        IF order_item->'size'->'ingredient_ids' IS NOT NULL AND jsonb_array_length(order_item->'size'->'ingredient_ids') > 0 THEN
          FOR direct_ing IN SELECT * FROM jsonb_array_elements(order_item->'size'->'ingredient_ids')
          LOOP
            ing_id := CASE 
              WHEN jsonb_typeof(direct_ing) = 'string' THEN direct_ing #>> '{}'
              ELSE direct_ing->>'id'
            END;
            req_qty := COALESCE(NULLIF(direct_ing->>'quantity', '')::NUMERIC, NULLIF(direct_ing->>'required_quantity', '')::NUMERIC, 1);
            total_deduct := req_qty * item_qty;

            IF ing_id IS NOT NULL THEN
              INSERT INTO public.order_ingredient_logs (
                order_id,
                menu_item_id,
                menu_item_name,
                ingredient_id,
                quantity_deducted
              ) VALUES (
                NEW.order_id,
                prod_id,
                COALESCE(order_item->>'name', 'Menu Item'),
                ing_id,
                total_deduct
              );

              UPDATE public.ingredients
              SET 
                stock_quantity = GREATEST(0, COALESCE(stock_quantity, quantity, 0) - total_deduct),
                quantity = GREATEST(0, COALESCE(quantity, 0) - CEIL(total_deduct)::INT)
              WHERE id = ing_id;
            END IF;
          END LOOP;
        -- Check item-level embedded ingredients
        ELSIF order_item->'ingredient_ids' IS NOT NULL AND jsonb_array_length(order_item->'ingredient_ids') > 0 THEN
          FOR direct_ing IN SELECT * FROM jsonb_array_elements(order_item->'ingredient_ids')
          LOOP
            ing_id := CASE 
              WHEN jsonb_typeof(direct_ing) = 'string' THEN direct_ing #>> '{}'
              ELSE direct_ing->>'id'
            END;
            req_qty := COALESCE(NULLIF(direct_ing->>'quantity', '')::NUMERIC, NULLIF(direct_ing->>'required_quantity', '')::NUMERIC, 1);
            total_deduct := req_qty * item_qty;

            IF ing_id IS NOT NULL THEN
              INSERT INTO public.order_ingredient_logs (
                order_id,
                menu_item_id,
                menu_item_name,
                ingredient_id,
                quantity_deducted
              ) VALUES (
                NEW.order_id,
                prod_id,
                COALESCE(order_item->>'name', 'Menu Item'),
                ing_id,
                total_deduct
              );

              UPDATE public.ingredients
              SET 
                stock_quantity = GREATEST(0, COALESCE(stock_quantity, quantity, 0) - total_deduct),
                quantity = GREATEST(0, COALESCE(quantity, 0) - CEIL(total_deduct)::INT)
              WHERE id = ing_id;
            END IF;
          END LOOP;
        END IF;
      END IF;

    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_process_completed_order_ingredients ON public.orders;
CREATE TRIGGER trigger_process_completed_order_ingredients
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.process_completed_order_ingredients();

-- ===========================================
-- SUPPORT DECIMAL QUANTITY FOR QUICK SALE
-- ===========================================
-- This migration changes quantity columns from INTEGER to NUMERIC
-- to support decimal quantities for items sold by length/weight/volume
-- (e.g., pipes sold by meter: 1.5m, cables sold by meter: 3.2m)
-- Date: 2026-02-05

-- 1. Change sale_items.quantity from INTEGER to NUMERIC
ALTER TABLE public.sale_items 
ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2);

-- 2. Change tab_transaction_items.quantity from INTEGER to NUMERIC (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tab_transaction_items' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.tab_transaction_items ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2)';
    
    -- Remove the integer check constraint and add numeric check
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%quantity%' AND conrelid = 'public.tab_transaction_items'::regclass) THEN
      EXECUTE 'ALTER TABLE public.tab_transaction_items DROP CONSTRAINT IF EXISTS tab_transaction_items_quantity_check';
    END IF;
    EXECUTE 'ALTER TABLE public.tab_transaction_items ADD CONSTRAINT tab_transaction_items_quantity_check CHECK (quantity > 0)';
  END IF;
END
$$;

-- ===========================================
-- DONE!
-- ===========================================
-- After this migration:
-- - Quick Sale can now accept decimal quantities (e.g., 1.5, 2.3)
-- - Existing integer quantities are automatically converted (1 -> 1.00)
-- - This is useful for:
--   * Pipes sold by meter (pipa)
--   * Cables sold by meter (kabel)
--   * Fabrics sold by meter (kain)
--   * Liquids sold by liter
--   * Items sold by weight (kg)

-- =============================================
-- Multi-Unit Flexible Support
-- Adds main_unit column to products table
-- Ensures has_multi_unit, pcs_per_box, box_price exist
-- =============================================

-- Ensure all multi-unit columns exist on products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS has_multi_unit  BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS pcs_per_box     INTEGER     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS box_price       NUMERIC     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS main_unit       TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sell_by_quantity BOOLEAN    DEFAULT false,
  ADD COLUMN IF NOT EXISTS sell_unit       TEXT        DEFAULT 'pcs';

-- Index for quick multi-unit lookups
CREATE INDEX IF NOT EXISTS idx_products_has_multi_unit ON products(has_multi_unit) WHERE has_multi_unit = true;

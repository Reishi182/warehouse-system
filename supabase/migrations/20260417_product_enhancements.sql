-- =============================================
-- Product Enhancements Migration
-- Adds: categories, hpp, min_stock, max_stock
-- =============================================

-- 1. Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#6366f1',
  icon       TEXT DEFAULT 'tag',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can view categories" ON product_categories;
CREATE POLICY "All authenticated can view categories"
  ON product_categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin and main_office can manage categories" ON product_categories;
CREATE POLICY "Admin and main_office can manage categories"
  ON product_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'main_office')
    )
  );

-- 2. Add new columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id      UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hpp              NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock_gudang INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock_toko   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bulk_quantity    INTEGER,
  ADD COLUMN IF NOT EXISTS bulk_price       NUMERIC;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);

-- 4. Seed some default categories (optional, soft insert)
INSERT INTO product_categories (name, color, icon) VALUES
  ('Umum',         '#6366f1', 'package'),
  ('Makanan',      '#f59e0b', 'coffee'),
  ('Minuman',      '#3b82f6', 'droplets'),
  ('Elektronik',   '#8b5cf6', 'zap'),
  ('Alat Tulis',   '#10b981', 'pen-tool'),
  ('Tekstil',      '#ec4899', 'shirt'),
  ('Bahan Bangunan','#f97316','hammer')
ON CONFLICT DO NOTHING;

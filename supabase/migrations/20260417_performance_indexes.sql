-- ============================================================
-- MIGRATION: Performance Indexes — Warehouse System
-- Date: 2026-04-17
-- Description: Composite & FK indexes untuk query paling berat
--              berdasarkan pg_stat_statements analysis.
-- ============================================================

-- 1. PRODUCTS
-- Query: ORDER BY created_at DESC, id ASC  (46k+ calls, mean 50ms)
CREATE INDEX IF NOT EXISTS idx_products_created_at_id
  ON public.products (created_at DESC, id ASC);

-- Query: ORDER BY name ASC, id ASC  (name-based listing)
CREATE INDEX IF NOT EXISTS idx_products_name_id
  ON public.products (name ASC, id ASC);

-- 2. SALES
-- Query: ORDER BY created_at DESC  (sorting history & POS recent sales)
CREATE INDEX IF NOT EXISTS idx_sales_created_at
  ON public.sales (created_at DESC);

-- 3. SALE ITEMS — FK index (WAJIB: eliminasi full scan saat lateral JOIN)
-- Query di pg_stat: lateral JOIN sale_items per sale
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
  ON public.sale_items (sale_id);

-- 4. NOTIFICATIONS
-- Query: WHERE user_id = $1 ORDER BY created_at DESC  (19k+ calls)
-- Composite partial index — hanya non-null user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- 5. ACTIVITY LOGS
-- Query: ORDER BY created_at DESC LIMIT 100  (12k+ calls, max 1.3 detik!)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON public.activity_logs (created_at DESC);

-- 6. STOCK LOGS
-- Query: ORDER BY timestamp DESC  (lateral join + sort)
CREATE INDEX IF NOT EXISTS idx_stock_logs_timestamp
  ON public.stock_logs (timestamp DESC);

-- FK index: JOIN ke products
CREATE INDEX IF NOT EXISTS idx_stock_logs_product_id
  ON public.stock_logs (product_id);

-- ============================================================
-- VERIFIKASI: Jalankan ini setelah migrasi untuk cek index baru
-- ============================================================
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

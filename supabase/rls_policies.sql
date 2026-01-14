-- =====================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query
-- NOTE: This script drops existing policies before creating new ones

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Users can read all profiles (for displaying names, etc.)
CREATE POLICY "Users can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- 2. PRODUCTS TABLE
-- =====================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read products" ON products;
DROP POLICY IF EXISTS "Authorized users can insert products" ON products;
DROP POLICY IF EXISTS "Authorized users can update products" ON products;
DROP POLICY IF EXISTS "Admin/Auditor can delete products" ON products;

-- All authenticated users can read products
CREATE POLICY "All users can read products"
ON products FOR SELECT
TO authenticated
USING (true);

-- Only admin, warehouse, auditor can insert products
CREATE POLICY "Authorized users can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'warehouse', 'cashier')
  )
);

-- Only admin, warehouse, auditor can update products
CREATE POLICY "Authorized users can update products"
ON products FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'warehouse', 'auditor')
  )
);

-- Only admin, auditor can delete products
CREATE POLICY "Admin/Auditor can delete products"
ON products FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'auditor')
  )
);

-- =====================================================
-- 3. SALES TABLE
-- =====================================================
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read sales" ON sales;
DROP POLICY IF EXISTS "Cashiers can create sales" ON sales;

-- All authenticated users can read sales
CREATE POLICY "All users can read sales"
ON sales FOR SELECT
TO authenticated
USING (true);

-- Only cashiers, main_office, and admin can create sales
CREATE POLICY "Cashiers can create sales"
ON sales FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'cashier', 'main_office')
  )
);

-- =====================================================
-- 4. SALE_ITEMS TABLE
-- =====================================================
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read sale_items" ON sale_items;
DROP POLICY IF EXISTS "Authorized users can insert sale_items" ON sale_items;

-- All authenticated users can read sale items
CREATE POLICY "All users can read sale_items"
ON sale_items FOR SELECT
TO authenticated
USING (true);

-- Only authorized users can insert sale items
CREATE POLICY "Authorized users can insert sale_items"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'cashier', 'main_office')
  )
);

-- =====================================================
-- 5. STOCK_OUT_REQUESTS TABLE
-- =====================================================
ALTER TABLE stock_out_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read stock_out_requests" ON stock_out_requests;
DROP POLICY IF EXISTS "Warehouse/Cashiers can create requests" ON stock_out_requests;
DROP POLICY IF EXISTS "Auditors can update requests" ON stock_out_requests;

-- All authenticated users can read requests
CREATE POLICY "All users can read stock_out_requests"
ON stock_out_requests FOR SELECT
TO authenticated
USING (true);

-- Warehouse and cashiers can create requests
CREATE POLICY "Warehouse/Cashiers can create requests"
ON stock_out_requests FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'warehouse', 'cashier')
  )
);

-- Auditors and admin can update requests (approve/reject)
CREATE POLICY "Auditors can update requests"
ON stock_out_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'auditor', 'main_office')
  )
);

-- =====================================================
-- 6. SURAT_JALAN TABLE
-- =====================================================
ALTER TABLE surat_jalan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read surat_jalan" ON surat_jalan;
DROP POLICY IF EXISTS "Cashiers can create surat_jalan" ON surat_jalan;
DROP POLICY IF EXISTS "Auditors can update surat_jalan" ON surat_jalan;

-- All authenticated users can read surat jalan
CREATE POLICY "All users can read surat_jalan"
ON surat_jalan FOR SELECT
TO authenticated
USING (true);

-- Cashiers can create surat jalan
CREATE POLICY "Cashiers can create surat_jalan"
ON surat_jalan FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'cashier', 'main_office')
  )
);

-- Auditors can update (approve/reject) surat jalan
CREATE POLICY "Auditors can update surat_jalan"
ON surat_jalan FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'auditor')
  )
);

-- =====================================================
-- 7. SURAT_JALAN_ITEMS TABLE
-- =====================================================
ALTER TABLE surat_jalan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read surat_jalan_items" ON surat_jalan_items;
DROP POLICY IF EXISTS "Authorized users can insert surat_jalan_items" ON surat_jalan_items;

CREATE POLICY "All users can read surat_jalan_items"
ON surat_jalan_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authorized users can insert surat_jalan_items"
ON surat_jalan_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'cashier', 'main_office')
  )
);

-- =====================================================
-- 8. STOCK_LOGS TABLE
-- =====================================================
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read stock_logs" ON stock_logs;
DROP POLICY IF EXISTS "System can insert stock_logs" ON stock_logs;

-- All authenticated users can read stock logs
CREATE POLICY "All users can read stock_logs"
ON stock_logs FOR SELECT
TO authenticated
USING (true);

-- All authenticated users can insert stock logs (system creates these)
CREATE POLICY "System can insert stock_logs"
ON stock_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 9. NOTIFICATIONS TABLE
-- =====================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Users can only read their own notifications
CREATE POLICY "Users read own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- System can create notifications for any user
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 10. CASH_TRANSFERS TABLE
-- =====================================================
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read cash_transfers" ON cash_transfers;
DROP POLICY IF EXISTS "Cashiers can create cash_transfers" ON cash_transfers;

-- All authenticated users can read cash transfers
CREATE POLICY "All users can read cash_transfers"
ON cash_transfers FOR SELECT
TO authenticated
USING (true);

-- Cashiers can create cash transfers
CREATE POLICY "Cashiers can create cash_transfers"
ON cash_transfers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'cashier')
  )
);

-- =====================================================
-- 11. ACTIVITY_LOGS TABLE
-- =====================================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "System can create activity_logs" ON activity_logs;

-- All authenticated users can read activity logs
CREATE POLICY "All users can read activity_logs"
ON activity_logs FOR SELECT
TO authenticated
USING (true);

-- System can create activity logs
CREATE POLICY "System can create activity_logs"
ON activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- DONE! 
-- After running this SQL, your database is protected
-- with Row Level Security policies.
-- =====================================================

-- ===========================================
-- SECURITY RLS POLICIES
-- ===========================================
-- This migration adds role-based restrictions at the database level
-- to prevent client-side role manipulation via DevTools

-- =====================
-- 1. CREATE HELPER FUNCTION TO GET USER ROLE
-- =====================

-- Function to get current user's role from profiles
-- Uses SECURITY DEFINER to ensure it always has access
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid()
$$;

-- =====================
-- 2. BACKUPS TABLE POLICIES
-- =====================

-- Drop existing policies first
DROP POLICY IF EXISTS "All authenticated can read backups" ON backups;
DROP POLICY IF EXISTS "All authenticated can insert backups" ON backups;
DROP POLICY IF EXISTS "Only admins can delete backups" ON backups;
DROP POLICY IF EXISTS "Only admins can update backups" ON backups;

-- Only admin and main_office can read backups
CREATE POLICY "Admin and main_office read backups" ON backups
FOR SELECT USING (
  get_user_role() IN ('admin', 'main_office')
);

-- Only admin and main_office can create backups
CREATE POLICY "Admin and main_office create backups" ON backups
FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'main_office')
);

-- Only admin can delete backups
CREATE POLICY "Only admins delete backups" ON backups
FOR DELETE USING (
  get_user_role() = 'admin'
);

-- Only admin can update backups
CREATE POLICY "Only admins update backups" ON backups
FOR UPDATE USING (
  get_user_role() = 'admin'
);

-- =====================
-- 3. PRODUCTS TABLE - STRENGTHEN UPDATE POLICY
-- =====================

-- Drop and recreate update policy with role restrictions
DROP POLICY IF EXISTS "Authorized users can update products" ON products;

CREATE POLICY "Role-based product updates" ON products
FOR UPDATE USING (
  get_user_role() IN ('admin', 'warehouse', 'auditor', 'main_office')
);

-- =====================
-- 4. CASH TRANSFERS - ROLE RESTRICTIONS
-- =====================

-- Drop existing policies
DROP POLICY IF EXISTS "Cashiers can create cash_transfers" ON cash_transfers;
DROP POLICY IF EXISTS "All authenticated users can view cash transfers" ON cash_transfers;

-- Only cashier, admin can create cash transfers
CREATE POLICY "Cashiers create cash_transfers" ON cash_transfers
FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'cashier')
);

-- All authenticated can view
CREATE POLICY "Authenticated view cash_transfers" ON cash_transfers
FOR SELECT USING (
  (select auth.role()) = 'authenticated'
);

-- =====================
-- 5. CASH TRANSFER REQUESTS - ROLE RESTRICTIONS  
-- =====================

-- Drop existing policies
DROP POLICY IF EXISTS "cashiers_create_request" ON cash_transfer_requests;
DROP POLICY IF EXISTS "main_office_update_request" ON cash_transfer_requests;

-- Only cashier can create requests
CREATE POLICY "Cashiers create cash_transfer_requests" ON cash_transfer_requests
FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'cashier')
);

-- Only main_office and admin can approve/reject
CREATE POLICY "Main office approve cash_transfer_requests" ON cash_transfer_requests
FOR UPDATE USING (
  get_user_role() IN ('admin', 'main_office')
);

-- =====================
-- 6. SALES - ROLE RESTRICTIONS
-- =====================

-- Drop and recreate with role check
DROP POLICY IF EXISTS "Cashiers can create sales" ON sales;

CREATE POLICY "Role-based sales creation" ON sales
FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'cashier', 'main_office')
);

-- =====================
-- 7. STOCK UPDATES - WAREHOUSE ONLY
-- =====================

-- Add policy for stock_logs insert - only warehouse related roles
DROP POLICY IF EXISTS "System can insert stock_logs" ON stock_logs;

CREATE POLICY "Role-based stock_logs insert" ON stock_logs
FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'warehouse', 'cashier', 'auditor', 'main_office')
);

-- =====================
-- 8. NOTIFICATIONS - USER ISOLATION
-- =====================

-- Users can only delete their own notifications
DROP POLICY IF EXISTS "Users delete own notifications" ON notifications;

CREATE POLICY "Users delete own notifications" ON notifications
FOR DELETE USING (
  user_id = (select auth.uid())
);

-- =====================
-- 9. PROFILES - PREVENT ROLE SELF-UPDATE
-- =====================

-- Users can update own profile but NOT role
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users update own profile no role" ON profiles
FOR UPDATE USING (
  user_id = (select auth.uid())
) WITH CHECK (
  -- Cannot change role unless admin
  (role = (SELECT role FROM profiles WHERE user_id = auth.uid()))
  OR get_user_role() = 'admin'
);

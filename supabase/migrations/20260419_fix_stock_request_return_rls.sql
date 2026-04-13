-- =====================================================
-- FIX: Add UPDATE RLS policies for stock_requests & stock_returns
-- This allows cashiers to cancel their own pending requests/returns
-- =====================================================

-- =====================================================
-- STOCK_REQUESTS TABLE
-- =====================================================
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
DROP POLICY IF EXISTS "All users can read stock_requests" ON stock_requests;
CREATE POLICY "All users can read stock_requests"
ON stock_requests FOR SELECT
TO authenticated
USING (true);

-- Allow cashiers and admin to create
DROP POLICY IF EXISTS "Cashiers can create stock_requests" ON stock_requests;
CREATE POLICY "Cashiers can create stock_requests"
ON stock_requests FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'cashier')
  )
);

-- Allow updating by: cashier (own requests), warehouse, main_office, admin
DROP POLICY IF EXISTS "Authorized users can update stock_requests" ON stock_requests;
CREATE POLICY "Authorized users can update stock_requests"
ON stock_requests FOR UPDATE
TO authenticated
USING (
  -- Cashier can update their own requests (for cancel/resubmit)
  cashier_id = auth.uid()
  OR
  -- Warehouse, main_office, admin can update any request
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'warehouse', 'main_office')
  )
);

-- =====================================================
-- STOCK_REQUEST_ITEMS TABLE
-- =====================================================
ALTER TABLE stock_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read stock_request_items" ON stock_request_items;
CREATE POLICY "All users can read stock_request_items"
ON stock_request_items FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authorized users can insert stock_request_items" ON stock_request_items;
CREATE POLICY "Authorized users can insert stock_request_items"
ON stock_request_items FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authorized users can delete stock_request_items" ON stock_request_items;
CREATE POLICY "Authorized users can delete stock_request_items"
ON stock_request_items FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- STOCK_RETURNS TABLE
-- =====================================================
ALTER TABLE stock_returns ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
DROP POLICY IF EXISTS "All users can read stock_returns" ON stock_returns;
CREATE POLICY "All users can read stock_returns"
ON stock_returns FOR SELECT
TO authenticated
USING (true);

-- Allow cashiers and admin to create
DROP POLICY IF EXISTS "Cashiers can create stock_returns" ON stock_returns;
CREATE POLICY "Cashiers can create stock_returns"
ON stock_returns FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'cashier')
  )
);

-- Allow updating by: cashier (own returns), warehouse, main_office, admin
DROP POLICY IF EXISTS "Authorized users can update stock_returns" ON stock_returns;
CREATE POLICY "Authorized users can update stock_returns"
ON stock_returns FOR UPDATE
TO authenticated
USING (
  -- Cashier can update their own returns (for cancel)
  cashier_id = auth.uid()
  OR
  -- Warehouse, main_office, admin can update any return
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'warehouse', 'main_office')
  )
);

-- =====================================================
-- STOCK_RETURN_ITEMS TABLE
-- =====================================================
ALTER TABLE stock_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can read stock_return_items" ON stock_return_items;
CREATE POLICY "All users can read stock_return_items"
ON stock_return_items FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authorized users can insert stock_return_items" ON stock_return_items;
CREATE POLICY "Authorized users can insert stock_return_items"
ON stock_return_items FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authorized users can delete stock_return_items" ON stock_return_items;
CREATE POLICY "Authorized users can delete stock_return_items"
ON stock_return_items FOR DELETE
TO authenticated
USING (true);

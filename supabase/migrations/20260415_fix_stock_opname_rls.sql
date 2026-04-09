-- Fix Stock Opname RLS Policies

-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Warehouse and cashier can create sessions" ON stock_opname_sessions;
DROP POLICY IF EXISTS "Creator can add items to draft sessions" ON stock_opname_items;

-- Recreate policy to allow ANY authenticated user to create their opname sessions
DROP POLICY IF EXISTS "Users can create sessions" ON stock_opname_sessions;
CREATE POLICY "Users can create sessions"
  ON stock_opname_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

-- Recreate item insertion policy. 
-- In practice, the frontend inserts the session directly as 'pending_approval' then inserts items in a batch.
-- So we must allow item inserts for pending_approval sessions created by the user within the same transaction/request.
DROP POLICY IF EXISTS "Creator can add items to their own sessions" ON stock_opname_items;
CREATE POLICY "Creator can add items to their own sessions"
  ON stock_opname_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stock_opname_sessions
      WHERE id = session_id
      AND created_by = auth.uid()
    )
  );

-- Update check constraint on stock_opname_sessions to allow 'both'
ALTER TABLE stock_opname_sessions DROP CONSTRAINT IF EXISTS stock_opname_sessions_location_check;
ALTER TABLE stock_opname_sessions ADD CONSTRAINT stock_opname_sessions_location_check CHECK (location IN ('gudang', 'toko', 'both'));

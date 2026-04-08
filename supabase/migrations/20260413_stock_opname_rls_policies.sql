-- =============================================
-- Stock Opname Row Level Security (RLS) Policies
-- Creates RLS policies for stock_opname_sessions and stock_opname_items tables
-- Validates Requirements 17.1, 17.2, 17.3, 17.4
-- =============================================

-- Enable RLS on stock_opname_sessions table
ALTER TABLE stock_opname_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on stock_opname_items table
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STOCK_OPNAME_SESSIONS POLICIES
-- =============================================

-- Policy: Users can view own sessions or all if office/admin
-- Requirement 17.1: Appropriate access control for viewing sessions
CREATE POLICY "Users can view own sessions or all if office/admin"
  ON stock_opname_sessions FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('main_office', 'admin', 'auditor')
    )
  );

-- Policy: Only warehouse/cashier can create sessions
-- Requirement 17.2: Only authorized roles can create stock opname sessions
CREATE POLICY "Warehouse and cashier can create sessions"
  ON stock_opname_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('warehouse', 'cashier', 'admin')
    )
  );

-- Policy: Only creator can update draft sessions
-- Requirement 17.3: Only session creator can modify draft sessions
CREATE POLICY "Creator can update draft sessions"
  ON stock_opname_sessions FOR UPDATE
  USING (
    created_by = auth.uid() AND status = 'draft'
  )
  WITH CHECK (
    created_by = auth.uid() AND status = 'draft'
  );

-- Policy: Office can update sessions for approval/rejection
-- Requirement 17.2: Office role can approve or reject sessions
CREATE POLICY "Office can update sessions for approval"
  ON stock_opname_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('main_office', 'admin')
    )
    AND status IN ('pending_approval', 'approved')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('main_office', 'admin')
    )
  );

-- =============================================
-- STOCK_OPNAME_ITEMS POLICIES
-- =============================================

-- Policy: Users can view items of accessible sessions
-- Requirement 17.4: Items inherit session permissions
CREATE POLICY "Users can view items of accessible sessions"
  ON stock_opname_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stock_opname_sessions
      WHERE id = session_id
      AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('main_office', 'admin', 'auditor')
        )
      )
    )
  );

-- Policy: Only creator can insert items to draft sessions
-- Requirement 17.4: Only session creator can add items to draft sessions
CREATE POLICY "Creator can add items to draft sessions"
  ON stock_opname_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stock_opname_sessions
      WHERE id = session_id
      AND created_by = auth.uid()
      AND status = 'draft'
    )
  );

-- Policy: Only creator can update items in draft sessions
-- Requirement 17.4: Only session creator can modify items in draft sessions
CREATE POLICY "Creator can update items in draft sessions"
  ON stock_opname_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stock_opname_sessions
      WHERE id = session_id
      AND created_by = auth.uid()
      AND status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stock_opname_sessions
      WHERE id = session_id
      AND created_by = auth.uid()
      AND status = 'draft'
    )
  );

-- Policy: Only creator can delete items from draft sessions
-- Requirement 17.4: Only session creator can remove items from draft sessions
CREATE POLICY "Creator can delete items from draft sessions"
  ON stock_opname_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stock_opname_sessions
      WHERE id = session_id
      AND created_by = auth.uid()
      AND status = 'draft'
    )
  );

-- Policy: Office can update items for approval
-- Requirement 17.2: Office role can approve individual items
CREATE POLICY "Office can update items for approval"
  ON stock_opname_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('main_office', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM stock_opname_sessions
      WHERE id = session_id
      AND status IN ('pending_approval', 'approved')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('main_office', 'admin')
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view own sessions or all if office/admin" ON stock_opname_sessions IS 
  'Allows users to view their own sessions, while office/admin/auditor can view all sessions';

COMMENT ON POLICY "Warehouse and cashier can create sessions" ON stock_opname_sessions IS 
  'Restricts session creation to warehouse, cashier, and admin roles only';

COMMENT ON POLICY "Creator can update draft sessions" ON stock_opname_sessions IS 
  'Allows session creator to update only their own draft sessions';

COMMENT ON POLICY "Office can update sessions for approval" ON stock_opname_sessions IS 
  'Allows office and admin roles to update sessions for approval/rejection workflow';

COMMENT ON POLICY "Users can view items of accessible sessions" ON stock_opname_items IS 
  'Items inherit view permissions from their parent session';

COMMENT ON POLICY "Creator can add items to draft sessions" ON stock_opname_items IS 
  'Restricts item insertion to session creator and only for draft sessions';

COMMENT ON POLICY "Creator can update items in draft sessions" ON stock_opname_items IS 
  'Allows session creator to update items only in draft sessions';

COMMENT ON POLICY "Creator can delete items from draft sessions" ON stock_opname_items IS 
  'Allows session creator to delete items only from draft sessions';

COMMENT ON POLICY "Office can update items for approval" ON stock_opname_items IS 
  'Allows office and admin roles to update items for approval workflow';

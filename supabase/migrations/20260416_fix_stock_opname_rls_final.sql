-- Menjatuhkan (Drop) semua policy lama yang error karena salah kolom id vs user_id
DROP POLICY IF EXISTS "Users can view own sessions or all if office/admin" ON stock_opname_sessions;
DROP POLICY IF EXISTS "Warehouse and cashier can create sessions" ON stock_opname_sessions;
DROP POLICY IF EXISTS "Creator can update draft sessions" ON stock_opname_sessions;
DROP POLICY IF EXISTS "Office can update sessions for approval" ON stock_opname_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON stock_opname_sessions;

DROP POLICY IF EXISTS "Users can view items of accessible sessions" ON stock_opname_items;
DROP POLICY IF EXISTS "Creator can add items to draft sessions" ON stock_opname_items;
DROP POLICY IF EXISTS "Creator can add items to their own sessions" ON stock_opname_items;
DROP POLICY IF EXISTS "Creator can update items in draft sessions" ON stock_opname_items;
DROP POLICY IF EXISTS "Creator can delete items from draft sessions" ON stock_opname_items;
DROP POLICY IF EXISTS "Office can update items for approval" ON stock_opname_items;

-- 1. SESSIONS POLICIES

CREATE POLICY "Users can view own sessions or all if office/admin"
  ON stock_opname_sessions FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('main_office', 'admin', 'auditor')
    )
  );

CREATE POLICY "Users can create sessions"
  ON stock_opname_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "Creator can update draft sessions"
  ON stock_opname_sessions FOR UPDATE
  USING (
    created_by = auth.uid() AND status = 'draft'
  )
  WITH CHECK (
    created_by = auth.uid() AND status = 'draft'
  );

CREATE POLICY "Office can update sessions for approval"
  ON stock_opname_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('main_office', 'admin')
    )
    AND status IN ('pending_approval', 'approved')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('main_office', 'admin')
    )
  );

-- 2. ITEMS POLICIES

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
          WHERE user_id = auth.uid()
          AND role IN ('main_office', 'admin', 'auditor')
        )
      )
    )
  );

CREATE POLICY "Creator can add items to their own sessions"
  ON stock_opname_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stock_opname_sessions
      WHERE id = session_id
      AND created_by = auth.uid()
    )
  );

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

CREATE POLICY "Office can update items for approval"
  ON stock_opname_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
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
      WHERE user_id = auth.uid()
      AND role IN ('main_office', 'admin')
    )
  );

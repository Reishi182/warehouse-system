-- =============================================
-- Stock Opname Items Table
-- Creates table for individual product items within stock opname sessions
-- Validates Requirements 2.1, 2.2, 3.1
-- =============================================

-- Create stock_opname_items table
CREATE TABLE IF NOT EXISTS stock_opname_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES stock_opname_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  
  -- Stock data (snapshot at time of creation)
  system_stock DECIMAL(10,2) NOT NULL,
  actual_stock DECIMAL(10,2) NOT NULL,
  difference DECIMAL(10,2) NOT NULL, -- actual_stock - system_stock
  
  -- Multi-unit tracking
  unit_used TEXT, -- Which unit was used for counting (main_unit or sell_unit)
  main_unit_count DECIMAL(10,2), -- Count in main_unit (if applicable)
  sub_unit_count DECIMAL(10,2), -- Count in sell_unit
  
  -- Additional info
  note TEXT,
  
  -- Approval status per item
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique product per session
  UNIQUE(session_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_session ON stock_opname_items(session_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_product ON stock_opname_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_status ON stock_opname_items(status);

-- Add comments for documentation
COMMENT ON TABLE stock_opname_items IS 'Individual product items within stock opname sessions for tracking physical counts and discrepancies';
COMMENT ON COLUMN stock_opname_items.session_id IS 'Reference to parent stock opname session (CASCADE delete)';
COMMENT ON COLUMN stock_opname_items.product_id IS 'Reference to product being counted';
COMMENT ON COLUMN stock_opname_items.system_stock IS 'Stock quantity in system at time of counting';
COMMENT ON COLUMN stock_opname_items.actual_stock IS 'Physical stock quantity counted';
COMMENT ON COLUMN stock_opname_items.difference IS 'Calculated difference: actual_stock - system_stock';
COMMENT ON COLUMN stock_opname_items.unit_used IS 'Unit used for counting (main_unit or sell_unit)';
COMMENT ON COLUMN stock_opname_items.main_unit_count IS 'Count in main unit (e.g., boxes, sacks)';
COMMENT ON COLUMN stock_opname_items.sub_unit_count IS 'Count in sub/sell unit (e.g., pieces, kg)';
COMMENT ON COLUMN stock_opname_items.status IS 'Approval status: pending, approved, or rejected';

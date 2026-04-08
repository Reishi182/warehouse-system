-- =============================================
-- Stock Opname Sessions Table
-- Creates table for session-based stock opname workflow
-- Validates Requirements 1.1, 1.2
-- =============================================

-- Create stock_opname_sessions table
CREATE TABLE IF NOT EXISTS stock_opname_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number TEXT UNIQUE NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('gudang', 'toko')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'completed')),
  
  -- User tracking
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT NOT NULL,
  
  -- Approval tracking
  approved_by UUID REFERENCES auth.users(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_opname_sessions_status ON stock_opname_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stock_opname_sessions_location ON stock_opname_sessions(location);
CREATE INDEX IF NOT EXISTS idx_stock_opname_sessions_created_by ON stock_opname_sessions(created_by);

-- Add comment for documentation
COMMENT ON TABLE stock_opname_sessions IS 'Session-based stock opname workflow for physical stock counting and reconciliation';
COMMENT ON COLUMN stock_opname_sessions.session_number IS 'Unique session identifier in format SO-YYYYMMDD-XXXX';
COMMENT ON COLUMN stock_opname_sessions.location IS 'Stock location: gudang (warehouse) or toko (store)';
COMMENT ON COLUMN stock_opname_sessions.status IS 'Session status: draft, pending_approval, approved, rejected, or completed';

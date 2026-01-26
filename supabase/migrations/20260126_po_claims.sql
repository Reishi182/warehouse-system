-- PO Claims table for tracking supplier claims on discrepancies
CREATE TABLE IF NOT EXISTS po_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT UNIQUE NOT NULL,
  po_receipt_id UUID REFERENCES po_receipts(id),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  supplier_id UUID REFERENCES suppliers(id),
  claim_type TEXT NOT NULL CHECK (claim_type IN ('shortage', 'damaged', 'mixed')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  total_claimed_amount DECIMAL(12,2) DEFAULT 0,
  claimed_items JSONB, -- [{product_name, qty_ordered, qty_received, qty_damaged, unit_price}]
  evidence_urls TEXT[], -- photos
  resolution_notes TEXT,
  resolution_type TEXT, -- 'refund', 'replacement', 'credit', 'rejected'
  created_by UUID,
  created_by_name TEXT,
  resolved_by UUID,
  resolved_by_name TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_po_claims_status ON po_claims(status);
CREATE INDEX IF NOT EXISTS idx_po_claims_po_id ON po_claims(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_claims_supplier ON po_claims(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_claims_created ON po_claims(created_at DESC);

-- Function to generate claim number
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(claim_number FROM 'CLM-' || v_date || '-(\d+)') AS INTEGER)
  ), 0) + 1 INTO v_seq
  FROM po_claims
  WHERE claim_number LIKE 'CLM-' || v_date || '-%';
  
  v_number := 'CLM-' || v_date || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Add has_claim column to purchase_orders for quick filtering
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS has_claim BOOLEAN DEFAULT FALSE;

-- Update po_receipts to add discrepancy_details if not exists
ALTER TABLE po_receipts
ADD COLUMN IF NOT EXISTS discrepancy_details JSONB;

-- Enable realtime for po_claims
ALTER PUBLICATION supabase_realtime ADD TABLE po_claims;

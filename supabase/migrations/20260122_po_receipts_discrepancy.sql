-- Add discrepancy tracking columns to po_receipts table (Purchase Order from Supplier)
ALTER TABLE po_receipts 
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS has_discrepancy BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discrepancy_details JSONB,
ADD COLUMN IF NOT EXISTS total_ordered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_received INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_damaged INTEGER DEFAULT 0;

-- Index for discrepancy tracking
CREATE INDEX IF NOT EXISTS idx_po_receipts_discrepancy ON po_receipts(has_discrepancy) WHERE has_discrepancy = TRUE;

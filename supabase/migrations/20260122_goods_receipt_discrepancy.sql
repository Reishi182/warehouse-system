-- Add discrepancy tracking columns to goods_receipts table
ALTER TABLE goods_receipts 
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS has_discrepancy BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discrepancy_details JSONB,
ADD COLUMN IF NOT EXISTS total_shipped INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_received INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_damaged INTEGER DEFAULT 0;

-- Add 'completed_with_discrepancy' to stock_requests status enum if using enum
-- If using TEXT, this is not needed. Most likely TEXT is used.

-- Index for discrepancy tracking
CREATE INDEX IF NOT EXISTS idx_goods_receipts_discrepancy ON goods_receipts(has_discrepancy) WHERE has_discrepancy = TRUE;

-- Optional: Create view for discrepancy reports
CREATE OR REPLACE VIEW stock_receipt_discrepancies AS
SELECT 
    gr.id,
    gr.receipt_number,
    gr.created_at,
    sr.request_number,
    p.name as receiver_name,
    gr.total_shipped,
    gr.total_received,
    gr.total_damaged,
    gr.discrepancy_details,
    gr.photo_url,
    gr.signature_url
FROM goods_receipts gr
JOIN stock_requests sr ON gr.stock_request_id = sr.id
LEFT JOIN profiles p ON gr.received_by = p.user_id
WHERE gr.has_discrepancy = TRUE
ORDER BY gr.created_at DESC;

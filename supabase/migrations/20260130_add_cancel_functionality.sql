-- ===========================================
-- ADD CANCEL FUNCTIONALITY TO PO AND SJ
-- ===========================================

-- 1. Add cancelled status to purchase_orders check constraint
-- First, drop the existing constraint
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

-- Add new constraint with cancelled status
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check 
    CHECK (status IN ('pending_auditor', 'approved', 'rejected', 'pending_receipt', 'completed', 'completed_with_discrepancy', 'cancelled'));

-- 2. Add cancel-related columns to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cancelled_by UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cancelled_by_name TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- 3. Add cancelled status to surat_jalan check constraint (if exists)
-- Note: surat_jalan might not have a status check constraint, but we add it for safety
ALTER TABLE surat_jalan DROP CONSTRAINT IF EXISTS surat_jalan_status_check;

-- Add new constraint with cancelled status
ALTER TABLE surat_jalan ADD CONSTRAINT surat_jalan_status_check 
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'processing', 'completed', 'cancelled'));

-- 4. Add cancel-related columns to surat_jalan
ALTER TABLE surat_jalan ADD COLUMN IF NOT EXISTS cancelled_by UUID;
ALTER TABLE surat_jalan ADD COLUMN IF NOT EXISTS cancelled_by_name TEXT;
ALTER TABLE surat_jalan ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE surat_jalan ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- 5. Create index for cancelled status (for filtering)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_cancelled ON purchase_orders(status) WHERE status = 'cancelled';
CREATE INDEX IF NOT EXISTS idx_surat_jalan_cancelled ON surat_jalan(status) WHERE status = 'cancelled';

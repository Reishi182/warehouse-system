-- Fix purchase_orders status check constraint
-- The current constraint is missing 'completed_with_discrepancy' status

-- Drop the existing constraint
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

-- Add the updated constraint with all valid statuses
ALTER TABLE purchase_orders 
ADD CONSTRAINT purchase_orders_status_check 
CHECK (status IN ('pending_auditor', 'approved', 'rejected', 'pending_receipt', 'completed', 'completed_with_discrepancy'));

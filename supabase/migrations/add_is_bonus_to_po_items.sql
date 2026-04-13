-- Add is_bonus column to purchase_order_items
-- This column marks items that are given as a bonus by the supplier (price = 0, not counted in total)
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN purchase_order_items.is_bonus IS 'If true, item is a bonus from supplier (price = 0, not counted in total amount)';

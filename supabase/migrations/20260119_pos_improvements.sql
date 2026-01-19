-- POS Improvements: Add discount and payment tracking columns

-- Add discount column to sale_items (percentage discount per item)
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount INTEGER DEFAULT 0;

-- Add order-level discount and payment tracking to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_discount INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid BIGINT DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount BIGINT DEFAULT 0;

-- Add exchange tracking and is_cancelled columns to sales table
-- Run this migration in Supabase SQL Editor

-- Add exchange tracking columns
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS is_exchanged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS exchanged_to_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS exchanged_to_sale_number TEXT,
ADD COLUMN IF NOT EXISTS exchange_from_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS exchange_from_sale_number TEXT;

-- Add is_cancelled column (separate from the [CANCELLED] prefix hack)
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Index for quick lookup of exchanged/cancelled sales
CREATE INDEX IF NOT EXISTS idx_sales_is_exchanged ON sales(is_exchanged) WHERE is_exchanged = TRUE;
CREATE INDEX IF NOT EXISTS idx_sales_is_cancelled ON sales(is_cancelled) WHERE is_cancelled = TRUE;

-- Migrate existing cancelled sales (those with [CANCELLED] prefix) to use new column
UPDATE sales
SET is_cancelled = TRUE,
    cancelled_at = created_at
WHERE cashier_name LIKE '[CANCELLED]%' AND is_cancelled = FALSE;

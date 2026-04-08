-- Add audit and context fields to stock_logs
ALTER TABLE stock_logs ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE stock_logs ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE stock_logs ADD COLUMN IF NOT EXISTS stock_before NUMERIC;
ALTER TABLE stock_logs ADD COLUMN IF NOT EXISTS stock_after NUMERIC;

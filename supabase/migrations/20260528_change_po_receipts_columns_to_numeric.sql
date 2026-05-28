-- Migration: Change PO receipts and stock log quantity columns to NUMERIC to support decimals
ALTER TABLE po_receipts ALTER COLUMN total_ordered TYPE NUMERIC;
ALTER TABLE po_receipts ALTER COLUMN total_received TYPE NUMERIC;
ALTER TABLE po_receipts ALTER COLUMN total_damaged TYPE NUMERIC;

-- Also ensure stock logs quantity column supports decimals
ALTER TABLE stock_logs ALTER COLUMN quantity TYPE NUMERIC;

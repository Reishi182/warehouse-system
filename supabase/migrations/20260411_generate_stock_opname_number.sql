-- =============================================
-- Generate Stock Opname Number RPC Function
-- Creates function to generate unique session numbers in format SO-YYYYMMDD-XXXX
-- Validates Requirements 1.1
-- =============================================

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS generate_stock_opname_number();

-- Create function to generate stock opname session numbers
CREATE OR REPLACE FUNCTION generate_stock_opname_number()
RETURNS TEXT AS $$
DECLARE
  today TEXT;
  seq INT;
  result TEXT;
BEGIN
  -- Get current date in YYYYMMDD format
  today := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Find the highest sequence number for today and increment
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(session_number FROM 'SO-[0-9]{8}-([0-9]{4})') AS INT)
  ), 0) + 1
  INTO seq
  FROM stock_opname_sessions
  WHERE session_number LIKE 'SO-' || today || '-%';
  
  -- Format result as SO-YYYYMMDD-XXXX
  result := 'SO-' || today || '-' || LPAD(seq::TEXT, 4, '0');
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION generate_stock_opname_number() IS 'Generates unique stock opname session number in format SO-YYYYMMDD-XXXX with date-based sequence';

-- Migration: Change PO receipts and stock log quantity columns to NUMERIC to support decimals
ALTER TABLE po_receipts ALTER COLUMN total_ordered TYPE NUMERIC;
ALTER TABLE po_receipts ALTER COLUMN total_received TYPE NUMERIC;
ALTER TABLE po_receipts ALTER COLUMN total_damaged TYPE NUMERIC;

-- Also ensure stock logs quantity column supports decimals
ALTER TABLE stock_logs ALTER COLUMN quantity TYPE NUMERIC;

-- Drop old function signatures (accepting INTEGER)
DROP FUNCTION IF EXISTS public.atomic_increment_stock(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.atomic_decrement_stock(UUID, INTEGER, TEXT);

-- Recreate functions with NUMERIC parameter to support decimal stock adjustments
CREATE OR REPLACE FUNCTION public.atomic_increment_stock(
    p_product_id UUID,
    p_quantity NUMERIC,
    p_location TEXT
)
RETURNS VOID AS $$
BEGIN
    IF p_location = 'gudang' THEN
        UPDATE public.products 
        SET stock_gudang = COALESCE(stock_gudang, 0) + p_quantity 
        WHERE id = p_product_id;
    ELSIF p_location = 'toko' THEN
        UPDATE public.products 
        SET stock_toko = COALESCE(stock_toko, 0) + p_quantity 
        WHERE id = p_product_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.atomic_decrement_stock(
    p_product_id UUID,
    p_quantity NUMERIC,
    p_location TEXT
)
RETURNS VOID AS $$
BEGIN
    IF p_location = 'gudang' THEN
        UPDATE public.products 
        SET stock_gudang = COALESCE(stock_gudang, 0) - p_quantity 
        WHERE id = p_product_id;
    ELSIF p_location = 'toko' THEN
        UPDATE public.products 
        SET stock_toko = COALESCE(stock_toko, 0) - p_quantity 
        WHERE id = p_product_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

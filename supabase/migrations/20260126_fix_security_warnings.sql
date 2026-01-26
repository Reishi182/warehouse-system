-- ===========================================
-- FIX SUPABASE LINTER WARNINGS
-- ===========================================

-- 1. Fix Function Search Path Warnings
-- =====================================

-- Fix generate_po_number
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    current_date_str TEXT;
    seq_num INTEGER;
    new_po_number TEXT;
BEGIN
    current_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 12) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || current_date_str || '-%';
    
    new_po_number := 'PO-' || current_date_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    
    RETURN new_po_number;
END;
$$;

-- Fix get_next_document_number
CREATE OR REPLACE FUNCTION public.get_next_document_number(doc_type TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    current_date_str TEXT;
    seq_num INTEGER;
    new_number TEXT;
    prefix TEXT;
BEGIN
    current_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Set prefix based on document type
    CASE doc_type
        WHEN 'TRX' THEN prefix := 'TRX';
        WHEN 'SJ' THEN prefix := 'SJ';
        WHEN 'INV' THEN prefix := 'INV';
        WHEN 'SR' THEN prefix := 'SR';
        WHEN 'EXC' THEN prefix := 'EXC';
        WHEN 'RET' THEN prefix := 'RET';
        ELSE prefix := doc_type;
    END CASE;
    
    -- Get next sequence number from document_sequences table if exists
    -- Otherwise generate from pattern
    new_number := prefix || '-' || current_date_str || '-' || LPAD((FLOOR(RANDOM() * 9999) + 1)::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$;

-- Fix handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix commit_stock_issue (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'commit_stock_issue') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.commit_stock_issue(
            gin_id UUID,
            user_id UUID,
            user_name TEXT
        )
        RETURNS VOID 
        LANGUAGE plpgsql
        SET search_path = public
        AS $func$
        BEGIN
            -- Update status
            UPDATE goods_issue_notes
            SET status = ''completed'',
                completed_by = user_id,
                completed_by_name = user_name,
                completed_at = NOW()
            WHERE id = gin_id;
        END;
        $func$';
    END IF;
END
$$;

-- Fix reserve_stock (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reserve_stock') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.reserve_stock(
            p_product_id UUID,
            p_quantity INTEGER,
            p_location TEXT
        )
        RETURNS BOOLEAN 
        LANGUAGE plpgsql
        SET search_path = public
        AS $func$
        DECLARE
            current_stock INTEGER;
            stock_column TEXT;
        BEGIN
            stock_column := CASE WHEN p_location = ''gudang'' THEN ''stock_gudang'' ELSE ''stock_toko'' END;
            
            EXECUTE format(''SELECT %I FROM products WHERE id = $1'', stock_column)
            INTO current_stock
            USING p_product_id;
            
            IF current_stock >= p_quantity THEN
                EXECUTE format(''UPDATE products SET %I = %I - $1 WHERE id = $2'', stock_column, stock_column)
                USING p_quantity, p_product_id;
                RETURN TRUE;
            END IF;
            
            RETURN FALSE;
        END;
        $func$';
    END IF;
END
$$;

-- Fix release_stock_reservation (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'release_stock_reservation') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.release_stock_reservation(
            p_product_id UUID,
            p_quantity INTEGER,
            p_location TEXT
        )
        RETURNS VOID 
        LANGUAGE plpgsql
        SET search_path = public
        AS $func$
        DECLARE
            stock_column TEXT;
        BEGIN
            stock_column := CASE WHEN p_location = ''gudang'' THEN ''stock_gudang'' ELSE ''stock_toko'' END;
            
            EXECUTE format(''UPDATE products SET %I = %I + $1 WHERE id = $2'', stock_column, stock_column)
            USING p_quantity, p_product_id;
        END;
        $func$';
    END IF;
END
$$;

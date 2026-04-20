-- Fix PO number generation to use MAX sequence instead of COUNT(*)
-- This prevents unique constraint violations when a PO is cancelled or deleted.

CREATE OR REPLACE FUNCTION generate_po_number(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_date_str TEXT;
    v_max_seq INT;
    v_next_seq TEXT;
    v_lock_key BIGINT;
BEGIN
    -- Create a unique lock key from the date (YYYYMMDD as integer)
    v_lock_key := (EXTRACT(YEAR FROM p_date) * 10000 +
                   EXTRACT(MONTH FROM p_date) * 100 +
                   EXTRACT(DAY FROM p_date))::BIGINT;

    -- Acquire transaction-level advisory lock to prevent race conditions
    PERFORM pg_advisory_xact_lock(999, v_lock_key::INT);

    -- Format date as DDMMYYYY
    v_date_str := TO_CHAR(p_date, 'DDMMYYYY');

    -- Get the maximum existing sequence for this date
    SELECT COALESCE(
        MAX(
            NULLIF(REGEXP_REPLACE(SPLIT_PART(po_number, '-', 3), '[^0-9]', '', 'g'), '')::INT
        ),
        0
    ) INTO v_max_seq
    FROM purchase_orders
    WHERE po_date = p_date
      AND po_number LIKE 'PO-' || v_date_str || '-%';

    -- Next sequence number (1-based, padded to 4 digits)
    v_next_seq := LPAD((v_max_seq + 1)::TEXT, 4, '0');

    RETURN 'PO-' || v_date_str || '-' || v_next_seq;
END;
$$;

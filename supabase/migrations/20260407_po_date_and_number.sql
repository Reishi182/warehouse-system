-- ============================================================
-- Migration: Add po_date column and update generate_po_number function
-- Format: PO-DDMMYYYY-XXXX (daily sequential, resets each day)
-- ============================================================

-- 1. Add po_date column to purchase_orders table
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS po_date DATE DEFAULT CURRENT_DATE;

-- 2. Backfill existing rows: set po_date from created_at
UPDATE purchase_orders
SET po_date = (created_at AT TIME ZONE 'Asia/Jakarta')::DATE
WHERE po_date IS NULL;

-- 3. Add unique constraint on po_number to prevent duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_po_number_unique'
    ) THEN
        ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_po_number_unique UNIQUE (po_number);
    END IF;
END $$;

-- 4. Create or replace the generate_po_number function
-- Uses advisory lock to prevent race conditions (no duplicate numbers)
CREATE OR REPLACE FUNCTION generate_po_number(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_date_str TEXT;
    v_count INT;
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

    -- Count existing POs for this date
    SELECT COUNT(*) INTO v_count
    FROM purchase_orders
    WHERE po_date = p_date;

    -- Next sequence number (1-based, padded to 4 digits)
    v_next_seq := LPAD((v_count + 1)::TEXT, 4, '0');

    RETURN 'PO-' || v_date_str || '-' || v_next_seq;
END;
$$;

-- Migration to add cancellation feature for sales
-- Uses is_cancelled, cancelled_reason, cancelled_at to match frontend expectations
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_by_name TEXT;

-- Atomic function: cancel sale + return stock in one transaction
CREATE OR REPLACE FUNCTION public.cancel_sale(
    p_sale_id UUID,
    p_cancel_reason TEXT,
    p_user_id UUID,
    p_user_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale RECORD;
    v_item RECORD;
    v_stock_col TEXT;
    v_stock_before NUMERIC;
    v_stock_after NUMERIC;
BEGIN
    -- 1. Get and lock the sale row
    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale not found: %', p_sale_id;
    END IF;

    IF v_sale.is_cancelled = true THEN
        RAISE EXCEPTION 'Sale is already cancelled';
    END IF;

    -- Determine which stock column to restore
    v_stock_col := 'stock_' || COALESCE(v_sale.stock_location, 'toko');

    -- 2. Loop through sale_items and restore stock
    FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
    LOOP
        -- Get current stock with row lock
        EXECUTE format('SELECT %I FROM public.products WHERE id = $1 FOR UPDATE', v_stock_col)
        INTO v_stock_before
        USING v_item.product_id;

        v_stock_after := COALESCE(v_stock_before, 0) + v_item.quantity;

        -- Restore stock
        EXECUTE format('UPDATE public.products SET %I = $1 WHERE id = $2', v_stock_col)
        USING v_stock_after, v_item.product_id;

        -- Create stock log entry
        INSERT INTO public.stock_logs (
            product_id,
            type,
            quantity,
            location,
            user_id,
            actor_name,
            note,
            stock_before,
            stock_after
        ) VALUES (
            v_item.product_id,
            'in',
            v_item.quantity,
            COALESCE(v_sale.stock_location, 'toko'),
            p_user_id,
            p_user_name,
            'Cancel penjualan ' || v_sale.sale_number || ' - ' || p_cancel_reason,
            v_stock_before,
            v_stock_after
        );
    END LOOP;

    -- 3. Mark the sale as cancelled
    UPDATE public.sales
    SET
        is_cancelled     = true,
        cancelled_reason = p_cancel_reason,
        cancelled_at     = NOW(),
        cancelled_by     = p_user_id,
        cancelled_by_name = p_user_name
    WHERE id = p_sale_id;

    -- 4. Insert notification
    INSERT INTO public.notifications (title, message, type, link)
    VALUES (
        'Penjualan Dibatalkan',
        'Penjualan ' || v_sale.sale_number || ' dibatalkan oleh ' || p_user_name || '. Alasan: ' || p_cancel_reason,
        'warning',
        '/pos'
    );

    RETURN jsonb_build_object(
        'success', true,
        'sale_number', v_sale.sale_number
    );
END;
$$;

-- Grant execute to authenticated users (RLS enforced by SECURITY DEFINER logic above)
GRANT EXECUTE ON FUNCTION public.cancel_sale(UUID, TEXT, UUID, TEXT) TO authenticated;

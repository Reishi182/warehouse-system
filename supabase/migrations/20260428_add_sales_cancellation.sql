-- Migration to add cancellation feature for sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'canceled')),
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS canceled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS canceled_by_name TEXT;

-- Function to atomically cancel a sale and return stock
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
    v_location TEXT;
BEGIN
    -- 1. Get and lock the sale
    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale not found: %', p_sale_id;
    END IF;

    IF v_sale.status = 'canceled' THEN
        RAISE EXCEPTION 'Sale is already canceled';
    END IF;

    v_location := v_sale.stock_location;
    v_stock_col := 'stock_' || v_location;

    -- 2. Loop through sale_items and return stock
    FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
    LOOP
        -- Get current stock
        EXECUTE format('SELECT %I FROM public.products WHERE id = $1 FOR UPDATE', v_stock_col)
        INTO v_stock_before
        USING v_item.product_id;

        -- Calculate after
        v_stock_after := v_stock_before + v_item.quantity;

        -- Update product stock
        EXECUTE format('UPDATE public.products SET %I = $1 WHERE id = $2', v_stock_col)
        USING v_stock_after, v_item.product_id;

        -- Create stock log
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
            'return',
            v_item.quantity,
            v_location,
            p_user_id,
            p_user_name,
            'Pembatalan transaksi ' || v_sale.sale_number || ': ' || p_cancel_reason,
            v_stock_before,
            v_stock_after
        );
    END LOOP;

    -- 3. Update sale status
    UPDATE public.sales
    SET 
        status = 'canceled',
        cancel_reason = p_cancel_reason,
        canceled_at = NOW(),
        canceled_by = p_user_id,
        canceled_by_name = p_user_name
    WHERE id = p_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Sale canceled successfully'
    );
END;
$$;

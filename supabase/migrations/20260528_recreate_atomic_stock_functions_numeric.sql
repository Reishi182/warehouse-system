-- Migration: Recreate atomic stock functions with NUMERIC parameter to fully support decimal values

-- 1. Drop all old signatures of atomic_increment_stock to prevent overload conflicts
DROP FUNCTION IF EXISTS public.atomic_increment_stock(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.atomic_increment_stock(UUID, NUMERIC, TEXT);

-- Recreate atomic_increment_stock with NUMERIC
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
    ELSE
        RAISE EXCEPTION 'Invalid location: %', p_location;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Drop all old signatures of atomic_decrement_stock to prevent overload conflicts
DROP FUNCTION IF EXISTS public.atomic_decrement_stock(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.atomic_decrement_stock(UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.atomic_decrement_stock(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.atomic_decrement_stock(UUID, NUMERIC, TEXT);

-- Recreate atomic_decrement_stock with NUMERIC
CREATE OR REPLACE FUNCTION public.atomic_decrement_stock(
    p_product_id UUID,
    p_location TEXT,
    p_quantity NUMERIC
)
RETURNS VOID AS $$
DECLARE
    v_current_stock NUMERIC; -- Changed from FLOAT4 to NUMERIC for absolute decimal precision
BEGIN
    IF p_location = 'gudang' THEN
        SELECT COALESCE(stock_gudang, 0) INTO v_current_stock
        FROM public.products
        WHERE id = p_product_id
        FOR UPDATE;
    ELSIF p_location = 'toko' THEN
        SELECT COALESCE(stock_toko, 0) INTO v_current_stock
        FROM public.products
        WHERE id = p_product_id
        FOR UPDATE;
    ELSE
        RAISE EXCEPTION 'Invalid location: %', p_location;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Stok tidak cukup. Tersedia: %, diminta: %', v_current_stock, p_quantity;
    END IF;

    IF p_location = 'gudang' THEN
        UPDATE public.products
        SET stock_gudang = v_current_stock - p_quantity
        WHERE id = p_product_id;
    ELSE
        UPDATE public.products
        SET stock_toko = v_current_stock - p_quantity
        WHERE id = p_product_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Drop all old signatures of atomic_transfer_stock to prevent overload conflicts
DROP FUNCTION IF EXISTS public.atomic_transfer_stock(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.atomic_transfer_stock(UUID, NUMERIC, TEXT, TEXT);

-- Recreate atomic_transfer_stock with NUMERIC
CREATE OR REPLACE FUNCTION public.atomic_transfer_stock(
    p_product_id UUID,
    p_quantity NUMERIC,
    p_from TEXT,
    p_to TEXT
)
RETURNS VOID AS $$
DECLARE
    v_current_stock NUMERIC; -- Changed from INTEGER to NUMERIC for decimal precision
BEGIN
    -- Lock the row first
    PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;

    -- Check source stock
    IF p_from = 'gudang' THEN
        SELECT COALESCE(stock_gudang, 0) INTO v_current_stock FROM public.products WHERE id = p_product_id;
    ELSIF p_from = 'toko' THEN
        SELECT COALESCE(stock_toko, 0) INTO v_current_stock FROM public.products WHERE id = p_product_id;
    ELSE
        RAISE EXCEPTION 'Invalid source location: %', p_from;
    END IF;

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Stok % tidak cukup. Tersedia: %, diminta: %', p_from, v_current_stock, p_quantity;
    END IF;

    -- Decrement source
    IF p_from = 'gudang' THEN
        UPDATE public.products SET stock_gudang = stock_gudang - p_quantity WHERE id = p_product_id;
    ELSE
        UPDATE public.products SET stock_toko = stock_toko - p_quantity WHERE id = p_product_id;
    END IF;

    -- Increment destination
    IF p_to = 'gudang' THEN
        UPDATE public.products SET stock_gudang = COALESCE(stock_gudang, 0) + p_quantity WHERE id = p_product_id;
    ELSIF p_to = 'toko' THEN
        UPDATE public.products SET stock_toko = COALESCE(stock_toko, 0) + p_quantity WHERE id = p_product_id;
    ELSE
        RAISE EXCEPTION 'Invalid destination location: %', p_to;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

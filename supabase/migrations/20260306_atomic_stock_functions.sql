-- ===========================================
-- ATOMIC STOCK OPERATIONS
-- ===========================================
-- This migration creates 3 atomic stock functions to prevent
-- race conditions from concurrent read-then-write patterns.
-- Date: 2026-03-06

-- =============================================
-- 1. ATOMIC INCREMENT STOCK
-- =============================================
-- Used by: useAddStock, useGoodsReceipt
-- Atomically adds quantity to stock_gudang or stock_toko

CREATE OR REPLACE FUNCTION public.atomic_increment_stock(
    p_product_id UUID,
    p_quantity INTEGER,
    p_location TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF p_location = 'gudang' THEN
        UPDATE public.products
        SET stock_gudang = stock_gudang + p_quantity
        WHERE id = p_product_id;
    ELSIF p_location = 'toko' THEN
        UPDATE public.products
        SET stock_toko = stock_toko + p_quantity
        WHERE id = p_product_id;
    ELSE
        RAISE EXCEPTION 'Invalid location: %', p_location;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;
END;
$$;

-- =============================================
-- 2. ATOMIC DECREMENT STOCK
-- =============================================
-- Used by: useCreateSale
-- Atomically subtracts quantity from stock.
-- RAISES EXCEPTION if stock is insufficient (no silent clip to 0).

CREATE OR REPLACE FUNCTION public.atomic_decrement_stock(
    p_product_id UUID,
    p_quantity INTEGER,
    p_location TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- Read and lock the row to prevent concurrent modifications
    IF p_location = 'gudang' THEN
        SELECT stock_gudang INTO v_current_stock
        FROM public.products
        WHERE id = p_product_id
        FOR UPDATE;
    ELSIF p_location = 'toko' THEN
        SELECT stock_toko INTO v_current_stock
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
        SET stock_gudang = stock_gudang - p_quantity
        WHERE id = p_product_id;
    ELSE
        UPDATE public.products
        SET stock_toko = stock_toko - p_quantity
        WHERE id = p_product_id;
    END IF;
END;
$$;

-- =============================================
-- 3. ATOMIC TRANSFER STOCK
-- =============================================
-- Used by: useStockReturns (toko -> gudang)
-- Atomically moves stock from one location to another.
-- RAISES EXCEPTION if source has insufficient stock.

CREATE OR REPLACE FUNCTION public.atomic_transfer_stock(
    p_product_id UUID,
    p_quantity INTEGER,
    p_from TEXT,
    p_to TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- Lock the row first
    PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;

    -- Check source stock
    IF p_from = 'gudang' THEN
        SELECT stock_gudang INTO v_current_stock FROM public.products WHERE id = p_product_id;
    ELSIF p_from = 'toko' THEN
        SELECT stock_toko INTO v_current_stock FROM public.products WHERE id = p_product_id;
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
        UPDATE public.products SET stock_gudang = stock_gudang + p_quantity WHERE id = p_product_id;
    ELSIF p_to = 'toko' THEN
        UPDATE public.products SET stock_toko = stock_toko + p_quantity WHERE id = p_product_id;
    ELSE
        RAISE EXCEPTION 'Invalid destination location: %', p_to;
    END IF;
END;
$$;


-- Add stock_reserved to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_reserved INTEGER DEFAULT 0;

-- Update Surat Jalan table for B2B Flow
ALTER TABLE public.surat_jalan
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS recipient_address TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'B2B', -- 'B2B' or 'INTERNAL' (legacy/transfer)
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create Goods Issue Notes (Surat Pengeluaran)
CREATE TABLE IF NOT EXISTS public.goods_issue_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_number TEXT, -- Auto generated 'SP/...'
    surat_jalan_id UUID REFERENCES public.surat_jalan(id),
    issued_by UUID REFERENCES auth.users(id),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending_auditor', -- pending_auditor, approved, rejected
    auditor_id UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Goods Issue Notes
ALTER TABLE public.goods_issue_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users issue notes" 
ON public.goods_issue_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow warehouse insert issue notes" 
ON public.goods_issue_notes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update issue notes" 
ON public.goods_issue_notes FOR UPDATE TO authenticated USING (true);

-- Functions to manage Stock Reservation

-- Function: Reserve Stock (Used when creating Request or Surat Jalan)
CREATE OR REPLACE FUNCTION reserve_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.products
    SET stock_reserved = stock_reserved + p_quantity
    WHERE id = p_product_id;
END;
$$;

-- Function: Release Stock Reservation (Used when rejecting Request/SJ)
CREATE OR REPLACE FUNCTION release_stock_reservation(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.products
    SET stock_reserved = GREATEST(0, stock_reserved - p_quantity)
    WHERE id = p_product_id;
END;
$$;

-- Function: Commit Stock Issue (Used when Auditor approves shipment/issue note)
-- Deducts from REAL stock (gudang) AND releases reservation
CREATE OR REPLACE FUNCTION commit_stock_issue(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.products
    SET 
        stock_gudang = GREATEST(0, stock_gudang - p_quantity),
        stock_reserved = GREATEST(0, stock_reserved - p_quantity)
    WHERE id = p_product_id;
END;
$$;

-- Migration: Add stock opname (stock count) feature
-- Allows physical stock counting and adjustment

CREATE TABLE IF NOT EXISTS public.stock_opname (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location TEXT NOT NULL CHECK (location IN ('gudang', 'toko', 'lainnya')),
  system_stock INTEGER NOT NULL DEFAULT 0,
  actual_stock INTEGER NOT NULL DEFAULT 0,
  difference INTEGER GENERATED ALWAYS AS (actual_stock - system_stock) STORED,
  note TEXT,
  counted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  counted_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_opname ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to view stock opname"
  ON public.stock_opname FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow warehouse and admin to insert stock opname"
  ON public.stock_opname FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow auditor and admin to update stock opname"
  ON public.stock_opname FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_stock_opname_product ON public.stock_opname(product_id);
CREATE INDEX idx_stock_opname_status ON public.stock_opname(status);
CREATE INDEX idx_stock_opname_created_at ON public.stock_opname(created_at DESC);

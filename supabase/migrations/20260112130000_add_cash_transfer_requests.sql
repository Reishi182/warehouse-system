-- Migration: Add cash transfer requests table for approval workflow
-- Kasir creates request, Auditor approves/rejects

CREATE TABLE IF NOT EXISTS public.cash_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cashier_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auditor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  auditor_name TEXT,
  processed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to view cash transfer requests"
  ON public.cash_transfer_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow cashier and admin to insert cash transfer requests"
  ON public.cash_transfer_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow auditor and admin to update cash transfer requests"
  ON public.cash_transfer_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

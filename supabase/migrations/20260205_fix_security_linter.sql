-- ===========================================
-- FIX SUPABASE SECURITY LINTER WARNINGS
-- ===========================================
-- This migration fixes:
-- 1. Function search_path mutable warnings (4 functions)
-- 2. RLS policy always true warnings (34+ policies)
-- Date: 2026-02-05

-- =============================================
-- PART 1: FIX FUNCTION SEARCH PATH WARNINGS
-- =============================================

-- 1.1 Fix update_customer_tabs_updated_at
DROP FUNCTION IF EXISTS public.update_customer_tabs_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_customer_tabs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_customer_tabs_updated_at ON public.customer_tabs;
CREATE TRIGGER trigger_customer_tabs_updated_at
    BEFORE UPDATE ON public.customer_tabs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customer_tabs_updated_at();

-- 1.2 Fix commit_stock_issue
DROP FUNCTION IF EXISTS public.commit_stock_issue(UUID, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.commit_stock_issue(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.products
    SET 
        stock_gudang = GREATEST(0, stock_gudang - p_quantity),
        stock_reserved = GREATEST(0, stock_reserved - p_quantity)
    WHERE id = p_product_id;
END;
$$;

-- 1.3 Fix reserve_stock
DROP FUNCTION IF EXISTS public.reserve_stock(UUID, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.reserve_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.products
    SET stock_reserved = stock_reserved + p_quantity
    WHERE id = p_product_id;
END;
$$;

-- 1.4 Fix release_stock_reservation
DROP FUNCTION IF EXISTS public.release_stock_reservation(UUID, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.release_stock_reservation(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.products
    SET stock_reserved = GREATEST(0, stock_reserved - p_quantity)
    WHERE id = p_product_id;
END;
$$;

-- =============================================
-- PART 2: FIX RLS POLICY ALWAYS TRUE WARNINGS
-- =============================================

-- Helper: Ensure get_user_role function exists with search_path
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid()
$$;

-- -----------------------------------------
-- 2.1 cash_transfer_requests
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow cashier and admin to insert cash transfer requests" ON public.cash_transfer_requests;
DROP POLICY IF EXISTS "Allow auditor and admin to update cash transfer requests" ON public.cash_transfer_requests;

CREATE POLICY "Role-based insert cash_transfer_requests" ON public.cash_transfer_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier')
);

CREATE POLICY "Role-based update cash_transfer_requests" ON public.cash_transfer_requests
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'main_office', 'auditor')
)
WITH CHECK (
  public.get_user_role() IN ('admin', 'main_office', 'auditor')
);

-- -----------------------------------------
-- 2.2 customer_exchanges
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to insert exchanges" ON public.customer_exchanges;
DROP POLICY IF EXISTS "Allow authenticated users to update exchanges" ON public.customer_exchanges;

CREATE POLICY "Role-based insert customer_exchanges" ON public.customer_exchanges
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier', 'main_office')
);

CREATE POLICY "Role-based update customer_exchanges" ON public.customer_exchanges
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'cashier', 'main_office')
)
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier', 'main_office')
);

-- -----------------------------------------
-- 2.3 customer_tabs
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated insert customer_tabs" ON public.customer_tabs;
DROP POLICY IF EXISTS "Allow authenticated update customer_tabs" ON public.customer_tabs;

CREATE POLICY "Role-based insert customer_tabs" ON public.customer_tabs
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier')
);

CREATE POLICY "Role-based update customer_tabs" ON public.customer_tabs
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'cashier')
)
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier')
);

-- -----------------------------------------
-- 2.4 exchange_new_items
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to insert exchange new items" ON public.exchange_new_items;

CREATE POLICY "Role-based insert exchange_new_items" ON public.exchange_new_items
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier', 'main_office')
);

-- -----------------------------------------
-- 2.5 exchange_returned_items
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to insert exchange returned items" ON public.exchange_returned_items;

CREATE POLICY "Role-based insert exchange_returned_items" ON public.exchange_returned_items
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier', 'main_office')
);

-- -----------------------------------------
-- 2.6 goods_issue_notes
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow warehouse insert issue notes" ON public.goods_issue_notes;
DROP POLICY IF EXISTS "Allow update issue notes" ON public.goods_issue_notes;

CREATE POLICY "Role-based insert goods_issue_notes" ON public.goods_issue_notes
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'warehouse')
);

CREATE POLICY "Role-based update goods_issue_notes" ON public.goods_issue_notes
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'warehouse', 'auditor')
)
WITH CHECK (
  public.get_user_role() IN ('admin', 'warehouse', 'auditor')
);

-- -----------------------------------------
-- 2.7 goods_receipts
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow cashier insert receipt" ON public.goods_receipts;

CREATE POLICY "Role-based insert goods_receipts" ON public.goods_receipts
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier', 'warehouse')
);

-- -----------------------------------------
-- 2.8 marketplace_order_items
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated to insert marketplace_order_items" ON public.marketplace_order_items;
DROP POLICY IF EXISTS "Allow authenticated to update marketplace_order_items" ON public.marketplace_order_items;

CREATE POLICY "Role-based insert marketplace_order_items" ON public.marketplace_order_items
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse')
);

CREATE POLICY "Role-based update marketplace_order_items" ON public.marketplace_order_items
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse')
)
WITH CHECK (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse')
);

-- -----------------------------------------
-- 2.9 marketplace_orders
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated to insert marketplace_orders" ON public.marketplace_orders;
DROP POLICY IF EXISTS "Allow authenticated to update marketplace_orders" ON public.marketplace_orders;

CREATE POLICY "Role-based insert marketplace_orders" ON public.marketplace_orders
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse')
);

CREATE POLICY "Role-based update marketplace_orders" ON public.marketplace_orders
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse')
)
WITH CHECK (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse')
);

-- -----------------------------------------
-- 2.10 marketplace_returns
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated to insert marketplace_returns" ON public.marketplace_returns;
DROP POLICY IF EXISTS "Allow authenticated to update marketplace_returns" ON public.marketplace_returns;

CREATE POLICY "Role-based insert marketplace_returns" ON public.marketplace_returns
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse')
);

CREATE POLICY "Role-based update marketplace_returns" ON public.marketplace_returns
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse')
)
WITH CHECK (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse')
);

-- -----------------------------------------
-- 2.11 stock_request_items
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow cashier insert items" ON public.stock_request_items;

CREATE POLICY "Role-based insert stock_request_items" ON public.stock_request_items
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier')
);

-- -----------------------------------------
-- 2.12 stock_requests
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow cashier insert request" ON public.stock_requests;
DROP POLICY IF EXISTS "Allow update request" ON public.stock_requests;

CREATE POLICY "Role-based insert stock_requests" ON public.stock_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier')
);

CREATE POLICY "Role-based update stock_requests" ON public.stock_requests
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse', 'auditor')
)
WITH CHECK (
  public.get_user_role() IN ('admin', 'main_office', 'warehouse', 'auditor')
);

-- -----------------------------------------
-- 2.13 stock_return_items (if exists)
-- -----------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_return_items' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated insert" ON public.stock_return_items';
    EXECUTE 'CREATE POLICY "Role-based insert stock_return_items" ON public.stock_return_items
      FOR INSERT TO authenticated
      WITH CHECK (
        public.get_user_role() IN (''admin'', ''cashier'', ''warehouse'')
      )';
  END IF;
END
$$;

-- -----------------------------------------
-- 2.14 stock_returns (if exists)
-- -----------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_returns' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated insert" ON public.stock_returns';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated update" ON public.stock_returns';
    
    EXECUTE 'CREATE POLICY "Role-based insert stock_returns" ON public.stock_returns
      FOR INSERT TO authenticated
      WITH CHECK (
        public.get_user_role() IN (''admin'', ''cashier'', ''warehouse'')
      )';
      
    EXECUTE 'CREATE POLICY "Role-based update stock_returns" ON public.stock_returns
      FOR UPDATE TO authenticated
      USING (
        public.get_user_role() IN (''admin'', ''cashier'', ''warehouse'')
      )
      WITH CHECK (
        public.get_user_role() IN (''admin'', ''cashier'', ''warehouse'')
      )';
  END IF;
END
$$;

-- -----------------------------------------
-- 2.15 stock_shipments
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow gudang insert shipment" ON public.stock_shipments;
DROP POLICY IF EXISTS "Allow update shipment" ON public.stock_shipments;

CREATE POLICY "Role-based insert stock_shipments" ON public.stock_shipments
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'warehouse')
);

CREATE POLICY "Role-based update stock_shipments" ON public.stock_shipments
FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'warehouse', 'auditor')
)
WITH CHECK (
  public.get_user_role() IN ('admin', 'warehouse', 'auditor')
);

-- -----------------------------------------
-- 2.16 tab_transaction_items
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated insert tab_transaction_items" ON public.tab_transaction_items;
DROP POLICY IF EXISTS "Allow delete tab_transaction_items" ON public.tab_transaction_items;

CREATE POLICY "Role-based insert tab_transaction_items" ON public.tab_transaction_items
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier')
);

CREATE POLICY "Role-based delete tab_transaction_items" ON public.tab_transaction_items
FOR DELETE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'cashier')
);

-- -----------------------------------------
-- 2.17 tab_transactions
-- -----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated insert tab_transactions" ON public.tab_transactions;
DROP POLICY IF EXISTS "Allow delete tab_transactions" ON public.tab_transactions;

CREATE POLICY "Role-based insert tab_transactions" ON public.tab_transactions
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role() IN ('admin', 'cashier')
);

CREATE POLICY "Role-based delete tab_transactions" ON public.tab_transactions
FOR DELETE TO authenticated
USING (
  public.get_user_role() IN ('admin', 'cashier')
);

-- =============================================
-- PART 3: ADD stock_shipment_items RLS
-- =============================================
-- This table might be missing proper RLS

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_shipment_items' AND table_schema = 'public') THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE public.stock_shipment_items ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing permissive policies
    EXECUTE 'DROP POLICY IF EXISTS "Allow gudang insert shipment items" ON public.stock_shipment_items';
    
    -- Create role-based policy
    EXECUTE 'CREATE POLICY "Role-based insert stock_shipment_items" ON public.stock_shipment_items
      FOR INSERT TO authenticated
      WITH CHECK (
        public.get_user_role() IN (''admin'', ''warehouse'')
      )';
      
    -- Add SELECT policy if not exists
    EXECUTE 'DROP POLICY IF EXISTS "Allow read stock_shipment_items" ON public.stock_shipment_items';
    EXECUTE 'CREATE POLICY "Allow read stock_shipment_items" ON public.stock_shipment_items
      FOR SELECT TO authenticated
      USING (true)';
  END IF;
END
$$;

-- =============================================
-- DONE!
-- =============================================
-- After running this migration:
-- 1. Run Supabase Database Linter to verify all warnings are resolved
-- 2. Enable Leaked Password Protection in Supabase Dashboard
--    (Authentication > Settings > Enable Leaked Password Protection)

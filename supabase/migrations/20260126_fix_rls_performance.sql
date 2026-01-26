-- ===========================================
-- FIX RLS PERFORMANCE WARNINGS
-- ===========================================
-- This migration fixes:
-- 1. auth_rls_initplan: Replace auth.<function>() with (select auth.<function>())
-- 2. multiple_permissive_policies: Remove duplicate policies

-- =====================
-- 1. FIX DUPLICATE POLICIES (Remove one of each duplicate)
-- =====================

-- profiles: Remove duplicate SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- products: Remove duplicate policies
DROP POLICY IF EXISTS "Warehouse and admin can insert products" ON products;
DROP POLICY IF EXISTS "Warehouse and admin can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;
DROP POLICY IF EXISTS "All users can read products" ON products;

-- sales: Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON sales;
DROP POLICY IF EXISTS "All users can read sales" ON sales;

-- sale_items: Remove duplicate policies  
DROP POLICY IF EXISTS "Authenticated users can insert sale items" ON sale_items;
DROP POLICY IF EXISTS "All users can read sale_items" ON sale_items;

-- cash_transfers: Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can insert cash transfers" ON cash_transfers;
DROP POLICY IF EXISTS "All users can read cash_transfers" ON cash_transfers;

-- activity_logs: Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "All users can read activity_logs" ON activity_logs;

-- stock_logs: Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can insert stock logs" ON stock_logs;
DROP POLICY IF EXISTS "All users can read stock_logs" ON stock_logs;

-- stock_out_requests: Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can create requests" ON stock_out_requests;
DROP POLICY IF EXISTS "All users can read stock_out_requests" ON stock_out_requests;
DROP POLICY IF EXISTS "Authenticated users can update requests" ON stock_out_requests;

-- surat_jalan: Remove duplicate policies
DROP POLICY IF EXISTS "Cashier can create surat jalan" ON surat_jalan;
DROP POLICY IF EXISTS "All users can read surat_jalan" ON surat_jalan;
DROP POLICY IF EXISTS "Auditor can update surat jalan" ON surat_jalan;

-- surat_jalan_items: Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can insert surat jalan items" ON surat_jalan_items;
DROP POLICY IF EXISTS "All users can read surat_jalan_items" ON surat_jalan_items;

-- notifications: Remove duplicate policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;


-- =====================
-- 2. RECREATE POLICIES WITH OPTIMIZED auth.() calls
-- =====================

-- PROFILES
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles 
FOR INSERT WITH CHECK (auth.uid() = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING (auth.uid() = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles 
FOR DELETE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
CREATE POLICY "Users can read all profiles" ON profiles 
FOR SELECT USING ((select auth.role()) = 'authenticated');

-- PRODUCTS
DROP POLICY IF EXISTS "All authenticated users can view products" ON products;
CREATE POLICY "All authenticated users can view products" ON products 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authorized users can insert products" ON products;
CREATE POLICY "Authorized users can insert products" ON products 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authorized users can update products" ON products;
CREATE POLICY "Authorized users can update products" ON products 
FOR UPDATE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Admin/Auditor can delete products" ON products;
CREATE POLICY "Admin/Auditor can delete products" ON products 
FOR DELETE USING ((select auth.role()) = 'authenticated');

-- SALES
DROP POLICY IF EXISTS "All authenticated users can view sales" ON sales;
CREATE POLICY "All authenticated users can view sales" ON sales 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Cashiers can create sales" ON sales;
CREATE POLICY "Cashiers can create sales" ON sales 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- SALE ITEMS
DROP POLICY IF EXISTS "All authenticated users can view sale items" ON sale_items;
CREATE POLICY "All authenticated users can view sale items" ON sale_items 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authorized users can insert sale_items" ON sale_items;
CREATE POLICY "Authorized users can insert sale_items" ON sale_items 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- CASH TRANSFERS
DROP POLICY IF EXISTS "All authenticated users can view cash transfers" ON cash_transfers;
CREATE POLICY "All authenticated users can view cash transfers" ON cash_transfers 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Cashiers can create cash_transfers" ON cash_transfers;
CREATE POLICY "Cashiers can create cash_transfers" ON cash_transfers 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- ACTIVITY LOGS
DROP POLICY IF EXISTS "All authenticated users can view activity logs" ON activity_logs;
CREATE POLICY "All authenticated users can view activity logs" ON activity_logs 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "System can create activity_logs" ON activity_logs;
CREATE POLICY "System can create activity_logs" ON activity_logs 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- STOCK LOGS
DROP POLICY IF EXISTS "All authenticated users can view stock logs" ON stock_logs;
CREATE POLICY "All authenticated users can view stock logs" ON stock_logs 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "System can insert stock_logs" ON stock_logs;
CREATE POLICY "System can insert stock_logs" ON stock_logs 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- STOCK OUT REQUESTS
DROP POLICY IF EXISTS "All authenticated users can view requests" ON stock_out_requests;
CREATE POLICY "All authenticated users can view requests" ON stock_out_requests 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Warehouse/Cashiers can create requests" ON stock_out_requests;
CREATE POLICY "Warehouse/Cashiers can create requests" ON stock_out_requests 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Auditors can update requests" ON stock_out_requests;
CREATE POLICY "Auditors can update requests" ON stock_out_requests 
FOR UPDATE USING ((select auth.role()) = 'authenticated');

-- SURAT JALAN
DROP POLICY IF EXISTS "All authenticated users can view surat jalan" ON surat_jalan;
CREATE POLICY "All authenticated users can view surat jalan" ON surat_jalan 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Cashiers can create surat_jalan" ON surat_jalan;
CREATE POLICY "Cashiers can create surat_jalan" ON surat_jalan 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Auditors can update surat_jalan" ON surat_jalan;
CREATE POLICY "Auditors can update surat_jalan" ON surat_jalan 
FOR UPDATE USING ((select auth.role()) = 'authenticated');

-- SURAT JALAN ITEMS
DROP POLICY IF EXISTS "All authenticated users can view surat jalan items" ON surat_jalan_items;
CREATE POLICY "All authenticated users can view surat jalan items" ON surat_jalan_items 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authorized users can insert surat_jalan_items" ON surat_jalan_items;
CREATE POLICY "Authorized users can insert surat_jalan_items" ON surat_jalan_items 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications" ON notifications 
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications 
FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- CUSTOMERS
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customers;
CREATE POLICY "Enable read access for authenticated users" ON customers 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customers;
CREATE POLICY "Enable insert for authenticated users" ON customers 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON customers;
CREATE POLICY "Enable update for authenticated users" ON customers 
FOR UPDATE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON customers;
CREATE POLICY "Enable delete for authenticated users" ON customers 
FOR DELETE USING ((select auth.role()) = 'authenticated');

-- INVOICES
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON invoices;
CREATE POLICY "Enable read access for authenticated users" ON invoices 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON invoices;
CREATE POLICY "Enable insert for authenticated users" ON invoices 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON invoices;
CREATE POLICY "Enable update for authenticated users" ON invoices 
FOR UPDATE USING ((select auth.role()) = 'authenticated');

-- INVOICE ITEMS
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON invoice_items;
CREATE POLICY "Enable read access for authenticated users" ON invoice_items 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON invoice_items;
CREATE POLICY "Enable insert for authenticated users" ON invoice_items 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- SUPPLIERS
DROP POLICY IF EXISTS "Allow all authenticated users" ON suppliers;
CREATE POLICY "Allow all authenticated users" ON suppliers 
FOR ALL USING ((select auth.role()) = 'authenticated');

-- PURCHASE ORDERS
DROP POLICY IF EXISTS "Allow all authenticated users" ON purchase_orders;
CREATE POLICY "Allow all authenticated users" ON purchase_orders 
FOR ALL USING ((select auth.role()) = 'authenticated');

-- PURCHASE ORDER ITEMS
DROP POLICY IF EXISTS "Allow all authenticated users" ON purchase_order_items;
CREATE POLICY "Allow all authenticated users" ON purchase_order_items 
FOR ALL USING ((select auth.role()) = 'authenticated');

-- PO RECEIPTS
DROP POLICY IF EXISTS "Allow all authenticated users" ON po_receipts;
CREATE POLICY "Allow all authenticated users" ON po_receipts 
FOR ALL USING ((select auth.role()) = 'authenticated');

-- OTHER TRANSACTIONS
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON other_transactions;
CREATE POLICY "Enable all access for authenticated users" ON other_transactions 
FOR ALL USING ((select auth.role()) = 'authenticated');

-- DIRECT ORDERS
DROP POLICY IF EXISTS "Authenticated users can read direct_orders" ON direct_orders;
CREATE POLICY "Authenticated users can read direct_orders" ON direct_orders 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Main office and admin can insert direct_orders" ON direct_orders;
CREATE POLICY "Main office and admin can insert direct_orders" ON direct_orders 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Main office and admin can update direct_orders" ON direct_orders;
CREATE POLICY "Main office and admin can update direct_orders" ON direct_orders 
FOR UPDATE USING ((select auth.role()) = 'authenticated');

-- DIRECT ORDER ITEMS
DROP POLICY IF EXISTS "Authenticated users can read direct_order_items" ON direct_order_items;
CREATE POLICY "Authenticated users can read direct_order_items" ON direct_order_items 
FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Main office and admin can insert direct_order_items" ON direct_order_items;
CREATE POLICY "Main office and admin can insert direct_order_items" ON direct_order_items 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- STORE SETTINGS
DROP POLICY IF EXISTS "Admin can update store_settings" ON store_settings;
CREATE POLICY "Admin can update store_settings" ON store_settings 
FOR UPDATE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Admin can insert store_settings" ON store_settings;
CREATE POLICY "Admin can insert store_settings" ON store_settings 
FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

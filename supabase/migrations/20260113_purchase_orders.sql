-- ===========================================
-- PURCHASE ORDER SYSTEM - SUPABASE MIGRATION
-- ===========================================

-- 1. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    contact_person TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PURCHASE ORDERS TABLE
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_number TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    destination TEXT NOT NULL CHECK (destination IN ('gudang', 'toko')),
    status TEXT NOT NULL DEFAULT 'pending_auditor' CHECK (status IN ('pending_auditor', 'approved', 'rejected', 'pending_receipt', 'completed')),
    total_amount NUMERIC(15, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_by_name TEXT,
    auditor_id UUID,
    auditor_name TEXT,
    auditor_action_at TIMESTAMPTZ,
    rejected_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PURCHASE ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PO RECEIPTS TABLE (untuk konfirmasi penerimaan barang)
CREATE TABLE IF NOT EXISTS po_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    received_by UUID,
    received_by_name TEXT,
    photo_url TEXT,
    notes TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_destination ON purchase_orders(destination);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_receipts_po_id ON po_receipts(purchase_order_id);

-- ENABLE RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_receipts ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (Allow all authenticated users - adjust as needed)
CREATE POLICY "Allow all authenticated users" ON suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users" ON purchase_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users" ON purchase_order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all authenticated users" ON po_receipts FOR ALL USING (auth.role() = 'authenticated');

-- FUNCTION: Generate PO Number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    current_date_str TEXT;
    seq_num INTEGER;
    new_po_number TEXT;
BEGIN
    current_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 12) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || current_date_str || '-%';
    
    new_po_number := 'PO-' || current_date_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    
    RETURN new_po_number;
END;
$$ LANGUAGE plpgsql;

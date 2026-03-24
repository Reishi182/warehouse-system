-- =============================================
-- Tokopedia Outbound Orders (Penjualan Keluar)
-- =============================================

-- Main orders table
CREATE TABLE IF NOT EXISTS tokopedia_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    tokopedia_order_id TEXT,
    tokopedia_invoice TEXT,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT,
    buyer_address TEXT,
    courier TEXT,
    tracking_number TEXT,
    stock_location TEXT NOT NULL DEFAULT 'gudang' CHECK (stock_location IN ('gudang', 'toko')),
    status TEXT NOT NULL DEFAULT 'order_received' CHECK (status IN ('order_received', 'packing', 'shipped', 'delivered', 'completed', 'cancelled')),
    total_amount NUMERIC NOT NULL DEFAULT 0,
    shipping_cost NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    received_by UUID REFERENCES auth.users(id),
    received_by_name TEXT,
    packed_by UUID REFERENCES auth.users(id),
    packed_by_name TEXT,
    packed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS tokopedia_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES tokopedia_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    barcode TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order status logs (timeline)
CREATE TABLE IF NOT EXISTS tokopedia_order_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES tokopedia_orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tokopedia_orders_status ON tokopedia_orders(status);
CREATE INDEX IF NOT EXISTS idx_tokopedia_orders_created_at ON tokopedia_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokopedia_orders_stock_location ON tokopedia_orders(stock_location);
CREATE INDEX IF NOT EXISTS idx_tokopedia_order_items_order_id ON tokopedia_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tokopedia_order_logs_order_id ON tokopedia_order_logs(order_id);

-- RLS Policies
ALTER TABLE tokopedia_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokopedia_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokopedia_order_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all
CREATE POLICY "tokopedia_orders_read" ON tokopedia_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "tokopedia_orders_insert" ON tokopedia_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tokopedia_orders_update" ON tokopedia_orders FOR UPDATE TO authenticated USING (true);

CREATE POLICY "tokopedia_order_items_read" ON tokopedia_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "tokopedia_order_items_insert" ON tokopedia_order_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "tokopedia_order_logs_read" ON tokopedia_order_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "tokopedia_order_logs_insert" ON tokopedia_order_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tokopedia_orders;

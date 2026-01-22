-- Marketplace Orders Feature
-- Tables for tracking marketplace purchases (Tokopedia/Shopee etc)

-- 1. Main orders table
CREATE TABLE IF NOT EXISTS marketplace_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    marketplace TEXT NOT NULL, -- 'tokopedia', 'shopee', 'lazada', 'other'
    marketplace_order_id TEXT, -- Optional: marketplace's order ID
    destination TEXT NOT NULL DEFAULT 'gudang', -- 'gudang' or 'toko'
    status TEXT NOT NULL DEFAULT 'pending_arrival',
    -- Statuses: pending_arrival, completed, received_with_issue, return_pending, return_complete, cancelled
    total_amount NUMERIC(12,2) DEFAULT 0,
    invoice_url TEXT, -- Upload bukti pembelian/invoice
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_by_name TEXT,
    received_by UUID REFERENCES profiles(id),
    received_by_name TEXT,
    received_at TIMESTAMP WITH TIME ZONE,
    has_discrepancy BOOLEAN DEFAULT false,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Order items table
CREATE TABLE IF NOT EXISTS marketplace_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    barcode TEXT,
    unit TEXT DEFAULT 'pcs',
    quantity_ordered INTEGER NOT NULL DEFAULT 0,
    quantity_received INTEGER DEFAULT 0,
    quantity_damaged INTEGER DEFAULT 0,
    unit_price NUMERIC(12,2) DEFAULT 0,
    total_price NUMERIC(12,2) DEFAULT 0,
    damage_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Returns table
CREATE TABLE IF NOT EXISTS marketplace_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, picked_up, completed
    items_json JSONB, -- Store returned items details
    pickup_proof_url TEXT, -- Bukti barang diambil ekspedisi
    return_proof_url TEXT, -- Bukti return sudah selesai/refund
    created_by UUID REFERENCES profiles(id),
    created_by_name TEXT,
    completed_by UUID REFERENCES profiles(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_destination ON marketplace_orders(destination);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_created_by ON marketplace_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_order_id ON marketplace_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_returns_order_id ON marketplace_returns(order_id);

-- RLS Policies
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_returns ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view
CREATE POLICY "Allow authenticated to view marketplace_orders"
ON marketplace_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated to insert marketplace_orders"
ON marketplace_orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated to update marketplace_orders"
ON marketplace_orders FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated to view marketplace_order_items"
ON marketplace_order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated to insert marketplace_order_items"
ON marketplace_order_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated to update marketplace_order_items"
ON marketplace_order_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated to view marketplace_returns"
ON marketplace_returns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated to insert marketplace_returns"
ON marketplace_returns FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated to update marketplace_returns"
ON marketplace_returns FOR UPDATE TO authenticated USING (true);

-- Store Settings table (untuk pengaturan toko yang muncul di struk)
CREATE TABLE IF NOT EXISTS store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT NOT NULL DEFAULT 'WAREHOUSE SYSTEM',
    store_address TEXT DEFAULT '',
    store_phone TEXT DEFAULT '',
    store_email TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO store_settings (id, store_name, store_address, store_phone, store_email)
VALUES ('default', 'WAREHOUSE SYSTEM', 'Jl. Contoh No. 123', '021-1234567', 'info@warehouse.com')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
CREATE POLICY "Everyone can read store_settings" ON store_settings
    FOR SELECT USING (true);

-- Policy: Only admin can update
CREATE POLICY "Admin can update store_settings" ON store_settings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can insert store_settings" ON store_settings
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- Direct Orders (Supplier -> Customer, bypass warehouse)
-- ============================================

CREATE TABLE IF NOT EXISTS direct_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name TEXT NOT NULL,
    customer_id UUID,
    customer_name TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    shipping_cost NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES profiles(user_id),
    created_by_name TEXT,
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direct_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direct_order_id UUID NOT NULL REFERENCES direct_orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'pcs',
    price NUMERIC(15,2) NOT NULL DEFAULT 0,
    total NUMERIC(15,2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE direct_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for direct_orders
CREATE POLICY "Authenticated users can read direct_orders" ON direct_orders
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Main office and admin can insert direct_orders" ON direct_orders
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('main_office', 'admin'))
    );

CREATE POLICY "Main office and admin can update direct_orders" ON direct_orders
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('main_office', 'admin'))
    );

-- Policies for direct_order_items
CREATE POLICY "Authenticated users can read direct_order_items" ON direct_order_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Main office and admin can insert direct_order_items" ON direct_order_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('main_office', 'admin'))
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_direct_orders_status ON direct_orders(status);
CREATE INDEX IF NOT EXISTS idx_direct_orders_created_at ON direct_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_order_items_order_id ON direct_order_items(direct_order_id);

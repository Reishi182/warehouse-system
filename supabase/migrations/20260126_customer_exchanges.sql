-- Customer Product Exchange (Tukar Barang)
-- Allows customers to exchange purchased items for different products
-- with price difference handling (pay more or get refund)

-- Customer Exchange Table
CREATE TABLE customer_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_number TEXT UNIQUE,
    
    -- Original sale reference
    original_sale_id UUID REFERENCES sales(id),
    original_sale_number TEXT NOT NULL,
    
    -- Cashier info
    cashier_id UUID REFERENCES auth.users(id),
    cashier_name TEXT NOT NULL,
    
    -- Stock location
    stock_location TEXT NOT NULL DEFAULT 'toko',
    
    -- Financial summary
    original_item_value DECIMAL(15,2) NOT NULL DEFAULT 0,  -- Value of returned items
    new_item_value DECIMAL(15,2) NOT NULL DEFAULT 0,       -- Value of new items
    difference_amount DECIMAL(15,2) NOT NULL DEFAULT 0,    -- Difference (positive = customer pays, negative = customer gets refund)
    amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0,          -- Amount customer paid (if difference is positive)
    change_given DECIMAL(15,2) NOT NULL DEFAULT 0,         -- Change to customer
    
    -- Additional info
    reason TEXT,
    note TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Returned items (items returned by customer)
CREATE TABLE exchange_returned_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES customer_exchanges(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    barcode TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    original_price DECIMAL(15,2) NOT NULL,  -- Price at time of purchase
    subtotal DECIMAL(15,2) NOT NULL,
    condition TEXT NOT NULL DEFAULT 'baik', -- 'baik' or 'rusak'
    condition_note TEXT, -- Additional note about condition
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- New items (replacement items)
CREATE TABLE exchange_new_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES customer_exchanges(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    barcode TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE customer_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_returned_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_new_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read exchanges"
    ON customer_exchanges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert exchanges"
    ON customer_exchanges FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update exchanges"
    ON customer_exchanges FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read exchange returned items"
    ON exchange_returned_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert exchange returned items"
    ON exchange_returned_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read exchange new items"
    ON exchange_new_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert exchange new items"
    ON exchange_new_items FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE customer_exchanges;

-- Add exchanged tracking to sale_items
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS exchanged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS exchanged_qty INTEGER DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS exchange_id UUID REFERENCES customer_exchanges(id);

-- Add has_exchange flag to sales for quick filtering
ALTER TABLE sales ADD COLUMN IF NOT EXISTS has_exchange BOOLEAN NOT NULL DEFAULT FALSE;


-- ===========================================
-- TAB (NOTA GANTUNG) SYSTEM
-- Allows customers to accumulate transactions before paying
-- ===========================================

-- Customer Tabs (main record)
CREATE TABLE IF NOT EXISTS customer_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tab_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    stock_location TEXT NOT NULL CHECK (stock_location IN ('gudang', 'toko')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'cancelled')),
    total_amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('cash', 'transfer')),
    amount_paid NUMERIC,
    change_amount NUMERIC,
    cashier_id UUID REFERENCES auth.users(id),
    cashier_name TEXT NOT NULL,
    settled_by UUID REFERENCES auth.users(id),
    settled_by_name TEXT,
    settled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id),
    cancelled_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tab Transactions (individual transactions within a tab)
CREATE TABLE IF NOT EXISTS tab_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tab_id UUID NOT NULL REFERENCES customer_tabs(id) ON DELETE CASCADE,
    transaction_number TEXT NOT NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    cashier_id UUID REFERENCES auth.users(id),
    cashier_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tab Transaction Items (items in each transaction)
CREATE TABLE IF NOT EXISTS tab_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES tab_transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    barcode TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_tabs_status ON customer_tabs(status);
CREATE INDEX IF NOT EXISTS idx_customer_tabs_cashier ON customer_tabs(cashier_id);
CREATE INDEX IF NOT EXISTS idx_customer_tabs_created ON customer_tabs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tab_transactions_tab ON tab_transactions(tab_id);
CREATE INDEX IF NOT EXISTS idx_tab_transaction_items_transaction ON tab_transaction_items(transaction_id);

-- Enable RLS
ALTER TABLE customer_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tab_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tab_transaction_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_tabs
CREATE POLICY "Allow authenticated read customer_tabs"
    ON customer_tabs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert customer_tabs"
    ON customer_tabs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update customer_tabs"
    ON customer_tabs FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- RLS Policies for tab_transactions
CREATE POLICY "Allow authenticated read tab_transactions"
    ON tab_transactions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert tab_transactions"
    ON tab_transactions FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- RLS Policies for tab_transaction_items
CREATE POLICY "Allow authenticated read tab_transaction_items"
    ON tab_transaction_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert tab_transaction_items"
    ON tab_transaction_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Enable realtime for tabs
ALTER PUBLICATION supabase_realtime ADD TABLE customer_tabs;
ALTER PUBLICATION supabase_realtime ADD TABLE tab_transactions;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_customer_tabs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customer_tabs_updated_at
    BEFORE UPDATE ON customer_tabs
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_tabs_updated_at();

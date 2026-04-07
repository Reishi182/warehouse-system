-- =============================================
-- Product Units (Satuan Produk Dinamis)
-- =============================================

-- Create product_units table for dynamic unit management
CREATE TABLE IF NOT EXISTS product_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,        -- e.g. 'pcs', 'kg', 'meter'
    label TEXT NOT NULL,              -- e.g. 'PCS', 'Kilogram', 'METER'
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_units_is_active ON product_units(is_active);
CREATE INDEX IF NOT EXISTS idx_product_units_sort_order ON product_units(sort_order);

-- RLS Policies
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "product_units_read"
    ON product_units FOR SELECT
    TO authenticated
    USING (true);

-- All authenticated users can insert
CREATE POLICY "product_units_insert"
    ON product_units FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- All authenticated users can update
CREATE POLICY "product_units_update"
    ON product_units FOR UPDATE
    TO authenticated
    USING (true);

-- All authenticated users can delete
CREATE POLICY "product_units_delete"
    ON product_units FOR DELETE
    TO authenticated
    USING (true);

-- Seed default units (20 satuan)
INSERT INTO product_units (code, label, sort_order) VALUES
    ('pcs', 'PCS', 1),
    ('box', 'BOX', 2),
    ('pail', 'PAIL', 3),
    ('set', 'SET', 4),
    ('meter', 'METER', 5),
    ('cm', 'CM', 6),
    ('bks', 'BKS (Bungkus)', 7),
    ('btg', 'BTG (Batang)', 8),
    ('roll', 'ROLL', 9),
    ('kg', 'KG', 10),
    ('gram', 'GRAM', 11),
    ('ons', 'ONS', 12),
    ('liter', 'LITER', 13),
    ('pack', 'PACK', 14),
    ('psg', 'PSG (Pasang)', 15),
    ('sak', 'SAK', 16),
    ('krg', 'KRG (Karung)', 17),
    ('ikat', 'IKAT', 18),
    ('kubik', 'KUBIK', 19),
    ('lusin', 'LUSIN', 20)
ON CONFLICT (code) DO NOTHING;

-- Migration: Link invoices to surat_jalan (many-to-many)
-- An invoice can reference multiple surat jalan, and a surat jalan can appear in multiple invoices

DO $$
BEGIN
    -- Create junction table for invoice <-> surat_jalan relationship
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_surat_jalan') THEN
        CREATE TABLE invoice_surat_jalan (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            surat_jalan_id UUID NOT NULL REFERENCES surat_jalan(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(invoice_id, surat_jalan_id)
        );

        -- Enable RLS
        ALTER TABLE invoice_surat_jalan ENABLE ROW LEVEL SECURITY;

        -- Policy: all authenticated users can read
        CREATE POLICY "invoice_surat_jalan_select" ON invoice_surat_jalan
            FOR SELECT USING (auth.role() = 'authenticated');

        -- Policy: authenticated users can insert
        CREATE POLICY "invoice_surat_jalan_insert" ON invoice_surat_jalan
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        -- Policy: authenticated users can delete
        CREATE POLICY "invoice_surat_jalan_delete" ON invoice_surat_jalan
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;

    -- Add surat_jalan_ids array column to invoices for quick reference (optional, denormalized)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='surat_jalan_ids') THEN
        ALTER TABLE invoices ADD COLUMN surat_jalan_ids UUID[] DEFAULT '{}';
    END IF;

    -- Add source_sj_number to invoice_items to track which SJ each item came from
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_items' AND column_name='surat_jalan_number') THEN
        ALTER TABLE invoice_items ADD COLUMN surat_jalan_number VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_items' AND column_name='surat_jalan_id') THEN
        ALTER TABLE invoice_items ADD COLUMN surat_jalan_id UUID REFERENCES surat_jalan(id);
    END IF;
END $$;

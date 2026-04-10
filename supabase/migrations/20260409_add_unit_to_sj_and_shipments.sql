-- =====================================================
-- Add unit column to shipment and surat jalan items
-- =====================================================

DO $$
BEGIN
    -- Add unit to surat_jalan_items if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='surat_jalan_items' AND column_name='unit') THEN
        ALTER TABLE surat_jalan_items ADD COLUMN unit VARCHAR(50);
    END IF;

    -- Add unit to stock_shipment_items if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='stock_shipment_items' AND column_name='unit') THEN
        ALTER TABLE stock_shipment_items ADD COLUMN unit VARCHAR(50);
    END IF;
END $$;

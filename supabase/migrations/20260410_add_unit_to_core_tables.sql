DO $$
BEGIN
    -- Add unit column to purchase_order_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_order_items' AND column_name='unit') THEN
        ALTER TABLE purchase_order_items ADD COLUMN unit VARCHAR(50);
    END IF;

    -- Add unit column to invoice_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_items' AND column_name='unit') THEN
        ALTER TABLE invoice_items ADD COLUMN unit VARCHAR(50);
    END IF;

    -- Add unit column to tab_transaction_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tab_transaction_items' AND column_name='unit') THEN
        ALTER TABLE tab_transaction_items ADD COLUMN unit VARCHAR(50);
    END IF;

    -- Add unit column to sale_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='unit') THEN
        ALTER TABLE sale_items ADD COLUMN unit VARCHAR(50);
    END IF;
END $$;

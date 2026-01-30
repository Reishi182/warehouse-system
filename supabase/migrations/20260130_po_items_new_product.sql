-- ===========================================
-- ADD PO ITEM NEW PRODUCT FIELDS
-- ===========================================

-- Add columns for new product tracking in PO items
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'pcs',
ADD COLUMN IF NOT EXISTS is_new_product BOOLEAN DEFAULT FALSE;

-- Add index for new products
CREATE INDEX IF NOT EXISTS idx_po_items_is_new_product ON purchase_order_items(is_new_product) WHERE is_new_product = TRUE;

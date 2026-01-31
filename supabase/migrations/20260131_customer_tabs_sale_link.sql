-- ===========================================
-- Add sale_id column to customer_tabs
-- Links settled tabs to their corresponding sale records
-- ===========================================

-- Add sale_id column to reference the created sale when tab is settled
ALTER TABLE customer_tabs 
ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id);

-- Create index for better performance when querying by sale_id
CREATE INDEX IF NOT EXISTS idx_customer_tabs_sale ON customer_tabs(sale_id);

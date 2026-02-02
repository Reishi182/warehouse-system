-- Variable Unit Products: Support for products sold by meter/gram/kg
-- Stock is tracked in the same unit (e.g., 50 meters of hose)

-- Flag to mark variable unit products
ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_by_quantity BOOLEAN DEFAULT false;

-- Unit of sale (meter, cm, kg, gram, liter, pcs)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_unit TEXT DEFAULT 'pcs';

-- Note: stock_gudang and stock_toko are already NUMERIC type, supporting decimal values
COMMENT ON COLUMN products.sell_by_quantity IS 'If true, product is sold by variable quantity (meter/kg/gram)';
COMMENT ON COLUMN products.sell_unit IS 'Unit of sale: pcs, meter, cm, kg, gram, liter';

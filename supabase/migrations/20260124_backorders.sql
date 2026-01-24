-- Backorders table for tracking pending orders when stock is insufficient
CREATE TABLE IF NOT EXISTS backorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backorder_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  barcode TEXT,
  quantity_ordered INT NOT NULL,
  quantity_fulfilled INT DEFAULT 0,
  unit_price DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'fulfilled', 'cancelled')),
  stock_location TEXT DEFAULT 'toko' CHECK (stock_location IN ('gudang', 'toko')),
  original_sale_id UUID REFERENCES sales(id),
  fulfilled_sale_id UUID REFERENCES sales(id),
  notes TEXT,
  created_by UUID,
  created_by_name TEXT,
  fulfilled_by UUID,
  fulfilled_by_name TEXT,
  fulfilled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancelled_by_name TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE backorders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all authenticated users to read backorders"
  ON backorders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert backorders"
  ON backorders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update backorders"
  ON backorders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to generate backorder number
CREATE OR REPLACE FUNCTION generate_backorder_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INT;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM backorders 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Index for faster queries
CREATE INDEX idx_backorders_status ON backorders(status);
CREATE INDEX idx_backorders_product_id ON backorders(product_id);
CREATE INDEX idx_backorders_customer_name ON backorders(customer_name);
CREATE INDEX idx_backorders_created_at ON backorders(created_at DESC);

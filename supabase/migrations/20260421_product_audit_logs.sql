-- Product Audit Logs: tracks field-level changes when editing/deleting products
CREATE TABLE IF NOT EXISTS product_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  action TEXT NOT NULL,        -- 'update_field', 'delete', 'update_stock'
  field_name TEXT,             -- e.g. 'name', 'barcode', 'price', 'stock_gudang'
  old_value TEXT,
  new_value TEXT,
  user_id UUID,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_product_audit_logs_product_id ON product_audit_logs(product_id);
CREATE INDEX idx_product_audit_logs_created_at ON product_audit_logs(created_at DESC);
CREATE INDEX idx_product_audit_logs_action ON product_audit_logs(action);

-- RLS
ALTER TABLE product_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product audit logs"
  ON product_audit_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert product audit logs"
  ON product_audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

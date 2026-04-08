-- =============================================
-- Approve Stock Opname Item RPC Function
-- Creates function to approve individual stock opname items and apply stock adjustments
-- Validates Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 14.1, 14.2, 14.3, 14.4
-- =============================================

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS approve_stock_opname_item(UUID, UUID, TEXT);

-- Create function to approve stock opname item
CREATE OR REPLACE FUNCTION approve_stock_opname_item(
  p_item_id UUID,
  p_approver_id UUID,
  p_approver_name TEXT
)
RETURNS JSON AS $
DECLARE
  v_item RECORD;
  v_product RECORD;
  v_session_location TEXT;
  v_stock_field TEXT;
  v_current_stock DECIMAL;
  v_new_stock DECIMAL;
  v_result JSON;
BEGIN
  -- Get item details and validate status
  SELECT * INTO v_item
  FROM stock_opname_items
  WHERE id = p_item_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or already processed';
  END IF;
  
  -- Get product and current stock
  SELECT * INTO v_product
  FROM products
  WHERE id = v_item.product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Get session location to determine which stock field to update
  SELECT location INTO v_session_location
  FROM stock_opname_sessions
  WHERE id = v_item.session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- Determine stock field and current stock based on location
  IF v_session_location = 'gudang' THEN
    v_current_stock := v_product.stock_gudang;
    v_stock_field := 'stock_gudang';
  ELSIF v_session_location = 'toko' THEN
    v_current_stock := v_product.stock_toko;
    v_stock_field := 'stock_toko';
  ELSE
    RAISE EXCEPTION 'Invalid location: %', v_session_location;
  END IF;
  
  -- Calculate new stock by applying difference to current stock
  -- Ensure non-negative stock (Requirement 7.3)
  v_new_stock := GREATEST(0, v_current_stock + v_item.difference);
  
  -- Update product stock using dynamic SQL
  EXECUTE format('UPDATE products SET %I = $1, updated_at = NOW() WHERE id = $2',
    v_stock_field)
  USING v_new_stock, v_item.product_id;
  
  -- Update item status to approved (Requirement 7.6)
  UPDATE stock_opname_items
  SET status = 'approved',
      approved_by = p_approver_id,
      approved_by_name = p_approver_name,
      approved_at = NOW()
  WHERE id = p_item_id;
  
  -- Insert stock log entry with type 'adjustment' (Requirement 7.4, 14.1, 14.2, 14.3)
  INSERT INTO stock_logs (
    product_id,
    type,
    quantity,
    location,
    user_id,
    note,
    reference_type,
    reference_id,
    stock_before,
    stock_after,
    timestamp
  ) VALUES (
    v_item.product_id,
    'adjustment',
    v_item.difference,
    v_session_location,
    p_approver_id,
    COALESCE('Stok opname: ' || v_item.note, 'Stok opname'),
    'stock_opname_item',
    v_item.id,
    v_current_stock,
    v_new_stock,
    NOW()
  );
  
  -- Insert activity log entry (Requirement 7.5, 14.4)
  INSERT INTO activity_logs (
    user_id,
    user_name,
    user_role,
    action,
    entity_type,
    entity_id,
    description,
    created_at
  ) VALUES (
    p_approver_id,
    p_approver_name,
    'main_office',
    'approve_stock_adjustment',
    'stock_opname_item',
    p_item_id,
    format('Approved stock adjustment for %s: %s → %s (diff: %s)',
      v_product.name,
      v_current_stock,
      v_new_stock,
      v_item.difference),
    NOW()
  );
  
  -- Build result JSON with old_stock, new_stock, and difference (Requirement 7.7)
  v_result := json_build_object(
    'success', true,
    'item_id', p_item_id,
    'old_stock', v_current_stock,
    'new_stock', v_new_stock,
    'difference', v_item.difference
  );
  
  RETURN v_result;
END;
$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION approve_stock_opname_item(UUID, UUID, TEXT) IS 'Approves individual stock opname item, updates product stock based on location, logs adjustment, and returns old/new stock values';

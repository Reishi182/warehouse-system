-- Quick Sale Feature: Make product_id nullable for manual entry items
-- This allows cashiers to add items that don't exist in the products table yet

-- Make product_id nullable in sale_items table
ALTER TABLE sale_items 
ALTER COLUMN product_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN sale_items.product_id IS 'Product ID - NULL for quick sale/manual entry items';

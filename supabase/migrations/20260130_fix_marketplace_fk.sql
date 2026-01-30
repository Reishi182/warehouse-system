-- Fix marketplace_orders foreign key constraints
-- Allow created_by and received_by to reference non-existent profiles

-- Drop existing foreign key constraints
ALTER TABLE marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_created_by_fkey;
ALTER TABLE marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_received_by_fkey;

-- Re-add constraints with ON DELETE SET NULL (more flexible)
-- Or simply don't enforce foreign key if profiles table is managed by Supabase Auth
ALTER TABLE marketplace_orders 
    ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE marketplace_orders 
    ALTER COLUMN received_by DROP NOT NULL;

-- If you want to re-add the foreign key (optional, uncomment if needed)
-- ALTER TABLE marketplace_orders 
--     ADD CONSTRAINT marketplace_orders_created_by_fkey 
--     FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Same fix for marketplace_returns
ALTER TABLE marketplace_returns DROP CONSTRAINT IF EXISTS marketplace_returns_created_by_fkey;
ALTER TABLE marketplace_returns DROP CONSTRAINT IF EXISTS marketplace_returns_completed_by_fkey;

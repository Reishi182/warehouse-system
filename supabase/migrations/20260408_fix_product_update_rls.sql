-- =====================================================
-- FIX: Product UPDATE RLS Policy
-- =====================================================
-- Bug: cashier and main_office roles could see the Edit button
-- in the UI but the Supabase RLS policy silently rejected
-- the UPDATE, causing stock/quantity changes to not persist.
-- 
-- This migration drops the old policy and creates a new one
-- that includes cashier and main_office roles.
-- =====================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Authorized users can update products" ON products;

-- Create new policy with all roles that are allowed to edit in the frontend
CREATE POLICY "Authorized users can update products"
ON products FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'warehouse', 'auditor', 'cashier', 'main_office')
  )
);

-- Add kepala_toko role to profiles check constraint
-- This migration adds support for the new 'kepala_toko' (Store Manager) role

-- First, drop the existing constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the updated constraint with kepala_toko role
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('warehouse', 'cashier', 'kepala_toko', 'main_office', 'auditor', 'admin'));

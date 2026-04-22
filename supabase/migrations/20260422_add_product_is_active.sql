-- Add is_active column to products table
ALTER TABLE public.products 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Update existing products to be active (already handled by DEFAULT, but good practice)
-- UPDATE public.products SET is_active = true WHERE is_active IS NULL;

-- Create an index to make filtering by is_active fast
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

ALTER TABLE public.stock_out_requests
ADD COLUMN IF NOT EXISTS to_location_name TEXT;

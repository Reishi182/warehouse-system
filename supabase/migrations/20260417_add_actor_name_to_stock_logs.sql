-- Migration to formalize actor names in stock_logs
-- This adds the actor_name column and sets up an automated trigger.
-- The trigger ensures backward compatibility dynamically tracking the names of people generating logs!

-- 1. Create the new column to hold denormalized names immutably
ALTER TABLE public.stock_logs ADD COLUMN IF NOT EXISTS actor_name TEXT;

-- 2. Create the Trigger Function to populate the columng Automatically upon INSERT
CREATE OR REPLACE FUNCTION public.fn_capture_stock_logs_actor()
RETURNS TRIGGER AS $$
BEGIN
  -- Safety check: only attempt to auto-fill if user_id exists and actor_name is still unpopulated
  IF NEW.user_id IS NOT NULL AND NEW.actor_name IS NULL THEN
    -- Grab the name from public profiles table safely
    NEW.actor_name := (SELECT name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the trigger to the table BEFORE INSERT so it modifies the row before it hits disk
DROP TRIGGER IF EXISTS trg_capture_stock_logs_actor ON public.stock_logs;
CREATE TRIGGER trg_capture_stock_logs_actor
BEFORE INSERT ON public.stock_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_capture_stock_logs_actor();

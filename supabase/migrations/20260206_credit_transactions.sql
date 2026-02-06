-- Credit Transaction (Piutang) Support
-- Add columns to track credit transactions and their settlement

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS credit_customer_name TEXT,
ADD COLUMN IF NOT EXISTS credit_settled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS credit_payment_method TEXT CHECK (credit_payment_method IN ('cash', 'transfer'));

-- Create index for efficient credit transaction queries
CREATE INDEX IF NOT EXISTS idx_sales_is_credit ON public.sales(is_credit) WHERE is_credit = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN public.sales.is_credit IS 'True if this is a credit/debt transaction where customer has not paid yet';
COMMENT ON COLUMN public.sales.credit_customer_name IS 'Name of customer who owes money';
COMMENT ON COLUMN public.sales.credit_settled_at IS 'Timestamp when the credit was settled/paid';
COMMENT ON COLUMN public.sales.credit_payment_method IS 'Payment method used when settling the credit';

-- General Transactions for Main Office (Income/Expense outside sales/purchases)
CREATE TABLE IF NOT EXISTS public.other_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    description TEXT,
    proof_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.other_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" ON public.other_transactions 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.other_transactions 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.other_transactions 
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.other_transactions 
    FOR DELETE USING (auth.role() = 'authenticated');

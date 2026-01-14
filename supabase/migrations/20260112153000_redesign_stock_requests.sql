-- Add main_office role check
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('warehouse', 'cashier', 'auditor', 'admin', 'main_office'));

-- Create sequence for document numbers
CREATE TABLE IF NOT EXISTS public.document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'PMB' or 'BPB'
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    current_val INTEGER DEFAULT 0,
    UNIQUE(type, month, year)
);

-- Function to get next document number
CREATE OR REPLACE FUNCTION get_next_document_number(doc_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    curr_month INTEGER;
    curr_year INTEGER;
    next_val INTEGER;
    formatted_num TEXT;
BEGIN
    curr_month := EXTRACT(MONTH FROM NOW());
    curr_year := EXTRACT(YEAR FROM NOW());
    
    -- Insert or update sequence
    INSERT INTO public.document_sequences (type, month, year, current_val)
    VALUES (doc_type, curr_month, curr_year, 0)
    ON CONFLICT (type, month, year) DO NOTHING;
    
    -- Increment
    UPDATE public.document_sequences
    SET current_val = current_val + 1
    WHERE type = doc_type AND month = curr_month AND year = curr_year
    RETURNING current_val INTO next_val;
    
    -- Format: NNN/VMB/MM/YYYY/TYPE
    formatted_num := LPAD(next_val::TEXT, 3, '0') || '/VMB/' || LPAD(curr_month::TEXT, 2, '0') || '/' || curr_year || '/' || doc_type;
    
    RETURN formatted_num;
END;
$$;

-- New Stock Requests Table
CREATE TABLE IF NOT EXISTS public.stock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT, -- Will be filled on approval
    cashier_id UUID REFERENCES auth.users(id),
    cashier_name TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending_main_office', -- pending_main_office, pending_gudang, pending_shipment, completed, rejected
    main_office_id UUID REFERENCES auth.users(id),
    main_office_name TEXT,
    main_office_approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Request Items
CREATE TABLE IF NOT EXISTS public.stock_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_request_id UUID REFERENCES public.stock_requests(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit TEXT DEFAULT 'pcs',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Shipments (from Gudang)
CREATE TABLE IF NOT EXISTS public.stock_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_request_id UUID REFERENCES public.stock_requests(id),
    shipped_by UUID REFERENCES auth.users(id),
    shipped_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending_auditor', -- pending_auditor, approved, needs_revision
    auditor_id UUID REFERENCES auth.users(id),
    auditor_approved_at TIMESTAMPTZ,
    revision_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_shipment_id UUID REFERENCES public.stock_shipments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity_shipped INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goods Receipts (Penerimaan Barang)
CREATE TABLE IF NOT EXISTS public.goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT, -- Auto generated
    stock_request_id UUID REFERENCES public.stock_requests(id),
    stock_shipment_id UUID REFERENCES public.stock_shipments(id),
    received_by UUID REFERENCES auth.users(id),
    received_at TIMESTAMPTZ DEFAULT NOW(),
    photo_url TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow read access for authenticated users" ON public.stock_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users items" ON public.stock_request_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users shipments" ON public.stock_shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users receipts" ON public.goods_receipts FOR SELECT TO authenticated USING (true);

-- Insert policies
CREATE POLICY "Allow cashier insert request" ON public.stock_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow cashier insert items" ON public.stock_request_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow gudang insert shipment" ON public.stock_shipments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow gudang insert shipment items" ON public.stock_shipment_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow cashier insert receipt" ON public.goods_receipts FOR INSERT TO authenticated WITH CHECK (true);

-- Update policies
CREATE POLICY "Allow update request" ON public.stock_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow update shipment" ON public.stock_shipments FOR UPDATE TO authenticated USING (true);

-- Storage bucket for receipt photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Receipt photos are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'receipts' );

CREATE POLICY "Authenticated users can upload receipt photos"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'receipts' AND auth.role() = 'authenticated' );

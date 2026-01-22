-- Add customer_po_url column to surat_jalan table
ALTER TABLE surat_jalan 
ADD COLUMN IF NOT EXISTS customer_po_url TEXT;

-- Create documents bucket in Supabase Storage (run this in SQL or via dashboard)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('documents', 'documents', true)
-- ON CONFLICT (id) DO NOTHING;

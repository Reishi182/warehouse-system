-- Add delivery proof fields to surat_jalan table
ALTER TABLE surat_jalan 
ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT,
ADD COLUMN IF NOT EXISTS receiver_signature_url TEXT,
ADD COLUMN IF NOT EXISTS sender_signature_url TEXT,
ADD COLUMN IF NOT EXISTS receiver_name TEXT,
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS customer_po_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN surat_jalan.delivery_photo_url IS 'URL foto bukti pengiriman barang';
COMMENT ON COLUMN surat_jalan.receiver_signature_url IS 'URL tanda tangan digital penerima';
COMMENT ON COLUMN surat_jalan.sender_signature_url IS 'URL tanda tangan digital pengirim';
COMMENT ON COLUMN surat_jalan.receiver_name IS 'Nama penerima barang (yang menandatangani)';
COMMENT ON COLUMN surat_jalan.sender_name IS 'Nama pengirim barang (yang mengantar)';
COMMENT ON COLUMN surat_jalan.processed_by IS 'User ID kasir yang memproses setelah approval';
COMMENT ON COLUMN surat_jalan.processed_at IS 'Waktu kasir memproses';
COMMENT ON COLUMN surat_jalan.completed_by IS 'User ID gudang yang menyelesaikan dengan bukti';
COMMENT ON COLUMN surat_jalan.completed_at IS 'Waktu selesai dengan bukti';
COMMENT ON COLUMN surat_jalan.reviewed_by IS 'User ID main office yang mereview';
COMMENT ON COLUMN surat_jalan.reviewed_at IS 'Waktu review';
COMMENT ON COLUMN surat_jalan.review_notes IS 'Catatan review dari main office';

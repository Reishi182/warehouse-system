-- Add source_location column to surat_jalan table
ALTER TABLE surat_jalan 
ADD COLUMN IF NOT EXISTS source_location TEXT DEFAULT 'gudang';

-- Add pending_toko status support (no ALTER needed if using TEXT for status)
-- Index for filtering by source location
CREATE INDEX IF NOT EXISTS idx_surat_jalan_source_location ON surat_jalan(source_location);

-- Menambahkan kolom location pada stock_opname_items
-- Diperlukan karena dalam 1 sesi stok opname, pengguna dapat menghitung stok gudang dan toko secara bersamaan,
-- sehingga setiap item/baris merepresentasikan lokasi spesifik (gudang atau toko).

ALTER TABLE stock_opname_items 
ADD COLUMN IF NOT EXISTS location TEXT CHECK (location IN ('gudang', 'toko'));

-- Optional: Update default the location based on the session location if migrating old data
-- (Diabaikan karena ini masih fase development awal)

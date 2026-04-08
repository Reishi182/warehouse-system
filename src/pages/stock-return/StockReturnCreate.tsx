import MainLayout from '@/components/layout/MainLayout';
import { RotateCcw } from 'lucide-react';

export default function StockReturnCreate() {
  return (
    <MainLayout title="Retur ke Gudang" subtitle="Buat permintaan retur stok dari toko ke gudang">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RotateCcw className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Buat Retur Stok</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Halaman ini sedang dalam pemeliharaan. Fitur retur barang dari toko ke gudang akan segera tersedia.
        </p>
      </div>
    </MainLayout>
  );
}

import MainLayout from '@/components/layout/MainLayout';
import { ClipboardList } from 'lucide-react';

export default function StockOpname() {
    return (
        <MainLayout title="Stok Opname" subtitle="Pengecekan dan penyesuaian stok">
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Stok Opname</h2>
                <p className="text-muted-foreground">Halaman ini sedang dalam pengembangan.</p>
            </div>
        </MainLayout>
    );
}

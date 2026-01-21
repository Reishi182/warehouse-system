import MainLayout from '@/components/layout/MainLayout';
import { History } from 'lucide-react';

export default function CashHistory() {
    return (
        <MainLayout title="Riwayat Kas" subtitle="Lihat riwayat transaksi kas">
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <History className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Riwayat Kas</h2>
                <p className="text-muted-foreground">Halaman ini sedang dalam pengembangan.</p>
            </div>
        </MainLayout>
    );
}

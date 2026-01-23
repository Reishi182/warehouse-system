import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { useSuratJalanB2B } from '@/hooks/useSuratJalanB2B';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Package, Truck, ArrowRight, Clock, CheckCircle, List, Store } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

export default function SuratJalanCashier() {
    const { user } = useAuth();
    const { suratJalans, processOrder, isLoading } = useSuratJalanB2B();
    const [selectedSj, setSelectedSj] = useState<any | null>(null);

    if (isLoading) {
        return (
            <MainLayout title="Pengiriman Toko (Kasir)" subtitle="Proses surat jalan dari Main Office">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    // Filter for pending STORE orders (source_location = toko)
    const pendingOrders = suratJalans.filter((sj: any) =>
        (sj.status === 'pending') &&
        (sj.source_location === 'toko')
    );

    // Processing/Completed in this context (for history viewing)
    const completedOrders = suratJalans.filter((sj: any) =>
        sj.status === 'completed' &&
        (sj.source_location === 'toko')
    );

    const handleProcessOrder = () => {
        if (!selectedSj || !user) return;

        processOrder.mutate({
            suratJalanId: selectedSj.id,
            processedBy: user.id,
            sourceLocation: 'toko'
        }, {
            onSuccess: () => {
                setSelectedSj(null);
            }
        });
    };

    return (
        <MainLayout title="Pengiriman Toko (Kasir)" subtitle="Proses surat jalan dari Main Office (Toko)">
            <div className="space-y-8">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Perlu Diproses"
                        value={pendingOrders.length}
                        icon={<Truck className="w-5 h-5" />}
                        subtitle={pendingOrders.length > 0 ? "menunggu pengiriman" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Selesai"
                        value={completedOrders.length}
                        icon={<CheckCircle className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Total"
                        value={suratJalans.filter((sj: any) => sj.source_location === 'toko').length}
                        icon={<List className="w-5 h-5" />}
                    />
                </StatsGrid>

                {/* Pending Section */}
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Store className="h-5 w-5 text-orange-500" />
                        Perlu Diproses ({pendingOrders.length})
                    </h3>

                    <div className="grid gap-4">
                        {pendingOrders.map((sj: any) => (
                            <div key={sj.id} className="bg-card border rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg">{sj.number}</span>
                                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Menunggu Pengiriman</span>
                                    </div>
                                    <p className="text-muted-foreground font-medium">{sj.recipient_name}</p>
                                    <p className="text-sm text-muted-foreground">{sj.recipient_address}</p>

                                    <div className="mt-4 bg-muted/50 p-3 rounded-md">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Daftar Barang</p>
                                        <ul className="text-sm space-y-1">
                                            {sj.items?.map((item: any) => (
                                                <li key={item.id} className="flex gap-2">
                                                    <span className="font-mono text-primary font-bold">{item.quantity}x</span>
                                                    <span>{item.product_name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <Button size="lg" onClick={() => setSelectedSj(sj)}>
                                    <Truck className="mr-2 h-4 w-4" />
                                    Proses & Kirim
                                </Button>
                            </div>
                        ))}

                        {pendingOrders.length === 0 && (
                            <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                                <p className="text-muted-foreground">Tidak ada pesanan Toko yang perlu diproses</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* History */}
                <div>
                    <h3 className="text-lg font-bold mb-4 text-muted-foreground">Riwayat Selesai</h3>
                    <div className="grid gap-4 opacity-75">
                        {completedOrders.slice(0, 5).map((sj: any) => (
                            <div key={sj.id} className="bg-card border rounded-lg p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{sj.number}</p>
                                    <p className="text-sm text-muted-foreground">Ke: {sj.recipient_name}</p>
                                    <p className="text-xs text-green-600 mt-1">Selesai</p>
                                </div>
                                <div className="text-right">
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                        Terkirim
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Confirmation Dialog */}
            <Dialog open={!!selectedSj} onOpenChange={(open) => !open && setSelectedSj(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Pengiriman Toko</DialogTitle>
                        <DialogDescription>
                            Tindakan ini akan <strong>mengurangi stok toko</strong> dan menyelesaikan pesanan.
                            Pastikan barang fisik sudah siap.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSj && (
                        <div className="bg-muted p-4 rounded-md my-2 text-sm">
                            <p><b>Penerima:</b> {selectedSj.recipient_name}</p>
                            <p><b>Total Item:</b> {selectedSj.items?.length} jenis barang</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSj(null)}>Batal</Button>
                        <Button
                            onClick={handleProcessOrder}
                            disabled={processOrder.isPending}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {processOrder.isPending ? 'Memproses...' : 'Ya, Proses & Kirim'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

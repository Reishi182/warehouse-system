
import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { useSuratJalanB2B } from '@/hooks/useSuratJalanB2B';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Package, Truck, ArrowRight, Clock, CheckCircle, List } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function SuratJalanWarehouse() {
    const { user } = useAuth();
    const { suratJalans, createIssueNote, isLoading } = useSuratJalanB2B();
    const [selectedSj, setSelectedSj] = useState<any | null>(null);

    if (isLoading) {
        return (
            <MainLayout title="Pengiriman B2B (Gudang)" subtitle="Proses surat jalan dari Main Office">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    // Filter for pending warehouse orders
    const pendingOrders = suratJalans.filter((sj: any) => sj.status === 'pending_warehouse');
    const processingOrders = suratJalans.filter((sj: any) => sj.status === 'processing');

    const handleCreateIssueNote = () => {
        if (!selectedSj || !user) return;

        createIssueNote.mutate({
            suratJalanId: selectedSj.id,
            issuedBy: user.id
        }, {
            onSuccess: () => {
                setSelectedSj(null);
            }
        });
    };

    return (
        <MainLayout title="Pengiriman B2B (Gudang)" subtitle="Proses surat jalan dari Main Office">
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
                        title="Sedang Proses"
                        value={processingOrders.length}
                        icon={<Clock className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Total"
                        value={suratJalans.length}
                        icon={<List className="w-5 h-5" />}
                    />
                </StatsGrid>

                {/* Pending Section */}
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5 text-orange-500" />
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
                                    Buat Surat Pengeluaran
                                </Button>
                            </div>
                        ))}

                        {pendingOrders.length === 0 && (
                            <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                                <p className="text-muted-foreground">Tidak ada pesanan yang perlu diproses</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Processing/Completed History */}
                <div>
                    <h3 className="text-lg font-bold mb-4 text-muted-foreground">Sedang Diproses / Selesai</h3>
                    <div className="grid gap-4 opacity-75">
                        {processingOrders.map((sj: any) => (
                            <div key={sj.id} className="bg-card border rounded-lg p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{sj.number}</p>
                                    <p className="text-sm text-muted-foreground">Ke: {sj.recipient_name}</p>
                                    {sj.issue_note && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            No. SP: {sj.issue_note.issue_number} (Menunggu Auditor)
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                        Menunggu Verifikasi
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
                        <DialogTitle>Konfirmasi Pengiriman</DialogTitle>
                        <DialogDescription>
                            Anda akan membuat <b>Surat Pengeluaran</b> untuk pesanan ini.
                            Pastikan semua barang telah dimuat dan siap dikirim.
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
                        <Button onClick={handleCreateIssueNote}>
                            Buat Surat Pengeluaran
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

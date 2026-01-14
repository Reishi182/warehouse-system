import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { useSuratJalanB2B } from '@/hooks/useSuratJalanB2B';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    ClipboardCheck,
    Check,
    AlertTriangle,
    Package,
    User,
    Calendar,
    FileText,
    ArrowRight,
    CheckCircle2,
    XCircle,
    Truck
} from 'lucide-react';
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

export default function SuratJalanAuditor() {
    const { user } = useAuth();
    const { suratJalans, verifyIssueNote, isLoading } = useSuratJalanB2B();
    const [selectedSj, setSelectedSj] = useState<any | null>(null);

    if (isLoading) {
        return (
            <MainLayout title="Verifikasi B2B" subtitle="Verifikasi pengeluaran barang">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    // Filter for orders needing verification
    const verificationNeeded = suratJalans.filter(
        (sj: any) => sj.status === 'processing' && sj.issue_note?.status === 'pending_auditor'
    );
    const history = suratJalans.filter(
        (sj: any) => sj.status === 'completed' || sj.status === 'cancelled'
    );

    const handleVerify = () => {
        if (!selectedSj || !user || !selectedSj.issue_note) return;

        verifyIssueNote.mutate(
            {
                issueNoteId: selectedSj.issue_note.id,
                suratJalanId: selectedSj.id,
                auditorId: user.id,
            },
            {
                onSuccess: () => {
                    setSelectedSj(null);
                },
            }
        );
    };

    return (
        <MainLayout title="Verifikasi Pengiriman B2B" subtitle="Audit dan verifikasi pengiriman barang keluar">
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Perlu Verifikasi"
                        value={verificationNeeded.length}
                        icon={<ClipboardCheck className="w-5 h-5" />}
                        subtitle={verificationNeeded.length > 0 ? "menunggu audit" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Selesai"
                        value={history.filter((s: any) => s.status === 'completed').length}
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Dibatalkan"
                        value={history.filter((s: any) => s.status === 'cancelled').length}
                        icon={<XCircle className="w-5 h-5" />}
                        subtitleType="error"
                    />
                </StatsGrid>

                {/* Verification Section */}
                <Card className="rounded-2xl border-0 shadow-lg">
                    <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            Menunggu Verifikasi
                            {verificationNeeded.length > 0 && (
                                <Badge variant="secondary" className="rounded-full ml-2 bg-amber-100 text-amber-700">
                                    {verificationNeeded.length} pending
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {verificationNeeded.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <div className="p-4 rounded-full bg-green-500/10 mb-4">
                                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                                </div>
                                <p className="text-lg font-medium">Semua pengiriman telah diverifikasi</p>
                                <p className="text-sm">Tidak ada item yang perlu ditinjau</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {verificationNeeded.map((sj: any) => (
                                    <div
                                        key={sj.id}
                                        className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex flex-col lg:flex-row gap-6">
                                            {/* Left: Document Info */}
                                            <div className="flex-1 space-y-4">
                                                {/* Document Numbers */}
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10">
                                                        <FileText className="w-4 h-4 text-primary" />
                                                        <span className="font-bold">{sj.number}</span>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10">
                                                        <Truck className="w-4 h-4 text-blue-600" />
                                                        <span className="font-bold text-blue-600">{sj.issue_note?.issue_number}</span>
                                                    </div>
                                                </div>

                                                {/* Details Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                    <div className="flex items-start gap-2">
                                                        <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Penerima</p>
                                                            <p className="font-medium text-sm">{sj.recipient_name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Total Item</p>
                                                            <p className="font-medium text-sm">{sj.items?.length || 0} produk</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Tanggal</p>
                                                            <p className="font-medium text-sm">
                                                                {format(new Date(sj.created_at), 'dd MMM yyyy', { locale: idLocale })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Items List */}
                                                <div className="rounded-xl bg-muted/30 p-4">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                                                        <ClipboardCheck className="w-4 h-4" />
                                                        Item untuk Diverifikasi
                                                    </p>
                                                    <ScrollArea className="max-h-32">
                                                        <div className="space-y-2">
                                                            {sj.items?.map((item: any) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="flex justify-between items-center py-2 px-3 rounded-lg bg-background hover:bg-muted/50 transition-colors"
                                                                >
                                                                    <div>
                                                                        <p className="font-medium text-sm">{item.product_name}</p>
                                                                        <p className="text-xs text-muted-foreground">{item.barcode}</p>
                                                                    </div>
                                                                    <Badge variant="secondary" className="rounded-full">
                                                                        {item.quantity} unit
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                            </div>

                                            {/* Right: Action Button */}
                                            <div className="flex flex-col justify-center gap-2 min-w-[160px]">
                                                <Button
                                                    size="lg"
                                                    className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25"
                                                    onClick={() => setSelectedSj(sj)}
                                                >
                                                    <Check className="mr-2 h-5 w-5" />
                                                    Verifikasi
                                                </Button>
                                                <p className="text-xs text-center text-muted-foreground">
                                                    Klik untuk menyetujui pengeluaran stok
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* History Section */}
                <Card className="rounded-2xl border-0 shadow-lg">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <div className="p-2 rounded-xl bg-muted">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                            </div>
                            Riwayat Verifikasi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p>Belum ada riwayat verifikasi</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">No. Surat Jalan</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Penerima</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {history.map((sj: any) => (
                                            <tr key={sj.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-semibold">{sj.number}</span>
                                                </td>
                                                <td className="px-4 py-3">{sj.recipient_name}</td>
                                                <td className="px-4 py-3">
                                                    {sj.status === 'completed' ? (
                                                        <Badge className="rounded-full bg-green-100 text-green-700 hover:bg-green-100">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Selesai
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="rounded-full bg-red-100 text-red-700 hover:bg-red-100">
                                                            <XCircle className="w-3 h-3 mr-1" />
                                                            Dibatalkan
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {format(new Date(sj.created_at), 'dd MMM yyyy', { locale: idLocale })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={!!selectedSj} onOpenChange={(open) => !open && setSelectedSj(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <div className="mx-auto p-3 rounded-full bg-amber-100 mb-4">
                            <AlertTriangle className="w-8 h-8 text-amber-600" />
                        </div>
                        <DialogTitle className="text-center text-xl">Konfirmasi Verifikasi</DialogTitle>
                        <DialogDescription className="text-center">
                            Tindakan ini akan <strong>mengurangi stok gudang</strong> secara permanen dan menyelesaikan
                            proses pesanan ini.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSj && (
                        <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">No. Surat Jalan</span>
                                <span className="font-semibold">{selectedSj.number}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Penerima</span>
                                <span className="font-semibold">{selectedSj.recipient_name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Item</span>
                                <span className="font-semibold">{selectedSj.items?.length || 0} produk</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setSelectedSj(null)} className="rounded-xl">
                            Batal
                        </Button>
                        <Button
                            className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            onClick={handleVerify}
                            disabled={verifyIssueNote.isPending}
                        >
                            {verifyIssueNote.isPending ? 'Memproses...' : 'Ya, Setujui Pengeluaran'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

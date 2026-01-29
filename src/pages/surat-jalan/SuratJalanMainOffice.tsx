
import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { ClickableImage } from '@/components/common/ImageLightbox';
import { useSuratJalanB2B } from '@/hooks/useSuratJalanB2B';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { FileText, CheckCircle, Clock, Package, TruckIcon, XCircle, Store, Warehouse, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function SuratJalanMainOffice() {
    const { user } = useAuth();
    const { suratJalans, reviewSuratJalan, cancelSuratJalan, isLoading } = useSuratJalanB2B();
    const [selectedSj, setSelectedSj] = useState<any | null>(null);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [reviewNotes, setReviewNotes] = useState('');
    const [isApproving, setIsApproving] = useState(true);

    if (isLoading) {
        return (
            <MainLayout title="Review Surat Jalan" subtitle="Review dan approve surat jalan dari Kasir">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    // Filter orders by status
    const pendingReview = suratJalans.filter((sj: any) => sj.status === 'pending_review');
    const approved = suratJalans.filter((sj: any) => sj.status === 'approved');
    const processing = suratJalans.filter((sj: any) => sj.status === 'processing');
    const completed = suratJalans.filter((sj: any) => sj.status === 'completed');
    const rejected = suratJalans.filter((sj: any) => sj.status === 'rejected');

    const stats = {
        pendingReview: pendingReview.length,
        approved: approved.length,
        processing: processing.length,
        completed: completed.length,
    };

    const handleOpenReview = (sj: any, approve: boolean) => {
        setSelectedSj(sj);
        setIsApproving(approve);
        setReviewNotes('');
        setReviewDialogOpen(true);
    };

    const handleSubmitReview = () => {
        if (!selectedSj || !user) return;

        reviewSuratJalan.mutate({
            suratJalanId: selectedSj.id,
            reviewedBy: user.id,
            approved: isApproving,
            notes: reviewNotes.trim() || undefined,
        }, {
            onSuccess: () => {
                setReviewDialogOpen(false);
                setSelectedSj(null);
                setReviewNotes('');
            }
        });
    };

    const handleViewDetail = (sj: any) => {
        setSelectedSj(sj);
        setDetailDialogOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_review':
                return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"><Clock className="h-3 w-3" /> Menunggu Review</span>;
            case 'approved':
                return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Disetujui</span>;
            case 'processing':
                return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"><TruckIcon className="h-3 w-3" /> Diproses</span>;
            case 'completed':
                return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Selesai</span>;
            case 'rejected':
                return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"><XCircle className="h-3 w-3" /> Ditolak</span>;
            case 'cancelled':
                return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Dibatalkan</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">{status}</span>;
        }
    };

    return (
        <MainLayout title="Review Surat Jalan" subtitle="Review dan approve surat jalan dari Kasir">
            <div className="space-y-6">
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Perlu Review"
                        value={stats.pendingReview}
                        icon={<Clock className="w-5 h-5" />}
                        subtitle={stats.pendingReview > 0 ? "butuh perhatian" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Disetujui"
                        value={stats.approved}
                        icon={<CheckCircle className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Dalam Pengiriman"
                        value={stats.processing}
                        icon={<TruckIcon className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Selesai"
                        value={stats.completed}
                        icon={<Package className="w-5 h-5" />}
                        subtitleType="success"
                    />
                </StatsGrid>

                {/* Pending Review - Priority Section */}
                {pendingReview.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            Perlu Review ({pendingReview.length})
                        </h3>
                        <div className="grid gap-4">
                            {pendingReview.map((sj: any) => (
                                <div key={sj.id} className="bg-card border-2 border-yellow-300 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="font-bold text-xl">{sj.number}</span>
                                                {getStatusBadge(sj.status)}
                                                {sj.source_location === 'toko' ? (
                                                    <span className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                        <Store className="h-3 w-3" /> Dari Toko
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                        <Warehouse className="h-3 w-3" /> Dari Gudang
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Penerima</p>
                                                    <p className="font-semibold">{sj.recipient_name}</p>
                                                    <p className="text-sm text-muted-foreground">{sj.recipient_address}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Dibuat</p>
                                                    <p className="font-semibold">{format(new Date(sj.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}</p>
                                                </div>
                                            </div>

                                            {/* Items Preview */}
                                            <div className="mt-4 bg-muted/50 p-3 rounded-md">
                                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Daftar Barang ({sj.items?.length || 0} item)</p>
                                                <ul className="text-sm space-y-1">
                                                    {sj.items?.slice(0, 3).map((item: any) => (
                                                        <li key={item.id} className="flex gap-2">
                                                            <span className="font-mono text-primary font-bold">{item.quantity}x</span>
                                                            <span>{item.product_name}</span>
                                                        </li>
                                                    ))}
                                                    {sj.items?.length > 3 && (
                                                        <li className="text-xs text-muted-foreground">+{sj.items.length - 3} item lainnya</li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 justify-center">
                                            <Button
                                                onClick={() => handleOpenReview(sj, true)}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <ThumbsUp className="mr-2 h-4 w-4" />
                                                Setujui
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleOpenReview(sj, false)}
                                                className="border-red-300 text-red-600 hover:bg-red-50"
                                            >
                                                <ThumbsDown className="mr-2 h-4 w-4" />
                                                Tolak
                                            </Button>
                                            <Button variant="ghost" onClick={() => handleViewDetail(sj)} size="sm">
                                                <Eye className="mr-2 h-4 w-4" />
                                                Detail
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State for Pending */}
                {pendingReview.length === 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                        <h3 className="font-bold text-green-800 dark:text-green-200">Tidak Ada Yang Perlu Direview</h3>
                        <p className="text-sm text-green-600 dark:text-green-400">Semua surat jalan sudah ditinjau</p>
                    </div>
                )}

                {/* All Orders Overview */}
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Semua Surat Jalan
                    </h3>
                    <div className="grid gap-3">
                        {suratJalans.map((sj: any) => (
                            <div
                                key={sj.id}
                                className="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => handleViewDetail(sj)}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{sj.number}</span>
                                                {getStatusBadge(sj.status)}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{sj.recipient_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        {format(new Date(sj.created_at), 'dd MMM yyyy', { locale: idLocale })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {suratJalans.length === 0 && (
                            <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                                <p className="text-muted-foreground">Belum ada surat jalan</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Review Dialog */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className={isApproving ? 'text-green-700' : 'text-red-700'}>
                            {isApproving ? '✅ Setujui Surat Jalan' : '❌ Tolak Surat Jalan'}
                        </DialogTitle>
                        <DialogDescription>
                            {isApproving
                                ? 'Surat jalan akan diteruskan ke Kasir untuk diproses.'
                                : 'Surat jalan akan ditolak dan dikembalikan ke Kasir.'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSj && (
                        <div className="bg-muted p-4 rounded-md my-2 text-sm space-y-1">
                            <p><b>No. Surat Jalan:</b> {selectedSj.number}</p>
                            <p><b>Penerima:</b> {selectedSj.recipient_name}</p>
                            <p><b>Total Item:</b> {selectedSj.items?.length} jenis barang</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>{isApproving ? 'Catatan (opsional)' : 'Alasan Penolakan'}</Label>
                        <Textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder={isApproving ? 'Tambahkan catatan jika diperlukan...' : 'Jelaskan alasan penolakan...'}
                            className="rounded-xl"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Batal</Button>
                        <Button
                            onClick={handleSubmitReview}
                            disabled={reviewSuratJalan.isPending || (!isApproving && !reviewNotes.trim())}
                            className={isApproving ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {reviewSuratJalan.isPending ? 'Memproses...' : (isApproving ? 'Setujui' : 'Tolak')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail Surat Jalan</DialogTitle>
                    </DialogHeader>

                    {selectedSj && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold">{selectedSj.number}</span>
                                {getStatusBadge(selectedSj.status)}
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
                                <div>
                                    <p className="text-sm text-muted-foreground">Penerima</p>
                                    <p className="font-semibold">{selectedSj.recipient_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Alamat</p>
                                    <p className="font-semibold">{selectedSj.recipient_address || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Telepon</p>
                                    <p className="font-semibold">{selectedSj.recipient_phone || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Lokasi Barang</p>
                                    <p className="font-semibold">{selectedSj.source_location === 'toko' ? '🏪 Toko' : '📦 Gudang'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Dibuat</p>
                                    <p className="font-semibold">{format(new Date(selectedSj.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}</p>
                                </div>
                                {selectedSj.reviewed_at && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Direview</p>
                                        <p className="font-semibold">{format(new Date(selectedSj.reviewed_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}</p>
                                    </div>
                                )}
                            </div>

                            {selectedSj.review_notes && (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-sm font-medium text-blue-700">Catatan Review:</p>
                                    <p className="text-sm text-blue-600">{selectedSj.review_notes}</p>
                                </div>
                            )}

                            <div>
                                <h4 className="font-semibold mb-2">Daftar Barang</h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Produk</th>
                                                <th className="px-4 py-2 text-center">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {selectedSj.items?.map((item: any) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-2">{item.product_name}</td>
                                                    <td className="px-4 py-2 text-center font-mono font-bold">{item.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Delivery Proof (if completed) */}
                            {selectedSj.status === 'completed' && (
                                <div className="bg-green-50 p-4 rounded-lg space-y-3">
                                    <h4 className="font-semibold text-green-800">Bukti Pengiriman</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-green-700">Nama Pengirim:</p>
                                            <p className="font-semibold">{selectedSj.sender_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-green-700">Nama Penerima:</p>
                                            <p className="font-semibold">{selectedSj.receiver_name || '-'}</p>
                                        </div>
                                    </div>
                                    {selectedSj.delivery_photo_url && (
                                        <div>
                                            <p className="text-green-700 text-sm mb-1">Foto Bukti: <span className="text-xs text-muted-foreground">(klik untuk zoom)</span></p>
                                            <ClickableImage
                                                src={selectedSj.delivery_photo_url}
                                                alt="Bukti pengiriman"
                                                imgClassName="rounded-lg max-h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                            />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedSj.sender_signature_url && (
                                            <div>
                                                <p className="text-green-700 text-sm mb-1">Tanda Tangan Pengirim:</p>
                                                <ClickableImage
                                                    src={selectedSj.sender_signature_url}
                                                    alt="TTD Pengirim"
                                                    imgClassName="rounded-lg border bg-white max-h-24 cursor-pointer hover:opacity-90 transition-opacity"
                                                />
                                            </div>
                                        )}
                                        {selectedSj.receiver_signature_url && (
                                            <div>
                                                <p className="text-green-700 text-sm mb-1">Tanda Tangan Penerima:</p>
                                                <ClickableImage
                                                    src={selectedSj.receiver_signature_url}
                                                    alt="TTD Penerima"
                                                    imgClassName="rounded-lg border bg-white max-h-24 cursor-pointer hover:opacity-90 transition-opacity"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

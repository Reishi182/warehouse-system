
import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import StatusBadge from '@/components/common/StatusBadge';
import LocationBadge from '@/components/common/LocationBadge';
import { ClickableImage } from '@/components/common/ImageLightbox';
import { useSuratJalanB2B } from '@/hooks/useSuratJalanB2B';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { FileText, CheckCircle, Clock, Package, TruckIcon, Eye, ThumbsUp, ThumbsDown, Ban, User, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function SuratJalanMainOffice() {
    const { user } = useAuth();
    const { suratJalans, reviewSuratJalan, cancelSuratJalan, isLoading } = useSuratJalanB2B();
    const [selectedSj, setSelectedSj] = useState<any | null>(null);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [reviewNotes, setReviewNotes] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [isApproving, setIsApproving] = useState(true);
    const [sjToCancel, setSjToCancel] = useState<any | null>(null);

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

    const stats = {
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

    const handleCancelSJ = (sj: any) => {
        setSjToCancel(sj);
        setCancelReason('');
        setCancelDialogOpen(true);
    };

    const confirmCancelSJ = () => {
        if (!sjToCancel) return;
        cancelSuratJalan.mutate(sjToCancel.id, {
            onSuccess: () => {
                setCancelDialogOpen(false);
                setSjToCancel(null);
                setCancelReason('');
            }
        });
    };

    // ── BeautifulTable columns ──────────────────────────────────────────────
    const tableColumns: Column<any>[] = [
        {
            header: 'No. Surat Jalan',
            accessorKey: 'number',
            cell: (row) => <span className="font-semibold">{row.number}</span>,
        },
        {
            header: 'Penerima',
            accessorKey: 'recipient_name',
            cell: (row) => (
                <div>
                    <p className="font-medium">{row.recipient_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.recipient_address}</p>
                </div>
            ),
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (row) =>
                row.created_at
                    ? format(new Date(row.created_at), 'dd MMM yyyy', { locale: idLocale })
                    : '-',
        },
        {
            header: 'Lokasi',
            accessorKey: 'source_location',
            cell: (row) => <LocationBadge location={row.source_location} />,
        },
        {
            header: 'Status',
            accessorKey: 'status',
            filterable: true,
            cell: (row) => <StatusBadge status={row.status} showIcon />,
        },
        {
            header: 'Aksi',
            accessorKey: 'id',
            sortable: false,
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => handleViewDetail(row)}
                    >
                        <Eye className="w-4 h-4 mr-1" />
                        Detail
                    </Button>
                    {row.status === 'pending_review' && (
                        <>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleOpenReview(row, true)}
                            >
                                <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                                Setujui
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleOpenReview(row, false)}
                            >
                                <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                                Tolak
                            </Button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <MainLayout title="Review Surat Jalan" subtitle="Review dan approve surat jalan dari Kasir">
            <div className="space-y-6">
                <StatsGrid columns={3}>
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
                                                <StatusBadge status={sj.status} showIcon />
                                                <LocationBadge location={sj.source_location} />
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

                {/* All Surat Jalan — BeautifulTable */}
                <BeautifulTable
                    data={suratJalans}
                    columns={tableColumns}
                    title="Semua Surat Jalan"
                    subtitle="Daftar seluruh surat jalan"
                    variant="premium"
                    hideSelection
                    emptyState={{
                        icon: <FileText className="w-8 h-8 text-white" />,
                        title: 'Belum Ada Surat Jalan',
                        description: 'Surat jalan yang dibuat kasir akan muncul di sini.',
                    }}
                />
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
                <DialogContent className="max-w-3xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                    {selectedSj && (
                        <div className="flex flex-col h-full max-h-[90vh]">
                            {/* Premium Gradient Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative shrink-0">
                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                    <FileText className="w-32 h-32" />
                                </div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            Detail Surat Jalan
                                        </h2>
                                        <p className="text-blue-100 flex items-center gap-1.5 mt-1 font-mono text-sm">
                                            {selectedSj.number || 'Memuat...'}
                                        </p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold border border-white/30 shadow-sm flex items-center gap-2">
                                        {selectedSj.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                                        {selectedSj.status === 'processing' && <TruckIcon className="w-4 h-4" />}
                                        {selectedSj.status === 'pending_review' && <Clock className="w-4 h-4" />}
                                        {selectedSj.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                                        {selectedSj.status === 'pending_review' ? 'Menunggu Review' :
                                         selectedSj.status === 'approved' ? 'Disetujui' :
                                         selectedSj.status === 'processing' ? 'Dalam Pengiriman' :
                                         selectedSj.status === 'completed' ? 'Selesai' :
                                         selectedSj.status === 'rejected' ? 'Ditolak' : selectedSj.status}
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                {/* Info Grid 1 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-blue-500" /> Tanggal Dibuat
                                        </p>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                                            {selectedSj.created_at ? format(new Date(selectedSj.created_at), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {selectedSj.created_at ? format(new Date(selectedSj.created_at), 'HH:mm', { locale: idLocale }) : '-'} WIB
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5 text-blue-500" /> Informasi Pengiriman
                                        </p>
                                        <div className="mt-1">
                                            <LocationBadge location={selectedSj.source_location} />
                                        </div>
                                    </div>
                                </div>

                                {/* Info Grid 2 */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50/80 dark:bg-slate-700/50 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-500" />
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                            Informasi Penerima
                                        </h3>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Nama Penerima</p>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedSj.recipient_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Nomor Telepon</p>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedSj.recipient_phone || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Alamat Lengkap</p>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedSj.recipient_address || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Review Notes */}
                                {selectedSj.review_notes && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm overflow-hidden">
                                        <div className="bg-indigo-100/50 dark:bg-indigo-900/20 px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-indigo-500" />
                                            <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                                                Catatan Review
                                            </h3>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-sm text-indigo-900 dark:text-indigo-100 italic leading-relaxed">"{selectedSj.review_notes}"</p>
                                            {selectedSj.reviewed_at && (
                                                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-2">
                                                    Direview pada {format(new Date(selectedSj.reviewed_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Items Table */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-blue-500" />
                                        Daftar Barang Dikirim ({selectedSj.items?.length || 0} item)
                                    </h3>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {selectedSj.items?.map((item: any, idx: number) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg">
                                                            <Package className="w-4 h-4 text-blue-500" />
                                                        </div>
                                                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                                            {item.product_name || 'Produk tidak diketahui'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-11 sm:pl-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold px-3 py-1 rounded-lg min-w-[3rem]">
                                                                {item.quantity}
                                                            </span>
                                                            <span className="text-xs font-medium text-gray-500 uppercase w-8 text-left">{item.unit || 'pcs'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!selectedSj.items || selectedSj.items.length === 0) && (
                                                <div className="p-8 text-center text-muted-foreground text-sm">
                                                    Tidak ada data barang
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Delivery Proof */}
                                {selectedSj.status === 'completed' && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm overflow-hidden mt-6">
                                        <div className="bg-emerald-100/50 dark:bg-emerald-900/20 px-4 py-3 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                                            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                                                Bukti Pengiriman Selesai
                                            </h3>
                                        </div>
                                        
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30">
                                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Nama Pengirim</p>
                                                    <p className="font-semibold text-sm">{selectedSj.sender_name || '-'}</p>
                                                    
                                                    {selectedSj.sender_signature_url && (
                                                        <div className="mt-3">
                                                            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mb-2">Tanda Tangan:</p>
                                                            <div className="bg-white rounded-lg p-2 border border-emerald-100 inline-block">
                                                                <ClickableImage
                                                                    src={selectedSj.sender_signature_url}
                                                                    alt="TTD Pengirim"
                                                                    imgClassName="max-h-20 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30">
                                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">Nama Penerima</p>
                                                    <p className="font-semibold text-sm">{selectedSj.receiver_name || '-'}</p>
                                                    
                                                    {selectedSj.receiver_signature_url && (
                                                        <div className="mt-3">
                                                            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mb-2">Tanda Tangan:</p>
                                                            <div className="bg-white rounded-lg p-2 border border-emerald-100 inline-block">
                                                                <ClickableImage
                                                                    src={selectedSj.receiver_signature_url}
                                                                    alt="TTD Penerima"
                                                                    imgClassName="max-h-20 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {selectedSj.delivery_photo_url && (
                                            <div className="px-6 pb-6 pt-0">
                                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                                                    <Camera className="w-4 h-4" />
                                                    Foto Bukti Pengiriman
                                                </p>
                                                <div className="inline-block rounded-xl overflow-hidden border-4 border-white shadow-md">
                                                    <ClickableImage
                                                        src={selectedSj.delivery_photo_url}
                                                        alt="Bukti pengiriman"
                                                        imgClassName="max-h-64 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0">
                                {['pending_review', 'approved', 'processing'].includes(selectedSj.status) && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setDetailDialogOpen(false);
                                            handleCancelSJ(selectedSj);
                                        }}
                                        className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 gap-2"
                                    >
                                        <Ban className="mr-1 h-4 w-4" />
                                        Batalkan SJ
                                    </Button>
                                )}
                                <Button variant="outline" className="rounded-xl px-6" onClick={() => setDetailDialogOpen(false)}>
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Cancel SJ Confirmation Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Ban className="w-5 h-5" />
                            Batalkan Surat Jalan
                        </DialogTitle>
                        <DialogDescription>
                            Tindakan ini akan membatalkan surat jalan dan mengembalikan stok yang sudah direservasi (jika ada).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <p className="text-muted-foreground">
                            Anda yakin ingin membatalkan SJ <span className="font-semibold text-foreground">{sjToCancel?.number}</span>?
                        </p>
                        <div className="space-y-2">
                            <Label>Alasan Pembatalan (opsional)</Label>
                            <Textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Masukkan alasan pembatalan..."
                                className="rounded-xl"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                                Kembali
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmCancelSJ}
                                disabled={cancelSuratJalan.isPending}
                            >
                                {cancelSuratJalan.isPending ? 'Membatalkan...' : 'Ya, Batalkan SJ'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

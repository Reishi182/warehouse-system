import { useState, useMemo } from 'react';
import { Check, X, Package, Clock, AlertCircle, Eye, Sparkles, FileText, Calendar, User, ShoppingCart } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
;
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockReturns } from '@/hooks/useStockReturns';
import { StockReturn } from '@/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';

function ReturnDetailDialog({ stockReturn }: { stockReturn: StockReturn }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-xl gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all">
                    <Eye className="w-4 h-4" /> Detail
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl border-2 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                <DialogHeader className="relative z-10 pb-4 border-b">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg shadow-primary/10">
                                <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Detail Retur Stok</DialogTitle>
                                <DialogDescription className="font-mono text-sm mt-0.5">
                                    {stockReturn.return_number || 'Menunggu Nomor...'}
                                </DialogDescription>
                            </div>
                        </div>
                        <StatusBadge status={stockReturn.status} showIcon />
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4 relative z-10">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-muted/30 border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Tanggal</span>
                            </div>
                            <p className="font-semibold">{format(new Date(stockReturn.created_at), 'dd MMM yyyy', { locale: idLocale })}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/30 border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <User className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Kasir</span>
                            </div>
                            <p className="font-semibold">{stockReturn.cashier_name}</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-blue-500/20">
                                <Eye className="w-4 h-4 text-blue-500" />
                            </div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Alasan Retur</p>
                        </div>
                        <p className="text-sm leading-relaxed">{stockReturn.reason}</p>
                    </div>

                    {stockReturn.rejected_reason && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border-2 border-red-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 rounded-lg bg-red-500/20">
                                    <XCircle className="w-4 h-4 text-red-500" />
                                </div>
                                <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Alasan Penolakan</p>
                            </div>
                            <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">{stockReturn.rejected_reason}</p>
                        </div>
                    )}

                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-2 border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-emerald-500/20">
                                <Package className="w-4 h-4 text-emerald-500" />
                            </div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                                Detail Barang ({stockReturn.items?.length || 0} item)
                            </p>
                        </div>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                            {stockReturn.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-1 p-3 rounded-lg bg-background/50 border hover:bg-background transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            <span className="font-medium text-sm">{item.product?.name}</span>
                                        </div>
                                        <Badge className="bg-primary/10 text-primary border-primary/20">
                                            {item.quantity} {item.unit}
                                        </Badge>
                                    </div>
                                    {item.note && <p className="text-xs text-muted-foreground ml-6 italic">"{item.note}"</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function StockReturnApproval() {
    const { user, profile } = useAuth();
    const role = useRole();
    const { returns, isLoading, approveReturn, rejectReturn } = useStockReturns();

    const [selectedReturn, setSelectedReturn] = useState<StockReturn | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Filter pending returns
    const pendingReturns = useMemo(() => {
        return returns.filter(r => r.status === 'pending_gudang');
    }, [returns]);

    // All processed returns (we will show all in BeautifulTable, remove the slice because pagination handles it)
    const processedReturns = useMemo(() => {
        return returns.filter(r => r.status !== 'pending_gudang');
    }, [returns]);

    const handleApprove = (returnData: StockReturn) => {
        if (!user || !profile) return;

        approveReturn.mutate({
            returnId: returnData.id,
            mainOfficeId: user.id,
            mainOfficeName: profile.name
        });
    };

    const openRejectDialog = (returnData: StockReturn) => {
        setSelectedReturn(returnData);
        setRejectReason('');
        setRejectDialogOpen(true);
    };

    const handleReject = () => {
        if (!selectedReturn || !rejectReason.trim()) return;

        rejectReturn.mutate({
            returnId: selectedReturn.id,
            reason: rejectReason.trim()
        }, {
            onSuccess: () => {
                setRejectDialogOpen(false);
                setSelectedReturn(null);
                setRejectReason('');
            }
        });
    };

    // Access control: everyone except cashier can see this page
    if (role === 'cashier') {
        return (
            <MainLayout title="Akses Ditolak" subtitle="Anda tidak memiliki akses ke halaman ini">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Kasir tidak dapat mengakses halaman approval retur.</p>
                </div>
            </MainLayout>
        );
    }

    const canProcess = role === 'admin' || role === 'warehouse';

    const tableColumns: Column<StockReturn>[] = [
        {
            header: 'NO.',
            cell: (ret, index) => (
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ret.status === 'completed' || ret.status === 'approved' ? 'bg-emerald-500' :
                        ret.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <span className="font-mono text-sm font-semibold">{(index ?? 0) + 1}</span>
                </div>
            )
        },
        {
            header: 'Nomor Retur',
            accessorKey: 'return_number',
            sortable: true,
            cell: (ret) => (
                <span className="font-mono font-medium">{ret.return_number || '-'}</span>
            )
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            sortable: true,
            cell: (ret) => (
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">{format(new Date(ret.created_at), 'dd MMM yyyy', { locale: idLocale })}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(ret.created_at), 'HH:mm')} WIB
                    </div>
                </div>
            )
        },
        {
            header: 'Kasir',
            accessorKey: 'cashier_name',
            sortable: true,
            cell: (ret) => <span className="font-semibold">{ret.cashier_name}</span>
        },
        {
            header: 'Diproses Oleh',
            accessorKey: 'main_office_name',
            cell: (ret) => <span className="text-muted-foreground text-sm">{ret.main_office_name || '-'}</span>
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            filterOptions: [
                { label: 'Selesai', value: 'completed' },
                { label: 'Ditolak', value: 'rejected' },
                { label: 'Disetujui', value: 'approved' },
            ],
            cell: (ret) => <StatusBadge status={ret.status} showIcon />,
        },
        {
            header: 'Aksi',
            cell: (ret) => <ReturnDetailDialog stockReturn={ret} />
        },
    ];

    return (
        <MainLayout
            title={canProcess ? "Proses Retur Toko ke Gudang" : "Riwayat Retur Toko"}
            subtitle={canProcess ? "Tarik dan proses pengajuan retur dari kasir" : "Riwayat aktivitas retur stok dari toko ke gudang"}
        >
            <div className="space-y-8">
                {/* Pending Approvals */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShoppingCart className="h-6 w-6 text-primary" />
                                {canProcess ? 'Menunggu Diproses Gudang' : 'Status Sedang Diproses Gudang'}
                                {pendingReturns.length > 0 && (
                                    <Badge className="ml-2 bg-primary animate-pulse">{pendingReturns.length}</Badge>
                                )}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Pengajuan retur barang dari toko ke gudang yang sedang diantrekan
                            </p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <span className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></span>
                        </div>
                    ) : pendingReturns.length === 0 ? (
                        <div className="bg-muted/10 border-2 border-dashed rounded-2xl p-12 text-center text-muted-foreground">
                            <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">Semua retur sudah tertangani</p>
                            <p className="text-sm opacity-70">Tidak ada pengajuan yang masuk</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingReturns.map(ret => (
                                <div key={ret.id} className="relative group overflow-hidden bg-card border-2 hover:border-primary/50 rounded-2xl transition-all shadow-sm hover:shadow-xl">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                        <Package className="w-24 h-24" />
                                    </div>
                                    
                                    <div className="p-5 border-b bg-muted/20">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-lg text-foreground">{ret.cashier_name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {format(new Date(ret.created_at), 'dd MMM yyyy', { locale: idLocale })}
                                                    <span className="px-1 text-muted-foreground/30">•</span>
                                                    <Clock className="w-4 h-4" />
                                                    {format(new Date(ret.created_at), 'HH:mm')}
                                                </div>
                                            </div>
                                            <StatusBadge status={ret.status} className="shadow-sm" />
                                        </div>

                                        <div className="bg-background/80 backdrop-blur-sm px-4 py-3 rounded-xl border mb-2">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <Eye className="w-3 h-3" /> Alasan Retur
                                            </p>
                                            <p className="text-sm font-medium">{ret.reason}</p>
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                                Detail Barang ({ret.items?.length || 0})
                                            </p>
                                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                                {ret.items?.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/40 border">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold truncate">{item.product?.name}</p>
                                                            {item.note && <p className="text-xs text-muted-foreground italic truncate">"{item.note}"</p>}
                                                        </div>
                                                        <Badge className="ml-3 shrink-0 bg-primary/10 text-primary hover:bg-primary/20 border-0">
                                                            {item.quantity} {item.unit}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {canProcess && (
                                            <div className="pt-2 flex items-center gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 rounded-xl border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                    onClick={() => openRejectDialog(ret)}
                                                    disabled={rejectReturn.isPending || approveReturn.isPending}
                                                >
                                                    <X className="w-4 h-4 mr-2" /> Tolak
                                                </Button>
                                                <Button
                                                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-500/20 text-white"
                                                    onClick={() => handleApprove(ret)}
                                                    disabled={approveReturn.isPending || rejectReturn.isPending}
                                                >
                                                    <Check className="w-4 h-4 mr-2" /> Proses Selesai & Tarik Stok
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Processed History Table */}
                <BeautifulTable
                    data={processedReturns}
                    columns={tableColumns}
                    title="Riwayat Retur Gudang"
                    subtitle={`${processedReturns.length} data riwayat retur yang sudah diproses`}
                    hideSelection
                    exportFilename="riwayat_approval_retur"
                    exportTitle="Data Riwayat Retur Gudang"
                    emptyState={{
                        icon: <Package className="w-10 h-10" />,
                        title: 'Belum ada riwayat',
                        description: 'Tidak ada data retur yang sudah diproses'
                    }}
                />
            </div>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Tolak Pengajuan Retur
                        </DialogTitle>
                        <DialogDescription>
                            Berikan alasan mengapa pengajuan retur ini ditolak. Kasir akan mendapatkan notifikasi penolakan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="font-semibold text-sm">Alasan Penolakan</Label>
                            <Textarea
                                placeholder="Contoh: Stok toko masih normal, salah input barang..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={4}
                                className="resize-none rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" className="rounded-xl" onClick={() => setRejectDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            className="rounded-xl"
                            onClick={handleReject}
                            disabled={!rejectReason.trim() || rejectReturn.isPending}
                        >
                            {rejectReturn.isPending ? 'Memproses...' : 'Tolak Pengajuan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

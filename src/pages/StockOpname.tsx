
import { useState, useMemo } from 'react';
import { ClipboardCheck, Package, Plus, Check, X, AlertTriangle } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BeautifulTable } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
    useStockOpname,
    useCreateStockOpname,
    useApproveStockOpname,
    useRejectStockOpname,
} from '@/hooks/useStockOpname';
import { Product, Location, StockOpnameStatus } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function StockOpnamePage() {
    const { products, getProductByBarcode } = useData();
    const { user, profile } = useAuth();
    const role = useRole();
    const { toast } = useToast();

    const { data: opnameRecords = [], isLoading } = useStockOpname();
    const createOpname = useCreateStockOpname();
    const approveOpname = useApproveStockOpname();
    const rejectOpname = useRejectStockOpname();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [location, setLocation] = useState<Location>('gudang');
    const [actualStock, setActualStock] = useState(0);
    const [note, setNote] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | StockOpnameStatus>('all');

    // Reject dialog
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedOpnameId, setSelectedOpnameId] = useState<string | null>(null);

    const canCreate = role === 'auditor' || role === 'admin';
    const canApprove = role === 'auditor' || role === 'admin';

    const systemStock = selectedProduct ? selectedProduct.stock[location] : 0;
    const difference = actualStock - systemStock;

    const filteredRecords = useMemo(() => {
        return opnameRecords.filter(r =>
            activeTab === 'all' ? true : r.status === activeTab
        );
    }, [opnameRecords, activeTab]);

    const pendingCount = opnameRecords.filter(r => r.status === 'pending').length;

    const handleBarcodeScanned = (barcode: string) => {
        const product = getProductByBarcode(barcode);
        if (product) {
            setSelectedProduct(product);
            setActualStock(product.stock[location]);
            toast({
                title: 'Produk ditemukan',
                description: product.name,
            });
        } else {
            toast({
                title: 'Produk tidak ditemukan',
                description: 'Barcode: ' + barcode,
                variant: 'destructive',
            });
        }
    };

    const handleLocationChange = (loc: Location) => {
        setLocation(loc);
        if (selectedProduct) {
            setActualStock(selectedProduct.stock[loc]);
        }
    };

    const handleSubmit = async () => {
        if (!selectedProduct) return;

        await createOpname.mutateAsync({
            productId: selectedProduct.id,
            location,
            systemStock,
            actualStock,
            note: note || undefined,
            countedBy: user?.id,
            countedByName: profile?.name || 'User',
        });

        setDialogOpen(false);
        setSelectedProduct(null);
        setActualStock(0);
        setNote('');
    };

    const handleApprove = async (opnameId: string) => {
        await approveOpname.mutateAsync({
            opnameId,
            approverId: user?.id,
            approverName: profile?.name || 'Auditor',
        });
    };

    const openRejectDialog = (opnameId: string) => {
        setSelectedOpnameId(opnameId);
        setRejectReason('');
        setRejectDialogOpen(true);
    };

    const handleReject = async () => {
        if (!selectedOpnameId || !rejectReason.trim()) {
            toast({
                title: 'Alasan diperlukan',
                description: 'Masukkan alasan penolakan',
                variant: 'destructive',
            });
            return;
        }

        await rejectOpname.mutateAsync({
            opnameId: selectedOpnameId,
            reason: rejectReason,
            approverId: user?.id,
            approverName: profile?.name || 'Auditor',
        });

        setRejectDialogOpen(false);
        setSelectedOpnameId(null);
    };

    if (isLoading) {
        return (
            <MainLayout title="Stok Opname" subtitle="Pengecekan dan penyesuaian stok fisik">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    const columns = [
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            sortKey: 'created_at',
            cell: (item: any) => format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })
        },
        {
            header: 'Produk',
            sortKey: 'product.name',
            cell: (item: any) => (
                <div className="flex items-center gap-2">
                    {item.product?.image_url ? (
                        <img src={item.product.image_url} alt={item.product.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-500" />
                        </div>
                    )}
                    <span className="font-medium text-gray-900">{item.product?.name}</span>
                </div>
            )
        },
        {
            header: 'Lokasi',
            accessorKey: 'location',
            cell: (item: any) => (
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs capitalize font-medium">
                    {item.location}
                </span>
            )
        },
        {
            header: 'Sistem',
            accessorKey: 'system_stock',
            className: 'text-center'
        },
        {
            header: 'Aktual',
            accessorKey: 'actual_stock',
            className: 'text-center font-bold'
        },
        {
            header: 'Selisih',
            accessorKey: 'difference',
            className: 'text-center',
            cell: (item: any) => (
                <span className={`font-bold ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {item.difference > 0 ? '+' : ''}{item.difference}
                </span>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item: any) => {
                const colors: any = {
                    pending: 'bg-yellow-100 text-yellow-700',
                    approved: 'bg-green-100 text-green-700',
                    rejected: 'bg-red-100 text-red-700'
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[item.status] || 'bg-gray-100'}`}>
                        {item.status.toUpperCase()}
                    </span>
                )
            }
        },
        {
            header: 'Pencatat',
            accessorKey: 'counted_by_name',
            className: 'text-gray-500'
        },
        {
            header: '',
            sortable: false,
            cell: (item: any) => canApprove && item.status === 'pending' && (
                <div className="flex gap-2 justify-end">
                    <Button size="sm" onClick={() => handleApprove(item.id)} className="h-8 w-8 p-0 bg-green-100 hover:bg-green-200 text-green-700 rounded-full">
                        <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openRejectDialog(item.id)} className="h-8 w-8 p-0 hover:bg-red-100 text-red-600 rounded-full">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <MainLayout
            title="Stok Opname"
            subtitle="Pengecekan dan penyesuaian stok fisik"
            actions={
                canCreate && (
                    <Button
                        onClick={() => setDialogOpen(true)}
                        className="rounded-xl"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Catat Opname
                    </Button>
                )
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Total Opname"
                        value={opnameRecords.length}
                        icon={<ClipboardCheck className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Pending"
                        value={pendingCount}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        subtitle={pendingCount > 0 ? "menunggu persetujuan" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Disetujui Hari Ini"
                        value={
                            opnameRecords.filter(r =>
                                r.status === 'approved' &&
                                new Date(r.created_at).toDateString() === new Date().toDateString()
                            ).length
                        }
                        icon={<Check className="w-5 h-5" />}
                    />
                </StatsGrid>


                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                        <TabsList className="rounded-xl h-10 bg-gray-100">
                            <TabsTrigger value="all" className="rounded-lg">Semua</TabsTrigger>
                            <TabsTrigger value="pending" className="rounded-lg">
                                Pending
                                {pendingCount > 0 && (
                                    <span className="ml-1 bg-yellow-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                                        {pendingCount}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="approved" className="rounded-lg">Disetujui</TabsTrigger>
                            <TabsTrigger value="rejected" className="rounded-lg">Ditolak</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <BeautifulTable
                    data={filteredRecords}
                    columns={columns}
                    title="Riwayat Opname"
                    emptyState={{
                        icon: <ClipboardCheck className="w-10 h-10" />,
                        title: "Belum Ada Stok Opname",
                        description: "Catat stok opname untuk memverifikasi stok fisik dengan sistem.",
                        actionLabel: canCreate ? "Catat Opname" : undefined,
                        onAction: canCreate ? () => setDialogOpen(true) : undefined
                    }}
                />

                {/* Create Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-md rounded-2xl">
                        <DialogHeader>
                            <DialogTitle>Catat Stok Opname</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Scan Produk</Label>
                                <BarcodeScanner onScan={handleBarcodeScanned} />
                            </div>

                            {selectedProduct && (
                                <>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            {selectedProduct.image_url ? (
                                                <img
                                                    src={selectedProduct.image_url}
                                                    alt={selectedProduct.name}
                                                    className="w-12 h-12 rounded-lg object-cover border"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                    <Package className="w-6 h-6 text-indigo-600" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
                                                <p className="text-sm text-gray-500">{selectedProduct.barcode}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Lokasi</Label>
                                        <Select value={location} onValueChange={(v: Location) => handleLocationChange(v)}>
                                            <SelectTrigger className="rounded-xl h-11 bg-white border-gray-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="gudang">Gudang ({selectedProduct.stock.gudang})</SelectItem>
                                                <SelectItem value="toko">Toko ({selectedProduct.stock.toko})</SelectItem>
                                                <SelectItem value="lainnya">Lainnya ({selectedProduct.stock.lainnya})</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Stok Sistem</Label>
                                            <Input value={systemStock} disabled className="bg-gray-100 rounded-xl animate-pulse cursor-not-allowed" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Stok Aktual</Label>
                                            <Input
                                                type="number"
                                                value={actualStock}
                                                onChange={(e) => setActualStock(parseInt(e.target.value) || 0)}
                                                min={0}
                                                className="rounded-xl border-gray-200 focus:ring-indigo-200"
                                            />
                                        </div>
                                    </div>

                                    {difference !== 0 && (
                                        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${difference > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                            <AlertTriangle className="w-4 h-4" />
                                            <span>Selisih: {difference > 0 ? '+' : ''}{difference} unit</span>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Catatan (opsional)</Label>
                                        <Textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Contoh: Barang rusak 2 unit"
                                            rows={3}
                                            className="rounded-xl border-gray-200 resize-none"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleSubmit}
                                        className="w-full rounded-xl"
                                        disabled={createOpname.isPending}
                                    >
                                        {createOpname.isPending ? 'Menyimpan...' : 'Simpan Stok Opname'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Reject Dialog */}
                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader>
                            <DialogTitle>Tolak Stok Opname</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <p className="text-sm text-muted-foreground">Masukkan alasan penolakan:</p>
                            <Textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Alasan penolakan..."
                                rows={4}
                                className="rounded-xl"
                            />
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="rounded-xl">
                                    Batal
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleReject}
                                    disabled={rejectOpname.isPending}
                                    className="rounded-xl"
                                >
                                    Tolak
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div >
        </MainLayout >
    );
}

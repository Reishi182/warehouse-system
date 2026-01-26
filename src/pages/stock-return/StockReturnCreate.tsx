
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/AuthContext';
import { useStockReturns } from '@/hooks/useStockReturns';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Send, ArrowUpFromLine, Search, CheckCircle, Clock, Package, XCircle, Eye, Sparkles, FileText, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { StockReturn, Product } from '@/types';

interface ReturnItem {
    id: string;
    productId: string;
    product?: Product;
    quantity: number;
    maxStock: number;
    unit: string;
    note?: string;
}

// Status badge component with premium styling
function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { label: string; className: string }> = {
        pending_main_office: {
            label: 'Menunggu Approval',
            className: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30 shadow-amber-500/10'
        },
        approved: {
            label: 'Disetujui',
            className: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-600 border-emerald-500/30 shadow-emerald-500/10'
        },
        rejected: {
            label: 'Ditolak',
            className: 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-600 border-red-500/30 shadow-red-500/10'
        },
    };

    const config = statusConfig[status] || { label: status, className: '' };

    return (
        <Badge
            variant="outline"
            className={`font-semibold px-3 py-1 shadow-sm backdrop-blur-sm ${config.className}`}
        >
            {status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
            {status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
            {status === 'pending_main_office' && <Clock className="w-3 h-3 mr-1" />}
            {config.label}
        </Badge>
    );
}

// Detail Dialog Component
function ReturnDetailDialog({ returnData }: { returnData: StockReturn }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                    <Eye className="w-4 h-4" />
                    Detail
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl border-2 overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

                <DialogHeader className="relative z-10 pb-4 border-b">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg shadow-primary/10">
                                <ArrowUpFromLine className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Detail Retur</DialogTitle>
                                <DialogDescription className="font-mono text-sm mt-0.5">
                                    {returnData.return_number || 'Menunggu Nomor...'}
                                </DialogDescription>
                            </div>
                        </div>
                        <StatusBadge status={returnData.status} />
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4 relative z-10">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-muted/30 border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Tanggal</span>
                            </div>
                            <p className="font-semibold">
                                {format(new Date(returnData.created_at), 'dd MMMM yyyy', { locale: id })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {format(new Date(returnData.created_at), 'HH:mm')} WIB
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/30 border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <User className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Kasir</span>
                            </div>
                            <p className="font-semibold">{returnData.cashier_name}</p>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-blue-500/20">
                                <Eye className="w-4 h-4 text-blue-500" />
                            </div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Alasan Retur</p>
                        </div>
                        <p className="text-sm leading-relaxed">{returnData.reason}</p>
                    </div>

                    {/* Rejected Reason if applicable */}
                    {returnData.rejected_reason && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border-2 border-red-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 rounded-lg bg-red-500/20">
                                    <XCircle className="w-4 h-4 text-red-500" />
                                </div>
                                <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Alasan Penolakan</p>
                            </div>
                            <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">{returnData.rejected_reason}</p>
                        </div>
                    )}

                    {/* Items */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-2 border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-emerald-500/20">
                                <Package className="w-4 h-4 text-emerald-500" />
                            </div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                                Detail Barang ({returnData.items?.length || 0} item)
                            </p>
                        </div>
                        <div className="space-y-2">
                            {returnData.items?.map((item: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border hover:bg-background transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        <span className="font-medium text-sm">{item.product?.name}</span>
                                    </div>
                                    <Badge className="bg-primary/10 text-primary border-primary/20">
                                        {item.quantity} {item.unit}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function StockReturnCreate() {
    const { user, profile } = useAuth();
    const role = useRole();
    const { products } = useData();
    const { returns, isLoading, createReturn } = useStockReturns();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [reason, setReason] = useState('');
    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // My Returns
    const myReturns = returns.filter(r => r.cashier_id === user?.id);

    const handleAddItem = (product: any) => {
        const existing = returnItems.find(i => i.productId === product.id);
        if (existing) return;

        setReturnItems([...returnItems, {
            id: crypto.randomUUID(),
            productId: product.id,
            product: product,
            quantity: 1,
            maxStock: product.stock.toko,
            unit: 'pcs',
            note: ''
        }]);
        setIsDialogOpen(false);
    };

    const handleUpdateItem = (productId: string, field: string, value: any) => {
        setReturnItems(returnItems.map(item => {
            if (item.productId === productId) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleRemoveItem = (productId: string) => {
        setReturnItems(returnItems.filter(i => i.productId !== productId));
    };

    const handleSubmit = async () => {
        if (!user || !profile) return;
        if (returnItems.length === 0) return;
        if (!reason.trim()) return;

        createReturn.mutate({
            cashierId: user.id,
            cashierName: profile.name,
            reason: reason.trim(),
            items: returnItems.map(i => ({
                productId: i.productId,
                quantity: i.quantity,
                unit: i.unit,
                note: i.note
            }))
        }, {
            onSuccess: () => {
                setReturnItems([]);
                setReason('');
            }
        });
    };

    // Filter products with stock in toko
    const filteredProducts = products.filter(p =>
        p.stock.toko > 0 && (
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcode.includes(searchTerm)
        )
    );

    // Define columns for BeautifulTable
    const tableColumns: Column<StockReturn>[] = [
        {
            header: 'NO.',
            cell: (_returnData, index) => (
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${_returnData.status === 'approved' ? 'bg-emerald-500' :
                        _returnData.status === 'rejected' ? 'bg-red-500' :
                            'bg-amber-500'
                        } animate-pulse`} />
                    <span className="font-mono text-sm font-semibold">
                        {(index ?? 0) + 1}
                    </span>
                </div>
            )
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            sortable: true,
            cell: (returnData) => (
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">
                        {format(new Date(returnData.created_at), 'dd MMM yyyy', { locale: id })}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(returnData.created_at), 'HH:mm')} WIB
                    </div>
                </div>
            ),
            exportFormat: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm')
        },
        {
            header: 'Item',
            cell: (returnData) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <Package className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold">{returnData.items?.length || 0}</span>
                    <span className="text-muted-foreground text-sm">barang</span>
                </div>
            ),
            exportFormat: (_, row) => `${row?.items?.length || 0} barang`
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            filterOptions: [
                { label: 'Menunggu Approval', value: 'pending_main_office' },
                { label: 'Disetujui', value: 'approved' },
                { label: 'Ditolak', value: 'rejected' },
            ],
            cell: (returnData) => <StatusBadge status={returnData.status} />,
            exportFormat: (value) => {
                const labels: Record<string, string> = {
                    pending_main_office: 'Menunggu Approval',
                    approved: 'Disetujui',
                    rejected: 'Ditolak',
                };
                return labels[value] || value;
            }
        },
        {
            header: 'Aksi',
            cell: (returnData) => (
                <ReturnDetailDialog returnData={returnData} />
            )
        },
    ];

    // Access control
    if (role !== 'cashier' && role !== 'admin') {
        return (
            <MainLayout title="Akses Ditolak" subtitle="Hanya kasir yang dapat mengakses halaman ini">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Retur ke Gudang"
            subtitle="Kirim barang dari toko kembali ke gudang"
        >
            <div className="space-y-6">

                <StatsGrid columns={3}>
                    <StatsCard
                        title="Total Retur"
                        value={myReturns.length}
                        icon={<Package className="w-5 h-5" />}
                        variant="default"
                    />
                    <StatsCard
                        title="Menunggu Approval"
                        value={myReturns.filter(r => r.status === 'pending_main_office').length}
                        icon={<Clock className="w-5 h-5" />}
                        variant="warning"
                    />
                    <StatsCard
                        title="Disetujui"
                        value={myReturns.filter(r => r.status === 'approved').length}
                        icon={<CheckCircle className="w-5 h-5" />}
                        variant="success"
                    />
                </StatsGrid>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Form Section - Left Side */}
                    <Card className="xl:col-span-1 border-2 bg-gradient-to-br from-card via-card to-muted/20 shadow-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <ArrowUpFromLine className="w-5 h-5 text-primary" />
                                </div>
                                Buat Retur Baru
                            </CardTitle>
                            <CardDescription>Pilih barang dari toko untuk dikembalikan ke gudang</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Alasan Retur</Label>
                                <Textarea
                                    placeholder="Contoh: Stok toko terlalu banyak, produk tidak laku..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="min-h-[80px] resize-none rounded-xl border-2 focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-sm font-semibold">Daftar Barang</Label>
                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" variant="outline" className="rounded-xl gap-2 hover:bg-primary/10 hover:border-primary/50">
                                                <Plus className="w-4 h-4" /> Tambah
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md max-h-[80vh] flex flex-col rounded-2xl">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    <Package className="w-5 h-5 text-primary" />
                                                    Pilih Barang
                                                </DialogTitle>
                                                <DialogDescription>Pilih barang dari stok toko untuk diretur</DialogDescription>
                                            </DialogHeader>
                                            <div className="p-2">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Cari nama atau barcode..."
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                        className="pl-9 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto min-h-[300px] space-y-1">
                                                {filteredProducts.length === 0 ? (
                                                    <p className="text-center text-muted-foreground py-8">Tidak ada produk dengan stok toko</p>
                                                ) : (
                                                    filteredProducts.map(product => (
                                                        <div key={product.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20">
                                                            <div>
                                                                <p className="font-medium">{product.name}</p>
                                                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                                    <span className="font-mono">{product.barcode}</span>
                                                                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                                                                        <Sparkles className="w-3 h-3 mr-1" />
                                                                        {product.stock.toko} pcs
                                                                    </Badge>
                                                                </p>
                                                            </div>
                                                            <Button size="sm" onClick={() => handleAddItem(product)} className="rounded-xl">Pilih</Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                {returnItems.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/10">
                                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        Belum ada barang dipilih
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {returnItems.map((item, idx) => (
                                            <div key={item.productId} className="p-3 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border-2 border-border/50 hover:border-primary/30 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-medium text-sm">{idx + 1}. {item.product?.name}</span>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleRemoveItem(item.productId)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Jumlah (Max: {item.maxStock})</Label>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={item.maxStock}
                                                            value={item.quantity}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                const clampedVal = Math.min(Math.max(1, val), item.maxStock);
                                                                handleUpdateItem(item.productId, 'quantity', clampedVal);
                                                            }}
                                                            className="h-8 text-sm rounded-lg"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Satuan</Label>
                                                        <Select
                                                            value={item.unit}
                                                            onValueChange={v => handleUpdateItem(item.productId, 'unit', v)}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm rounded-lg">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="pcs">pcs</SelectItem>
                                                                <SelectItem value="box">box</SelectItem>
                                                                <SelectItem value="pack">pack</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <Label className="text-xs text-muted-foreground">Catatan (opsional)</Label>
                                                        <Input
                                                            placeholder="Isi jika perlu..."
                                                            value={item.note || ''}
                                                            onChange={e => handleUpdateItem(item.productId, 'note', e.target.value)}
                                                            className="h-8 text-sm rounded-lg"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                                size="lg"
                                disabled={!reason || returnItems.length === 0 || createReturn.isPending}
                                onClick={handleSubmit}
                            >
                                <Send className="w-5 h-5 mr-2" /> {createReturn.isPending ? 'Mengirim...' : 'Kirim Retur'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Table Section - Right Side using BeautifulTable */}
                    <div className="xl:col-span-2">
                        <BeautifulTable
                            data={myReturns}
                            columns={tableColumns}
                            title="Riwayat Retur Saya"
                            subtitle={`${myReturns.length} retur total`}
                            isLoading={isLoading}
                            hideSelection
                            hideExport={false}
                            exportFilename="riwayat_retur_stok"
                            exportTitle="Riwayat Retur Stok"
                            itemsPerPage={10}
                            emptyState={{
                                icon: <ArrowUpFromLine className="w-8 h-8" />,
                                title: 'Belum ada riwayat retur',
                                description: 'Buat retur baru menggunakan form di sebelah kiri'
                            }}
                        />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

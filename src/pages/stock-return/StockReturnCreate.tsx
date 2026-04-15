import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStockReturns } from '@/hooks/useStockReturns';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import UnitSelector from '@/components/common/UnitSelector';
import { Plus, Trash2, Send, ShoppingCart, CheckCircle, Clock, Package, RefreshCw, XCircle, Eye, Sparkles, FileText, Calendar, User, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/useDataStore';
import StatusBadge from '@/components/common/StatusBadge';
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
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { StockReturn } from '@/types';
import { ProductPicker } from '@/components/products/ProductPicker';




// Edit Return Dialog Component
function EditReturnDialog({ request, products, onEdit, onCancel }: { request: StockReturn, products: any[], onEdit: (data: any) => void, onCancel: () => void }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(request.reason || '');
    const [items, setItems] = useState<any[]>(() => {
        return request.items?.map((i: any) => ({
            productId: i.product_id,
            name: i.product?.name,
            quantity: i.quantity,
            maxStock: i.product?.stock_toko || 0,
            unit: i.unit || 'pcs',
            note: i.note || ''
        })) || [];
    });

    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(i => i.productId !== productId));
    };

    const handleUpdateItem = (productId: string, field: string, value: any) => {
        setItems(items.map(i => {
            if (i.productId === productId) {
                return { ...i, [field]: value };
            }
            return i;
        }));
    };

    const handleSave = () => {
        onEdit({ reason, items });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-xl gap-2 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-600 transition-all ml-2">
                    <FileText className="w-4 h-4" /> Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-2xl border-2">
                <DialogHeader>
                    <DialogTitle>Edit Pengajuan Retur</DialogTitle>
                    <DialogDescription>Ubah detail retur sebelum ditarik oleh gudang.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Alasan Retur</Label>
                        <Textarea value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Daftar Barang</Label>
                        {items.map((item) => (
                            <div key={item.productId} className="flex gap-2 items-end border p-3 rounded-lg bg-muted/50">
                                <div className="flex-1">
                                    <Label className="text-xs">Barang</Label>
                                    <Input value={item.name} disabled className="bg-background/50" />
                                </div>
                                <div className="w-24">
                                    <Label className="text-xs">Jumlah</Label>
                                    <Input type="number" min={0.1} step="any" value={item.quantity} onChange={e => handleUpdateItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)} />
                                </div>
                                <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.productId)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between mt-4">
                    <Button variant="destructive" onClick={() => { onCancel(); setOpen(false); }}>Batalkan Retur</Button>
                    <Button onClick={handleSave} disabled={items.length === 0 || !reason}>Simpan Perubahan</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
function ReturnDetailDialog({ stockReturn, onCancel }: { stockReturn: StockReturn, onCancel?: () => void }) {
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
                            <p className="font-semibold">{format(new Date(stockReturn.created_at), 'dd MMM yyyy', { locale: id })}</p>
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

                    {/* Cancel button for pending returns */}
                    {stockReturn.status === 'pending_gudang' && onCancel && (
                        <Button
                            variant="outline"
                            className="w-full rounded-xl h-12 border-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive transition-all"
                            onClick={() => {
                                onCancel();
                                setOpen(false);
                            }}
                        >
                            <Ban className="w-5 h-5 mr-2" />
                            Batalkan Retur
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function StockReturnCreate() {
    const { user, profile } = useAuth();
    const { returns, createReturn, editReturn, cancelReturn } = useStockReturns();
    const { products } = useDataStore();

    // Form State
    const [reason, setReason] = useState('');
    const [returnItems, setReturnItems] = useState<any[]>([]);

    // My Returns
    const myReturns = returns.filter(r => r.cashier_id === user?.id);

    const handleAddItem = (product: any) => {
        const existing = returnItems.find(i => i.productId === product.id);
        if (existing) return;

        setReturnItems([...returnItems, {
            productId: product.id,
            name: product.name,
            quantity: 1,
            maxStock: product.stock?.toko || 0, // Validate against TOKO stock safely
            unit: 'pcs',
            note: ''
        }]);
    };

    const handleRemoveItem = (productId: string) => {
        setReturnItems(returnItems.filter(i => i.productId !== productId));
    };

    const handeUpdateItem = (productId: string, field: string, value: any) => {
        setReturnItems(returnItems.map(i => {
            if (i.productId === productId) {
                if (field === 'quantity') {
                    // Prevent returning more than available in Toko
                    const clampedVal = Math.min(Math.max(0.1, value), i.maxStock);
                    return { ...i, [field]: clampedVal };
                }
                return { ...i, [field]: value };
            }
            return i;
        }));
    };

    const handleSubmit = async () => {
        if (!reason || returnItems.length === 0) return;

        await createReturn.mutateAsync({
            cashierId: user?.id || '',
            cashierName: profile?.name || 'Kasir',
            reason,
            items: returnItems
        });

        setReason('');
        setReturnItems([]);
    };

    const tableColumns: Column<StockReturn>[] = [
        {
            header: 'NO.',
            cell: (ret, index) => (
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ret.status === 'approved' ? 'bg-emerald-500' :
                        ret.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`} />
                    <span className="font-mono text-sm font-semibold">{(index ?? 0) + 1}</span>
                </div>
            )
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            sortable: true,
            cell: (ret) => (
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">{format(new Date(ret.created_at), 'dd MMM yyyy', { locale: id })}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(ret.created_at), 'HH:mm')} WIB
                    </div>
                </div>
            )
        },
        {
            header: 'Item',
            cell: (ret) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <Package className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold">{ret.items?.length || 0}</span>
                    <span className="text-muted-foreground text-sm">barang</span>
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            filterOptions: [
                { label: 'Menunggu Gudang', value: 'pending_gudang' },
                { label: 'Selesai', value: 'completed' },
                { label: 'Ditolak', value: 'rejected' },
            ],
            cell: (ret) => <StatusBadge status={ret.status} showIcon />,
        },
        {
            header: 'Aksi',
            cell: (ret) => <ReturnDetailDialog stockReturn={ret} onCancel={() => cancelReturn.mutate(ret.id)} />
        },
    ];

    return (
        <MainLayout title="Retur Stok ke Gudang" subtitle="Tarik kembali stok dari toko menuju gudang utama">
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard title="Total Retur" value={myReturns.length} icon={<ShoppingCart className="w-5 h-5" />} />
                    <StatsCard title="Pending" value={myReturns.filter(r => r.status === 'pending_gudang').length} icon={<Clock className="w-5 h-5" />} subtitleType="warning" />
                    <StatsCard title="Selesai" value={myReturns.filter(r => r.status === 'completed' || r.status === 'approved').length} icon={<CheckCircle className="w-5 h-5" />} />
                </StatsGrid>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Form Section */}
                    <Card className="xl:col-span-1 border-2 bg-gradient-to-br from-card via-card to-muted/20 shadow-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <RefreshCw className="w-5 h-5 text-primary" />
                                </div>
                                Buat Retur Baru
                            </CardTitle>
                            <CardDescription>Isi daftar barang yang dikembalikan</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Alasan Retur</Label>
                                <Textarea
                                    placeholder="Contoh: Stok berlebih, hampir kadaluarsa, rusak..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="min-h-[80px] resize-none rounded-xl border-2 focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-sm font-semibold">Daftar Barang</Label>
                                    <ProductPicker 
                                        products={products}
                                        onSelect={handleAddItem}
                                        requireStockIn="toko" // Only show products with stock in toko
                                        trigger={
                                            <Button size="sm" variant="outline" className="rounded-xl gap-2 hover:bg-primary/10 hover:border-primary/50">
                                                <Plus className="w-4 h-4" /> Cari Barang
                                            </Button>
                                        }
                                    />
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
                                                    <span className="font-medium text-sm">{idx + 1}. {item.name}</span>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleRemoveItem(item.productId)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Jumlah (Max: {item.maxStock})</Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            min={0.1}
                                                            max={item.maxStock}
                                                            value={item.quantity}
                                                            onChange={e => handeUpdateItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)}
                                                            className="h-8 text-sm rounded-lg"
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                        />
                                                    </div>
                                                    <div className="w-28">
                                                        <Label className="text-xs text-muted-foreground">Satuan</Label>
                                                        <UnitSelector
                                                            product={products.find(p => p.id === item.productId)}
                                                            value={item.unit}
                                                            onChange={val => handeUpdateItem(item.productId, 'unit', val)}
                                                            className="h-8 text-sm rounded-lg"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <Label className="text-xs text-muted-foreground">Catatan / Kondisi</Label>
                                                        <Input
                                                            placeholder="Opsional (contoh: Kemasan rusak)"
                                                            value={item.note}
                                                            onChange={e => handeUpdateItem(item.productId, 'note', e.target.value)}
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
                                className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary mt-4"
                                size="lg"
                                disabled={!reason || returnItems.length === 0}
                                onClick={handleSubmit}
                            >
                                <Send className="w-5 h-5 mr-2" /> Ajukan Retur
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Table Section */}
                    <div className="xl:col-span-2">
                        <BeautifulTable
                            data={myReturns}
                            columns={tableColumns}
                            title="Riwayat Retur Saya"
                            subtitle={`${myReturns.length} permohonan total`}
                            hideSelection
                            hideExport={false}
                            exportFilename="riwayat_retur_stok"
                            exportTitle="Riwayat Retur Stok (Toko ke Gudang)"
                            itemsPerPage={10}
                            emptyState={{
                                icon: <RefreshCw className="w-8 h-8" />,
                                title: 'Belum ada riwayat retur',
                                description: 'Ajukan retur melalui form di sebelah kiri jika ada barang yang perlu dikembalikan ke gudang'
                            }}
                        />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

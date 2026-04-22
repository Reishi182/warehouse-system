import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import UnitSelector from '@/components/common/UnitSelector';
import { ProductPicker } from '@/components/products/ProductPicker';
import { Plus, Trash2, Send, ShoppingCart, CheckCircle, Clock, Package, RefreshCw, XCircle, Eye, Sparkles, FileText, Calendar, User, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/useDataStore';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { NewStockRequest } from '@/types';

// Status badge component with premium styling
function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { label: string; className: string }> = {
        pending_main_office: {
            label: 'Menunggu Approval',
            className: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30 shadow-amber-500/10'
        },
        pending_gudang: {
            label: 'Diproses Gudang',
            className: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-600 border-blue-500/30 shadow-blue-500/10'
        },
        shipped: {
            label: 'Dalam Pengiriman',
            className: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-600 border-purple-500/30 shadow-purple-500/10'
        },
        pending_receipt: {
            label: 'Dalam Perjalanan',
            className: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-600 border-blue-500/30 shadow-blue-500/10'
        },
        completed: {
            label: 'Selesai',
            className: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-600 border-emerald-500/30 shadow-emerald-500/10'
        },
        rejected: {
            label: 'Ditolak',
            className: 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-600 border-red-500/30 shadow-red-500/10'
        },
        cancelled: {
            label: 'Dibatalkan',
            className: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-600 border-gray-500/30 shadow-gray-500/10'
        },
    };

    const config = statusConfig[status] || { label: status, className: '' };

    return (
        <Badge
            variant="outline"
            className={`font-semibold px-3 py-1 shadow-sm backdrop-blur-sm ${config.className}`}
        >
            {status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
            {status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
            {status === 'cancelled' && <Ban className="w-3 h-3 mr-1" />}
            {status.includes('pending') && status !== 'pending_receipt' && <Clock className="w-3 h-3 mr-1" />}
            {(status === 'shipped' || status === 'pending_receipt') && <Package className="w-3 h-3 mr-1" />}
            {config.label}
        </Badge>
    );
}


// Edit Request Dialog Component
function EditRequestDialog({ request, products, onEdit, onCancel }: { request: NewStockRequest, products: any[], onEdit: (data: any) => void, onCancel: () => void }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(request.reason || '');
    const [items, setItems] = useState<any[]>(() => {
        return request.items?.map((i: any) => ({
            productId: i.product_id,
            name: i.product?.name,
            quantity: i.quantity,
            maxStock: i.product?.stock_gudang || 0,
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
                <Button size="sm" variant="outline" className="rounded-xl gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 hover:text-blue-600 transition-all ml-2">
                    <FileText className="w-4 h-4" /> Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                <div className="flex flex-col h-full max-h-[90vh]">
                    {/* Premium Gradient Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative shrink-0">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <FileText className="w-32 h-32" />
                        </div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    Edit Permintaan Stok
                                </h2>
                                <p className="text-blue-100 mt-1 text-sm">
                                    Ubah detail permintaan sebelum diproses oleh gudang.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                Alasan Permintaan
                            </Label>
                            <Textarea 
                                value={reason} 
                                onChange={e => setReason(e.target.value)} 
                                className="min-h-[80px] resize-none rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-500" />
                                Daftar Barang
                            </Label>
                            <div className="space-y-3">
                                {items.map((item, idx) => (
                                    <div key={item.productId} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors hover:border-blue-200">
                                        <div className="flex gap-4 items-end">
                                            <div className="flex-1 space-y-1.5">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Barang</Label>
                                                <Input value={item.name} disabled className="bg-gray-50 dark:bg-slate-900/50 rounded-lg h-9" />
                                            </div>
                                            <div className="w-24 space-y-1.5">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Jumlah</Label>
                                                <Input 
                                                    type="number" 
                                                    min={0.1} 
                                                    step="any" 
                                                    value={item.quantity} 
                                                    onChange={e => handleUpdateItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)} 
                                                    className="rounded-lg h-9"
                                                />
                                            </div>
                                            <Button 
                                                size="icon" 
                                                variant="outline" 
                                                className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg shrink-0" 
                                                onClick={() => handleRemoveItem(item.productId)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-3 shrink-0">
                        <Button 
                            variant="outline" 
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl px-4 gap-2"
                            onClick={() => { onCancel(); setOpen(false); }}
                        >
                            <Ban className="w-4 h-4" />
                            Batalkan Permintaan
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" className="rounded-xl px-6" onClick={() => setOpen(false)}>
                                Tutup
                            </Button>
                            <Button 
                                className="rounded-xl px-6 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={handleSave} 
                                disabled={items.length === 0 || !reason}
                            >
                                <CheckCircle className="w-4 h-4" />
                                Simpan Perubahan
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Detail Dialog Component
function RequestDetailDialog({ request, onResubmit, onCancel }: { request: NewStockRequest; onResubmit: () => void; onCancel: () => void }) {
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
            <DialogContent className="max-w-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                <div className="flex flex-col h-full max-h-[90vh]">
                    {/* Premium Gradient Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white relative shrink-0">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <FileText className="w-32 h-32" />
                        </div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    Detail Permintaan
                                </h2>
                                <p className="text-indigo-100 flex items-center gap-1.5 mt-1 font-mono text-sm">
                                    {request.request_number || 'Menunggu Nomor...'}
                                </p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold border border-white/30 shadow-sm flex items-center gap-2">
                                {request.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                                {request.status === 'rejected' && <XCircle className="w-4 h-4" />}
                                {request.status === 'cancelled' && <Ban className="w-4 h-4" />}
                                {request.status.includes('pending') && request.status !== 'pending_receipt' && <Clock className="w-4 h-4" />}
                                {(request.status === 'shipped' || request.status === 'pending_receipt') && <Package className="w-4 h-4" />}
                                {request.status === 'pending_main_office' ? 'Menunggu Approval' :
                                 request.status === 'pending_gudang' ? 'Diproses Gudang' :
                                 request.status === 'shipped' ? 'Dalam Pengiriman' :
                                 request.status === 'pending_receipt' ? 'Dalam Perjalanan' :
                                 request.status === 'completed' ? 'Selesai' :
                                 request.status === 'rejected' ? 'Ditolak' :
                                 request.status === 'cancelled' ? 'Dibatalkan' : request.status}
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Tanggal
                                </p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                    {format(new Date(request.created_at), 'dd MMMM yyyy', { locale: id })}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {format(new Date(request.created_at), 'HH:mm')} WIB
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-indigo-500" /> Kasir
                                </p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{request.cashier_name}</p>
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="bg-gray-50/80 dark:bg-slate-700/50 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                    Alasan Permintaan
                                </h3>
                            </div>
                            <div className="p-4">
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{request.reason}</p>
                            </div>
                        </div>

                        {/* Rejected Reason if applicable */}
                        {request.rejected_reason && (
                            <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden">
                                <div className="bg-red-100/50 dark:bg-red-900/20 px-4 py-3 border-b border-red-100 dark:border-red-900/30 flex items-center gap-2">
                                    <XCircle className="w-4 h-4 text-red-500" />
                                    <h3 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                                        Alasan Penolakan
                                    </h3>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">{request.rejected_reason}</p>
                                </div>
                            </div>
                        )}

                        {/* Items */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-indigo-500" />
                                Detail Barang ({request.items?.length || 0} item)
                            </h3>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {request.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg">
                                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">{item.product?.name}</span>
                                            </div>
                                            <div className="text-right flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-lg min-w-[3rem]">
                                                    {item.quantity}
                                                </span>
                                                <span className="text-sm font-medium text-gray-500 uppercase w-8 text-left">{item.unit || 'pcs'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0">
                        <Button variant="outline" className="rounded-xl px-6" onClick={() => setOpen(false)}>
                            Tutup
                        </Button>
                        
                        {(request.status === 'pending_main_office' || request.status === 'pending_gudang') && (
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl px-6 gap-2"
                                onClick={() => {
                                    onCancel();
                                    setOpen(false);
                                }}
                            >
                                <Ban className="w-4 h-4" />
                                Batalkan Permintaan
                            </Button>
                        )}

                        {request.status === 'rejected' && (
                            <Button
                                className="rounded-xl px-6 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => {
                                    onResubmit();
                                    setOpen(false);
                                }}
                            >
                                <RefreshCw className="w-4 h-4" />
                                Ajukan Ulang
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function StockRequestsNew() {
    const { user, profile } = useAuth();
    const products = useDataStore(s => s.products);
    const { requests, createRequest, resubmitRequest, cancelRequest, editRequest } = useStockRequests();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [reason, setReason] = useState('');
    const [requestItems, setRequestItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // My Requests
    const myRequests = requests.filter(r => r.cashier_id === user?.id);

    const handleAddItem = (product: any) => {
        const existing = requestItems.find(i => i.productId === product.id);
        if (existing) return;

        setRequestItems([...requestItems, {
            productId: product.id,
            name: product.name,
            quantity: 1,
            maxStock: product.stock.gudang,
            unit: 'pcs',
            note: ''
        }]);
        setIsDialogOpen(false);
    };

    const handleRemoveItem = (productId: string) => {
        setRequestItems(requestItems.filter(i => i.productId !== productId));
    };

    const handeUpdateItem = (productId: string, field: string, value: any) => {
        setRequestItems(requestItems.map(i => {
            if (i.productId === productId) {
                if (field === 'quantity') {
                    const clampedVal = Math.min(Math.max(1, value), i.maxStock);
                    return { ...i, [field]: clampedVal };
                }
                return { ...i, [field]: value };
            }
            return i;
        }));
    };

    const handleSubmit = async () => {
        if (!reason || requestItems.length === 0) return;

        await createRequest.mutateAsync({
            cashierId: user?.id || '',
            cashierName: profile?.name || 'Kasir',
            reason,
            items: requestItems
        });

        setReason('');
        setRequestItems([]);
    };

    const filteredProducts = products.filter(p =>
        p.stock.gudang > 0 && (
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcode.includes(searchTerm)
        )
    );

    // Define columns for BeautifulTable
    const tableColumns: Column<NewStockRequest>[] = [
        {
            header: 'NO.',
            cell: (request, index) => (
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${request.status === 'completed' ? 'bg-emerald-500' :
                        request.status === 'rejected' ? 'bg-red-500' :
                            request.status === 'cancelled' ? 'bg-gray-500' :
                                (request.status === 'shipped' || request.status === 'pending_receipt') ? 'bg-blue-500' :
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
            cell: (request) => (
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">
                        {format(new Date(request.created_at), 'dd MMM yyyy', { locale: id })}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(request.created_at), 'HH:mm')} WIB
                    </div>
                </div>
            ),
            exportFormat: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm')
        },
        {
            header: 'Item',
            cell: (request) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <Package className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold">{request.items?.length || 0}</span>
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
                { label: 'Diproses Gudang', value: 'pending_gudang' },
                { label: 'Dalam Pengiriman', value: 'shipped' },
                { label: 'Selesai', value: 'completed' },
                { label: 'Ditolak', value: 'rejected' },
                { label: 'Dibatalkan', value: 'cancelled' },
            ],
            cell: (request) => <StatusBadge status={request.status} />,
            exportFormat: (value) => {
                const labels: Record<string, string> = {
                    pending_main_office: 'Menunggu Approval',
                    pending_gudang: 'Diproses Gudang',
                    shipped: 'Dalam Pengiriman',
                    pending_receipt: 'Dalam Perjalanan',
                    completed: 'Selesai',
                    rejected: 'Ditolak',
                    cancelled: 'Dibatalkan',
                };
                return labels[value] || value;
            }
        },
        {
            header: 'Aksi',
            cell: (request) => (
                <div className="flex items-center">
                    <RequestDetailDialog
                        request={request}
                        onResubmit={() => resubmitRequest.mutate(request.id)}
                        onCancel={() => cancelRequest.mutate(request.id)}
                    />
                    {(request.status === 'pending_main_office' || request.status === 'pending_gudang') && (
                        <EditRequestDialog
                            request={request}
                            products={products}
                            onEdit={(data) => editRequest.mutate({ requestId: request.id, ...data })}
                            onCancel={() => cancelRequest.mutate(request.id)}
                        />
                    )}
                </div>
            )
        },
    ];

    return (
        <MainLayout
            title="Permintaan Stok"
            subtitle="Ajukan permintaan stok baru ke Main Office"
        >
            <div className="space-y-6">

                <StatsGrid columns={3}>
                    <StatsCard
                        title="Total Permintaan"
                        value={myRequests.length}
                        icon={<ShoppingCart className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Pending"
                        value={myRequests.filter(r => r.status.includes('pending')).length}
                        icon={<Clock className="w-5 h-5" />}
                        subtitle={myRequests.filter(r => r.status.includes('pending')).length > 0 ? "menunggu proses" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Selesai"
                        value={myRequests.filter(r => r.status === 'completed').length}
                        icon={<CheckCircle className="w-5 h-5" />}
                    />
                </StatsGrid>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Form Section - Left Side */}
                    <Card className="xl:col-span-1 border-2 bg-gradient-to-br from-card via-card to-muted/20 shadow-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Plus className="w-5 h-5 text-primary" />
                                </div>
                                Buat Permintaan Baru
                            </CardTitle>
                            <CardDescription>Isi detail permintaan stok di bawah ini</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Alasan Permintaan</Label>
                                <Textarea
                                    placeholder="Contoh: Stok menipis menjelang lebaran"
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
                                        requireStockIn="gudang"
                                        trigger={
                                            <Button size="sm" variant="outline" className="rounded-xl gap-2 hover:bg-primary/10 hover:border-primary/50">
                                                <Plus className="w-4 h-4" /> Tambah
                                            </Button>
                                        }
                                    />
                                </div>

                                {requestItems.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/10">
                                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        Belum ada barang dipilih
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {requestItems.map((item, idx) => (
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
                                                        <Label className="text-xs text-muted-foreground">Catatan (opsional)</Label>
                                                        <Input
                                                            placeholder="Isi jika perlu..."
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
                                className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                                size="lg"
                                disabled={!reason || requestItems.length === 0}
                                onClick={handleSubmit}
                            >
                                <Send className="w-5 h-5 mr-2" /> Kirim Permintaan
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Table Section - Right Side using BeautifulTable */}
                    <div className="xl:col-span-2">
                        <BeautifulTable
                            data={myRequests}
                            columns={tableColumns}
                            title="Riwayat Permintaan Saya"
                            subtitle={`${myRequests.length} permintaan total`}
                            hideSelection
                            hideExport={false}
                            exportFilename="riwayat_permintaan_stok"
                            exportTitle="Riwayat Permintaan Stok"
                            itemsPerPage={10}
                            emptyState={{
                                icon: <ShoppingCart className="w-8 h-8" />,
                                title: 'Belum ada riwayat permintaan',
                                description: 'Buat permintaan baru menggunakan form di sebelah kiri'
                            }}
                        />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

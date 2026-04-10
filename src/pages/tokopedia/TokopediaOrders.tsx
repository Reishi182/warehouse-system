import { useState, useMemo } from 'react';
import { Plus, ShoppingBag, Package, Truck, CheckCircle, XCircle, Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import ProductSearchSelect from '@/components/common/ProductSearchSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTokopediaOrders, useTokopediaStats } from '@/hooks/tokopedia/useTokopediaQueries';
import { useCreateTokopediaOrder } from '@/hooks/tokopedia/useTokopediaMutations';
import { TokopediaOrder, Location } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface OrderItem {
    id: string;
    productId?: string;
    productName: string;
    barcode?: string;
    quantity: number;
    unitPrice: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
    order_received: { label: 'Pesanan Baru', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: ShoppingBag },
    packing: { label: 'Dikemas', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Package },
    shipped: { label: 'Dikirim', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: Truck },
    delivered: { label: 'Diterima', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
    completed: { label: 'Selesai', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
};

export default function TokopediaOrders() {
    const navigate = useNavigate();
    const role = useRole();
    const { user, profile } = useAuth();
    const { products } = useData();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [tokopediaOrderId, setTokopediaOrderId] = useState('');
    const [tokopediaInvoice, setTokopediaInvoice] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [buyerAddress, setBuyerAddress] = useState('');
    const [stockLocation, setStockLocation] = useState<Location>('gudang');
    const [shippingCost, setShippingCost] = useState(0);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<OrderItem[]>([]);

    // Add item state
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemQty, setItemQty] = useState(1);
    const [itemPrice, setItemPrice] = useState(0);

    // Hooks
    const { data: orders = [], isLoading } = useTokopediaOrders();
    const { data: stats } = useTokopediaStats();
    const createOrder = useCreateTokopediaOrder();

    // Filtered orders
    const filteredOrders = useMemo(() => {
        let result = orders;
        if (activeTab !== 'all') {
            result = result.filter(o => o.status === activeTab);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(o =>
                o.order_number.toLowerCase().includes(q) ||
                o.buyer_name.toLowerCase().includes(q) ||
                o.tokopedia_order_id?.toLowerCase().includes(q) ||
                o.tracking_number?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [orders, activeTab, searchQuery]);

    const handleAddItem = () => {
        if (!selectedProductId) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        setItems([...items, {
            id: `item-${Date.now()}`,
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            quantity: itemQty,
            unitPrice: itemPrice || product.price,
        }]);
        setSelectedProductId('');
        setItemQty(1);
        setItemPrice(0);
    };

    const handleSubmit = async () => {
        if (!buyerName.trim() || items.length === 0) return;

        await createOrder.mutateAsync({
            tokopediaOrderId: tokopediaOrderId || undefined,
            tokopediaInvoice: tokopediaInvoice || undefined,
            buyerName,
            buyerPhone: buyerPhone || undefined,
            buyerAddress: buyerAddress || undefined,
            stockLocation,
            shippingCost,
            notes: notes || undefined,
            createdBy: user?.id || '',
            createdByName: profile?.name || '',
            items: items.map(i => ({
                productId: i.productId,
                productName: i.productName,
                barcode: i.barcode,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
            })),
        });

        // Reset form
        setTokopediaOrderId('');
        setTokopediaInvoice('');
        setBuyerName('');
        setBuyerPhone('');
        setBuyerAddress('');
        setStockLocation('gudang');
        setShippingCost(0);
        setNotes('');
        setItems([]);
        setIsCreateOpen(false);
    };

    // Table columns
    const columns: Column<TokopediaOrder>[] = [
        {
            header: 'No. Order',
            accessorKey: 'order_number',
            cell: (order) => (
                <div>
                    <span className="font-semibold text-primary">{order.order_number}</span>
                    {order.tokopedia_order_id && (
                        <span className="block text-xs text-muted-foreground">{order.tokopedia_order_id}</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Pembeli',
            accessorKey: 'buyer_name',
            cell: (order) => (
                <div>
                    <span className="font-medium">{order.buyer_name}</span>
                    {order.buyer_phone && (
                        <span className="block text-xs text-muted-foreground">{order.buyer_phone}</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Items',
            accessorKey: 'items',
            cell: (order) => `${order.items?.length || 0} item`,
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            cell: (order) => `Rp ${order.total_amount.toLocaleString('id-ID')}`,
        },
        {
            header: 'Stok',
            accessorKey: 'stock_location',
            cell: (order) => (
                <Badge variant="outline" className="text-xs">
                    {order.stock_location === 'gudang' ? '📦 Gudang' : '🏪 Toko'}
                </Badge>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (order) => {
                const config = statusConfig[order.status];
                return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config?.color}`}>
                        {config?.label || order.status}
                    </span>
                );
            },
        },
        {
            header: 'Resi',
            accessorKey: 'tracking_number',
            cell: (order) => order.tracking_number ? (
                <div className="text-xs">
                    <span className="font-medium uppercase">{order.courier}</span>
                    <span className="block text-muted-foreground">{order.tracking_number}</span>
                </div>
            ) : '-',
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (order) => format(new Date(order.created_at), 'dd MMM yyyy HH:mm', { locale: localeId }),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (order) => (
                <Button variant="ghost" size="sm" onClick={() => navigate(`/tokopedia/${order.id}`)} className="gap-1">
                    <Eye className="w-4 h-4" /> Detail
                </Button>
            ),
        },
    ];

    if (isLoading) {
        return (
            <MainLayout title="Order Tokopedia" subtitle="Kelola penjualan via Tokopedia">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Order Tokopedia"
            subtitle="Kelola pesanan penjualan dari Tokopedia"
            actions={
                (role === 'cashier' || role === 'admin') && (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl gap-2">
                                <Plus className="h-4 w-4" /> Order Baru
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-green-600" /> Order Tokopedia Baru
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-5 mt-4">
                                {/* Buyer Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nama Pembeli *</Label>
                                        <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Nama customer" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>No. Telepon</Label>
                                        <Input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="08xxx" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Alamat Pengiriman</Label>
                                    <Textarea value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} placeholder="Alamat lengkap..." rows={2} />
                                </div>

                                {/* Tokopedia IDs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>ID Order Tokopedia</Label>
                                        <Input value={tokopediaOrderId} onChange={e => setTokopediaOrderId(e.target.value)} placeholder="INV/xxx (opsional)" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Invoice Tokopedia</Label>
                                        <Input value={tokopediaInvoice} onChange={e => setTokopediaInvoice(e.target.value)} placeholder="Nomor invoice (opsional)" />
                                    </div>
                                </div>

                                {/* Stock Location */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Ambil Stok Dari *</Label>
                                        <Select value={stockLocation} onValueChange={v => setStockLocation(v as Location)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gudang">📦 Gudang</SelectItem>
                                                <SelectItem value="toko">🏪 Toko</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ongkir</Label>
                                        <Input isCurrency type="number" min={0} value={shippingCost} onChange={e => setShippingCost(parseInt(e.target.value) || 0)} placeholder="Ongkos kirim" />
                                    </div>
                                </div>

                                {/* Add Item */}
                                <div className="border rounded-xl p-4 space-y-4">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Tambah Item
                                    </h4>
                                    <ProductSearchSelect
                                        products={products}
                                        value={selectedProductId}
                                        onChange={setSelectedProductId}
                                        placeholder="Cari produk..."
                                        excludeIds={items.filter(i => i.productId).map(i => i.productId as string)}
                                    />
                                    <div className="grid grid-cols-3 gap-3">
                                        <Input type="number" min={1} placeholder="Qty" value={itemQty} onChange={e => setItemQty(parseFloat(e.target.value) || 1)} />
                                        <Input isCurrency type="number" min={0} placeholder="Harga" value={itemPrice} onChange={e => setItemPrice(parseInt(e.target.value) || 0)} />
                                        <Button onClick={handleAddItem} disabled={!selectedProductId}>+ Tambah</Button>
                                    </div>
                                </div>

                                {/* Items List */}
                                {items.length > 0 && (
                                    <div className="border rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="text-left p-3">Produk</th>
                                                    <th className="text-center p-3">Qty</th>
                                                    <th className="text-right p-3">Harga</th>
                                                    <th className="text-right p-3">Subtotal</th>
                                                    <th className="p-3"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map(item => (
                                                    <tr key={item.id} className="border-t">
                                                        <td className="p-3">
                                                            {item.productName}
                                                            {item.barcode && <span className="text-xs text-muted-foreground block">{item.barcode}</span>}
                                                        </td>
                                                        <td className="text-center p-3">{item.quantity}</td>
                                                        <td className="text-right p-3">Rp {item.unitPrice.toLocaleString('id-ID')}</td>
                                                        <td className="text-right p-3 font-medium">Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}</td>
                                                        <td className="p-3">
                                                            <Button size="sm" variant="ghost" onClick={() => setItems(items.filter(i => i.id !== item.id))}>✕</Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t bg-muted/50">
                                                    <td colSpan={3} className="p-3 text-right font-medium">Total:</td>
                                                    <td className="text-right p-3 font-bold">
                                                        Rp {items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0).toLocaleString('id-ID')}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Catatan</Label>
                                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan (opsional)" rows={2} />
                                </div>

                                <Button
                                    className="w-full"
                                    size="lg"
                                    disabled={!buyerName.trim() || items.length === 0 || createOrder.isPending}
                                    onClick={handleSubmit}
                                >
                                    {createOrder.isPending ? 'Menyimpan...' : 'Buat Order'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }
        >
            <div className="space-y-6">
                {/* Stats */}
                <StatsGrid columns={4}>
                    <StatsCard title="Pesanan Baru" value={(stats?.orderReceived || 0).toString()} icon={<ShoppingBag className="w-5 h-5" />} subtitleType="warning" />
                    <StatsCard title="Dikemas" value={(stats?.packing || 0).toString()} icon={<Package className="w-5 h-5" />} subtitleType="info" />
                    <StatsCard title="Dikirim" value={(stats?.shipped || 0).toString()} icon={<Truck className="w-5 h-5" />} subtitleType="info" />
                    <StatsCard title="Selesai" value={(stats?.completed || 0).toString()} icon={<CheckCircle className="w-5 h-5" />} subtitleType="success" />
                </StatsGrid>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            className="pl-10"
                            placeholder="Cari order, pembeli, atau resi..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap">
                            <TabsTrigger value="all" className="text-xs px-2 sm:px-3">Semua</TabsTrigger>
                            <TabsTrigger value="order_received" className="text-xs px-2 sm:px-3">Baru</TabsTrigger>
                            <TabsTrigger value="packing" className="text-xs px-2 sm:px-3">Kemas</TabsTrigger>
                            <TabsTrigger value="shipped" className="text-xs px-2 sm:px-3">Kirim</TabsTrigger>
                            <TabsTrigger value="completed" className="text-xs px-2 sm:px-3">Selesai</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Table */}
                <BeautifulTable
                    data={filteredOrders}
                    columns={columns}
                    title="Daftar Order Tokopedia"
                    hideSelection
                />
            </div>
        </MainLayout>
    );
}

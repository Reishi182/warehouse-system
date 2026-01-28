import { useState, useMemo } from 'react';
import { Plus, ShoppingBag, Package, Upload, ExternalLink } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import ProductSearchSelect from '@/components/common/ProductSearchSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useMarketplaceOrders, useCreateMarketplaceOrder } from '@/hooks/useMarketplaceOrders';
import { MarketplaceOrder, MarketplaceType, Product } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { compressImageToFile, isImageFile } from '@/lib/imageCompression';

interface OrderItem {
    id: string;
    productId?: string;
    productName: string;
    barcode?: string;
    unit: string;
    quantity: number;
    unitPrice: number;
}

export default function MarketplaceOrders() {
    const role = useRole();
    const { user, profile } = useAuth();
    const { products } = useData();
    const { toast } = useToast();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    // Form state
    const [marketplace, setMarketplace] = useState<MarketplaceType>('tokopedia');
    const [marketplaceOrderId, setMarketplaceOrderId] = useState('');
    const [destination, setDestination] = useState<'gudang' | 'toko'>('gudang');
    const [notes, setNotes] = useState('');
    const [customNumber, setCustomNumber] = useState('');
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);

    // Add item state
    const [selectedProductId, setSelectedProductId] = useState('');
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductBarcode, setNewProductBarcode] = useState('');
    const [itemUnit, setItemUnit] = useState('pcs');
    const [itemQty, setItemQty] = useState(1);
    const [itemPrice, setItemPrice] = useState(0);

    // Hooks
    const { data: orders = [], isLoading } = useMarketplaceOrders();
    const createOrder = useCreateMarketplaceOrder();

    // Filtered orders by status
    const filteredOrders = useMemo(() => {
        if (activeTab === 'all') return orders;
        return orders.filter(o => o.status === activeTab);
    }, [orders, activeTab]);

    // Stats
    const pendingCount = useMemo(() => orders.filter(o => o.status === 'pending_arrival').length, [orders]);
    const completedCount = useMemo(() => orders.filter(o => o.status === 'completed').length, [orders]);
    const issueCount = useMemo(() => orders.filter(o => ['received_with_issue', 'return_pending'].includes(o.status)).length, [orders]);

    const handleAddItem = () => {
        let newItem: OrderItem;

        if (isNewProduct) {
            if (!newProductName.trim()) {
                toast({ title: 'Nama produk wajib diisi', variant: 'destructive' });
                return;
            }
            newItem = {
                id: `new-${Date.now()}`,
                productName: newProductName,
                barcode: newProductBarcode || undefined,
                unit: itemUnit,
                quantity: itemQty,
                unitPrice: itemPrice,
            };
        } else {
            if (!selectedProductId) {
                toast({ title: 'Pilih produk', variant: 'destructive' });
                return;
            }
            const product = products.find(p => p.id === selectedProductId);
            if (!product) return;

            newItem = {
                id: `item-${Date.now()}`,
                productId: product.id,
                productName: product.name,
                barcode: product.barcode,
                unit: itemUnit,
                quantity: itemQty,
                unitPrice: itemPrice || product.price,
            };
        }

        setItems([...items, newItem]);
        resetItemForm();
    };

    const resetItemForm = () => {
        setSelectedProductId('');
        setIsNewProduct(false);
        setNewProductName('');
        setNewProductBarcode('');
        setItemUnit('pcs');
        setItemQty(1);
        setItemPrice(0);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSubmit = async () => {
        if (items.length === 0) {
            toast({ title: 'Tambahkan minimal 1 item', variant: 'destructive' });
            return;
        }

        // Upload invoice if provided
        let invoiceUrl: string | undefined;
        if (invoiceFile) {
            // Auto-compress if it's an image
            const fileToUpload = isImageFile(invoiceFile)
                ? await compressImageToFile(invoiceFile, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
                : invoiceFile;

            const fileExt = fileToUpload.name.split('.').pop();
            const fileName = `marketplace-invoices/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, fileToUpload);

            if (!uploadError) {
                const { data: urlData } = supabase.storage
                    .from('documents')
                    .getPublicUrl(fileName);
                invoiceUrl = urlData.publicUrl;
            }
        }

        await createOrder.mutateAsync({
            marketplace,
            marketplaceOrderId: marketplaceOrderId || undefined,
            destination,
            invoiceUrl,
            notes: notes || undefined,
            createdBy: user?.id || '',
            createdByName: profile?.name || '',
            customNumber: customNumber || undefined,
            items: items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                barcode: item.barcode,
                unit: item.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            })),
        });

        // Reset form
        setMarketplace('tokopedia');
        setMarketplaceOrderId('');
        setDestination('gudang');
        setNotes('');
        setCustomNumber('');
        setInvoiceFile(null);
        setItems([]);
        setIsCreateOpen(false);
    };

    // Table columns
    const columns: Column<MarketplaceOrder>[] = [
        {
            header: 'No. Pesanan',
            accessorKey: 'order_number',
            cell: (order) => (
                <div>
                    <span className="font-semibold">{order.order_number}</span>
                    {order.marketplace_order_id && (
                        <span className="block text-xs text-muted-foreground">{order.marketplace_order_id}</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Marketplace',
            accessorKey: 'marketplace',
            cell: (order) => {
                const colors: Record<string, string> = {
                    tokopedia: 'bg-green-100 text-green-700',
                    shopee: 'bg-orange-100 text-orange-700',
                    lazada: 'bg-blue-100 text-blue-700',
                    bukalapak: 'bg-pink-100 text-pink-700',
                    other: 'bg-gray-100 text-gray-700',
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[order.marketplace]}`}>
                        {order.marketplace.toUpperCase()}
                    </span>
                );
            },
        },
        {
            header: 'Tujuan',
            accessorKey: 'destination',
            cell: (order) => order.destination === 'gudang' ? '📦 Gudang' : '🏪 Toko',
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
            header: 'Status',
            accessorKey: 'status',
            cell: (order) => {
                const statusColors: Record<string, string> = {
                    pending_arrival: 'bg-yellow-100 text-yellow-700',
                    completed: 'bg-green-100 text-green-700',
                    received_with_issue: 'bg-red-100 text-red-700',
                    return_pending: 'bg-orange-100 text-orange-700',
                    return_complete: 'bg-blue-100 text-blue-700',
                    cancelled: 'bg-gray-100 text-gray-700',
                };
                const statusLabels: Record<string, string> = {
                    pending_arrival: 'Menunggu Barang',
                    completed: 'Selesai',
                    received_with_issue: 'Ada Masalah',
                    return_pending: 'Return Pending',
                    return_complete: 'Return Selesai',
                    cancelled: 'Dibatalkan',
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                    </span>
                );
            },
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (order) => format(new Date(order.created_at), 'dd MMM yyyy', { locale: localeId }),
        },
        {
            header: 'Invoice',
            accessorKey: 'invoice_url',
            cell: (order) => order.invoice_url ? (
                <a href={order.invoice_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Lihat
                </a>
            ) : '-',
        },
    ];

    const isMainOffice = role === 'main_office' || role === 'admin';

    if (isLoading) {
        return (
            <MainLayout title="Pesanan Marketplace" subtitle="Kelola pembelian dari marketplace">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Pesanan Marketplace"
            subtitle="Kelola pembelian dari Tokopedia, Shopee, dll"
            actions={
                isMainOffice && (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl">
                                <Plus className="h-4 w-4 mr-2" />
                                Buat Pesanan
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" />
                                    Pesanan Marketplace Baru
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 mt-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Marketplace *</Label>
                                        <Select value={marketplace} onValueChange={(v) => setMarketplace(v as MarketplaceType)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="tokopedia">Tokopedia</SelectItem>
                                                <SelectItem value="shopee">Shopee</SelectItem>
                                                <SelectItem value="lazada">Lazada</SelectItem>
                                                <SelectItem value="bukalapak">Bukalapak</SelectItem>
                                                <SelectItem value="other">Lainnya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tujuan Pengiriman *</Label>
                                        <Select value={destination} onValueChange={(v) => setDestination(v as 'gudang' | 'toko')}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gudang">📦 Gudang</SelectItem>
                                                <SelectItem value="toko">🏪 Toko</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nomor Pesanan</Label>
                                        <Input
                                            value={customNumber}
                                            onChange={(e) => setCustomNumber(e.target.value)}
                                            placeholder="MP-xxx (kosongkan untuk auto)"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ID Order Marketplace</Label>
                                        <Input
                                            value={marketplaceOrderId}
                                            onChange={(e) => setMarketplaceOrderId(e.target.value)}
                                            placeholder="INV/xxx/xxx (opsional)"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Upload Invoice/Bukti</Label>
                                    <Input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                                    />
                                    {invoiceFile && <p className="text-xs text-green-600">📎 {invoiceFile.name}</p>}
                                </div>

                                {/* Add Item */}
                                <div className="border rounded-xl p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium flex items-center gap-2">
                                            <Package className="w-4 h-4" /> Tambah Item
                                        </h4>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={isNewProduct}
                                                onChange={(e) => setIsNewProduct(e.target.checked)}
                                            />
                                            Produk Baru
                                        </label>
                                    </div>

                                    {isNewProduct ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                placeholder="Nama Produk *"
                                                value={newProductName}
                                                onChange={(e) => setNewProductName(e.target.value)}
                                            />
                                            <Input
                                                placeholder="Barcode (opsional)"
                                                value={newProductBarcode}
                                                onChange={(e) => setNewProductBarcode(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <ProductSearchSelect
                                            products={products}
                                            value={selectedProductId}
                                            onChange={setSelectedProductId}
                                            placeholder="Cari produk..."
                                            excludeIds={items.filter(i => i.productId).map(i => i.productId as string)}
                                        />
                                    )}

                                    <div className="grid grid-cols-4 gap-4">
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder="Qty"
                                            value={itemQty}
                                            onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                                        />
                                        <Input
                                            placeholder="Unit"
                                            value={itemUnit}
                                            onChange={(e) => setItemUnit(e.target.value)}
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder="Harga"
                                            value={itemPrice}
                                            onChange={(e) => setItemPrice(parseInt(e.target.value) || 0)}
                                        />
                                        <Button onClick={handleAddItem}>+ Tambah</Button>
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
                                                        <td className="text-center p-3">{item.quantity} {item.unit}</td>
                                                        <td className="text-right p-3">Rp {item.unitPrice.toLocaleString('id-ID')}</td>
                                                        <td className="text-right p-3 font-medium">Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}</td>
                                                        <td className="p-3">
                                                            <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.id)}>✕</Button>
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
                                    <Label>Catatan (opsional)</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Catatan tambahan..."
                                        rows={2}
                                    />
                                </div>

                                <Button
                                    className="w-full"
                                    size="lg"
                                    disabled={items.length === 0 || createOrder.isPending}
                                    onClick={handleSubmit}
                                >
                                    {createOrder.isPending ? 'Menyimpan...' : 'Simpan Pesanan'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Menunggu Barang"
                        value={pendingCount.toString()}
                        icon={<ShoppingBag className="w-5 h-5" />}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Selesai"
                        value={completedCount.toString()}
                        icon={<Package className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Bermasalah"
                        value={issueCount.toString()}
                        icon={<Upload className="w-5 h-5" />}
                        subtitleType="danger"
                    />
                </StatsGrid>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">Semua</TabsTrigger>
                        <TabsTrigger value="pending_arrival">Menunggu</TabsTrigger>
                        <TabsTrigger value="completed">Selesai</TabsTrigger>
                        <TabsTrigger value="received_with_issue">Bermasalah</TabsTrigger>
                        <TabsTrigger value="return_pending">Return</TabsTrigger>
                    </TabsList>
                </Tabs>

                <BeautifulTable
                    data={filteredOrders}
                    columns={columns}
                    title="Daftar Pesanan Marketplace"
                    hideSelection
                />
            </div>
        </MainLayout>
    );
}

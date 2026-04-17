import { useState } from 'react';
import {
    Plus,
    Truck,
    Package,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronRight,
    Building2,
    User,
    Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
;
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { useDirectOrders, useCreateDirectOrder } from '@/hooks/useDirectOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { DirectOrder, DirectOrderStatus, Customer } from '@/types';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/common/PageSkeleton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const statusConfig: Record<DirectOrderStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    confirmed: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
    shipped: { label: 'Dikirim', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck },
    delivered: { label: 'Terkirim', color: 'bg-green-100 text-green-700 border-green-200', icon: Package },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

interface OrderItem {
    product_name: string;
    quantity: number;
    unit: string;
    price: number;
}

export default function DirectOrders() {
    const navigate = useNavigate();
    const { data: orders = [], isLoading } = useDirectOrders();
    const { data: suppliers = [] } = useSuppliers();
    const createOrder = useCreateDirectOrder();

    // Fetch customers
    const { data: customers = [] } = useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data as Customer[];
        }
    });

    const [statusFilter, setStatusFilter] = useState<DirectOrderStatus | 'all'>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Create form state
    const [supplierId, setSupplierId] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryPhone, setDeliveryPhone] = useState('');
    const [shippingCost, setShippingCost] = useState(0);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<OrderItem[]>([{ product_name: '', quantity: 1, unit: 'pcs', price: 0 }]);

    const filteredOrders = (orders || []).filter(order => {
        return statusFilter === 'all' || order.status === statusFilter;
    });

    const handleSupplierChange = (id: string) => {
        setSupplierId(id);
        const supplier = suppliers?.find(s => s.id === id);
        if (supplier) {
            setSupplierName(supplier.name);
        }
    };

    const handleCustomerChange = (id: string) => {
        setCustomerId(id);
        const customer = customers?.find(c => c.id === id);
        if (customer) {
            setCustomerName(customer.name);
            setDeliveryAddress(customer.address || '');
            setDeliveryPhone(customer.phone || '');
        }
    };

    const addItem = () => {
        setItems([...items, { product_name: '', quantity: 1, unit: 'pcs', price: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const totalItems = items.reduce((acc, it) => acc + (it.quantity * it.price), 0);
    const totalAmount = totalItems + shippingCost;

    const resetForm = () => {
        setSupplierId('');
        setSupplierName('');
        setCustomerName('');
        setCustomerId('');
        setDeliveryAddress('');
        setDeliveryPhone('');
        setShippingCost(0);
        setNotes('');
        setItems([{ product_name: '', quantity: 1, unit: 'pcs', price: 0 }]);
    };

    const handleCreate = async () => {
        if (!supplierId || !customerName || !deliveryAddress || items.some(it => !it.product_name)) {
            return;
        }

        await createOrder.mutateAsync({
            supplier_id: supplierId,
            supplier_name: supplierName,
            customer_id: customerId || crypto.randomUUID(),
            customer_name: customerName,
            delivery_address: deliveryAddress,
            delivery_phone: deliveryPhone,
            shipping_cost: shippingCost,
            notes,
            items,
        });

        setIsCreateOpen(false);
        resetForm();
    };

    // Table columns
    const columns: Column<DirectOrder>[] = [
        {
            header: 'No. Order',
            accessorKey: 'order_number',
            cell: (order: DirectOrder) => (
                <span className="font-mono font-semibold text-sm">{order.order_number}</span>
            )
        },
        {
            header: 'Supplier',
            accessorKey: 'supplier_name',
            cell: (order: DirectOrder) => (
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>{order.supplier_name}</span>
                </div>
            )
        },
        {
            header: 'Customer',
            accessorKey: 'customer_name',
            cell: (order: DirectOrder) => (
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{order.customer_name}</span>
                </div>
            )
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            cell: (order: DirectOrder) => (
                <span className="font-semibold">Rp {order.total_amount.toLocaleString('id-ID')}</span>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (order: DirectOrder) => {
                const StatusIcon = statusConfig[order.status].icon;
                return (
                    <Badge className={cn('border', statusConfig[order.status].color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[order.status].label}
                    </Badge>
                );
            }
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (order: DirectOrder) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'dd MMM yyyy', { locale: idLocale })}
                </span>
            )
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (order: DirectOrder) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/direct-orders/${order.id}`)}
                    className="gap-1"
                >
                    <Eye className="w-4 h-4" />
                    Detail
                </Button>
            )
        }
    ];

    // Prepare supplier options for SearchableSelect
    const supplierOptions = suppliers.map(s => ({
        value: s.id,
        label: s.name,
        description: s.phone || s.email || undefined
    }));

    // Prepare customer options for SearchableSelect
    const customerOptions = customers.map(c => ({
        value: c.id,
        label: c.name,
        description: c.phone || c.address || undefined
    }));

    // Stats calculations
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const shippedCount = orders.filter(o => o.status === 'shipped').length;
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;

    if (isLoading) {
        return (
            <MainLayout title="Direct Order" subtitle="Supplier langsung ke Customer">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Direct Order"
            subtitle="Order langsung dari Supplier ke Customer"
            actions={
                <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Order
                </Button>
            }
        >
            <div className="space-y-6">
                {/* Stats */}
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Order"
                        value={orders.length}
                        icon={<Truck className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Pending"
                        value={pendingCount}
                        icon={<Clock className="w-5 h-5" />}
                        variant="warning"
                    />
                    <StatsCard
                        title="Dikirim"
                        value={shippedCount}
                        icon={<Package className="w-5 h-5" />}
                        variant="info"
                    />
                    <StatsCard
                        title="Terkirim"
                        value={deliveredCount}
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        variant="success"
                    />
                </StatsGrid>

                {/* Table */}
                <BeautifulTable
                    data={filteredOrders}
                    columns={columns}
                    title="Daftar Direct Order"
                    isLoading={isLoading}
                    hideSelection
                    filters={
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DirectOrderStatus | 'all')}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
                                <SelectItem value="shipped">Dikirim</SelectItem>
                                <SelectItem value="delivered">Terkirim</SelectItem>
                                <SelectItem value="cancelled">Dibatalkan</SelectItem>
                            </SelectContent>
                        </Select>
                    }
                    emptyState={{
                        icon: <Truck className="w-10 h-10" />,
                        title: "Belum Ada Direct Order",
                        description: "Buat order pertama untuk mengirimkan langsung dari supplier ke customer",
                        actionLabel: "Buat Order Pertama",
                        onAction: () => setIsCreateOpen(true)
                    }}
                />
            </div>

            {/* Create Order Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Buat Direct Order</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Supplier */}
                        <div className="space-y-2">
                            <Label>Supplier *</Label>
                            <SearchableSelect
                                options={supplierOptions}
                                value={supplierId}
                                onValueChange={handleSupplierChange}
                                placeholder="Pilih supplier..."
                                searchPlaceholder="Cari supplier..."
                                emptyMessage="Supplier tidak ditemukan."
                            />
                        </div>

                        {/* Customer */}
                        <div className="space-y-2">
                            <Label>Customer *</Label>
                            <SearchableSelect
                                options={customerOptions}
                                value={customerId}
                                onValueChange={handleCustomerChange}
                                placeholder="Pilih customer..."
                                searchPlaceholder="Cari customer..."
                                emptyMessage="Customer tidak ditemukan."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nama Customer</Label>
                                <Input
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Nama penerima"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Telepon</Label>
                                <Input
                                    value={deliveryPhone}
                                    onChange={(e) => setDeliveryPhone(e.target.value)}
                                    placeholder="08xx-xxxx-xxxx"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Alamat Pengiriman *</Label>
                            <Textarea
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                placeholder="Alamat lengkap pengiriman..."
                                rows={2}
                            />
                        </div>

                        {/* Items */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Item Pesanan</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                    <Plus className="w-3 h-3 mr-1" />
                                    Tambah Item
                                </Button>
                            </div>
                            {items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                                    <div className="col-span-4 space-y-1">
                                        <Label className="text-xs">Nama Produk</Label>
                                        <Input
                                            value={item.product_name}
                                            onChange={(e) => updateItem(idx, 'product_name', e.target.value)}
                                            placeholder="Nama produk"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-xs">Qty</Label>
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                            min={1}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-xs">Unit</Label>
                                        <Input
                                            value={item.unit}
                                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                            placeholder="pcs"
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <Label className="text-xs">Harga</Label>
                                        <Input isCurrency
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => updateItem(idx, 'price', parseInt(e.target.value) || 0)}
                                            min={0}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItem(idx)}
                                            disabled={items.length === 1}
                                        >
                                            <XCircle className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Shipping & Notes */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Biaya Pengiriman</Label>
                                <Input isCurrency
                                    type="number"
                                    value={shippingCost}
                                    onChange={(e) => setShippingCost(parseInt(e.target.value) || 0)}
                                    min={0}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Catatan</Label>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Catatan tambahan..."
                                />
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal Item</span>
                                <span>Rp {totalItems.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Biaya Pengiriman</span>
                                <span>Rp {shippingCost.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                <span>Total</span>
                                <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={createOrder.isPending || !supplierId || !customerName || !deliveryAddress}
                        >
                            {createOrder.isPending ? 'Menyimpan...' : 'Buat Order'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

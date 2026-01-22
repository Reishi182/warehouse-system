import { useState } from 'react';
import {
    Plus,
    Truck,
    Package,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronRight,
    Search,
    Filter,
    Building2,
    User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useDirectOrders, useCreateDirectOrder } from '@/hooks/useDirectOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { DirectOrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/common/PageSkeleton';

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
    const { data: orders, isLoading } = useDirectOrders();
    const { data: suppliers } = useSuppliers();
    const createOrder = useCreateDirectOrder();

    const [searchQuery, setSearchQuery] = useState('');
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
        const matchesSearch =
            order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleSupplierChange = (id: string) => {
        setSupplierId(id);
        const supplier = suppliers?.find(s => s.id === id);
        if (supplier) {
            setSupplierName(supplier.name);
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

    if (isLoading) {
        return (
            <MainLayout title="Direct Order" subtitle="Supplier langsung ke Customer">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Direct Order" subtitle="Order langsung dari Supplier ke Customer">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari order, supplier, atau customer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DirectOrderStatus | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="w-4 h-4 mr-2" />
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
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Order
                </Button>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">Belum Ada Direct Order</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Buat order pertama untuk mengirimkan langsung dari supplier ke customer
                        </p>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Buat Order Pertama
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredOrders.map((order) => {
                        const StatusIcon = statusConfig[order.status].icon;
                        return (
                            <Card
                                key={order.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => navigate(`/direct-orders/${order.id}`)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-mono font-semibold text-sm">
                                                    {order.order_number}
                                                </span>
                                                <Badge className={cn('border', statusConfig[order.status].color)}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {statusConfig[order.status].label}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Building2 className="w-4 h-4" />
                                                    <span>{order.supplier_name}</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4" />
                                                <div className="flex items-center gap-1">
                                                    <User className="w-4 h-4" />
                                                    <span>{order.customer_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">
                                                Rp {order.total_amount.toLocaleString('id-ID')}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(order.created_at).toLocaleDateString('id-ID')}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

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
                            <Select value={supplierId} onValueChange={handleSupplierChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih supplier..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers?.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Customer */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nama Customer *</Label>
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
                                        <Input
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
                                <Input
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

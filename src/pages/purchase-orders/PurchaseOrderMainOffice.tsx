import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, FileText, Printer, Eye, Trash2, Package, Check, X, Ban, Calendar, Camera, User, CalendarCheck, AlertTriangle, Image, Pencil } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import ProductSearchSelect from '@/components/common/ProductSearchSelect';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { DateInput } from '@/components/common/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import UnitSelector from '@/components/common/UnitSelector';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import {
    usePurchaseOrders,
    usePurchaseOrder,
    useCreatePurchaseOrder,
    useUpdatePurchaseOrder,
    useCancelPurchaseOrder,
    usePOReceipt,
} from '@/hooks/usePurchaseOrders';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useProductUnits } from '@/hooks/useProductUnits';
import PrintPurchaseOrder from '@/components/print/PrintPurchaseOrder';
import { PurchaseOrder, PODestination, Product } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '@/integrations/supabase/client';

interface POItem {
    id: string;
    productId: string;
    productName: string;
    barcode?: string; // For new products
    unit?: string; // For new products
    quantity: number;
    unitPrice: number;
    isNewProduct?: boolean; // Flag for products not in catalog
    isBonus?: boolean; // Flag for bonus items (price = 0, tidak dihitung ke total)
}

const statusLabels: Record<string, { label: string; color: string }> = {
    pending_auditor: { label: 'Menunggu Auditor', color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
    pending_receipt: { label: 'Menunggu Penerimaan', color: 'bg-purple-100 text-purple-700' },
    completed: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
    completed_with_discrepancy: { label: 'Selesai Ada Selisih', color: 'bg-orange-100 text-orange-700' },
    cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-700' },
};

export default function PurchaseOrderMainOffice() {
    const { user, profile } = useAuth();
    const { products, loading: productsLoading } = useData();
    const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
    const { data: purchaseOrders = [], isLoading: posLoading } = usePurchaseOrders();
    const { data: storeSettings } = useStoreSettings();
    const { data: globalUnits = [] } = useProductUnits();
    const createPO = useCreatePurchaseOrder();
    const updatePO = useUpdatePurchaseOrder();
    const cancelPO = useCancelPurchaseOrder();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editPOId, setEditPOId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('all');
    const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [poToCancel, setPOToCancel] = useState<PurchaseOrder | null>(null);
    const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Print handler using react-to-print
    const handlePrintAction = useReactToPrint({
        contentRef: printRef,
        documentTitle: selectedPOId ? `PO-${selectedPOId}` : 'Purchase Order',
        onAfterPrint: () => {
            setIsPrintDialogOpen(false);
        },
    });

    // Form state
    const [supplierId, setSupplierId] = useState('');
    const [destination, setDestination] = useState<PODestination>('toko');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItem[]>([]);
    const [poDate, setPODate] = useState(() => {
        // Default to today in YYYY-MM-DD format (local timezone)
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });

    // Add item state
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemQty, setItemQty] = useState(1);
    const [itemPrice, setItemPrice] = useState(0);
    const [selectedUnit, setSelectedUnit] = useState<string>('');
    const [itemIsBonus, setItemIsBonus] = useState(false);

    const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

    // Auto-populate unit and price when a product is selected
    useEffect(() => {
        if (selectedProduct) {
            const defaultUnit = selectedProduct.has_multi_unit && selectedProduct.main_unit 
                ? selectedProduct.main_unit 
                : (selectedProduct.sell_unit || 'pcs');
            setSelectedUnit(defaultUnit);
            
            const defaultPrice = selectedProduct.has_multi_unit && selectedProduct.main_unit && defaultUnit === selectedProduct.main_unit && selectedProduct.box_price != null 
                ? selectedProduct.box_price 
                : selectedProduct.price;
            setItemPrice(defaultPrice);
        } else {
            setSelectedUnit('');
            setItemPrice(0);
        }
    }, [selectedProduct]);

    // Update price if unit changes manually
    const handleUnitChange = (unit: string) => {
        setSelectedUnit(unit);
        if (selectedProduct && selectedProduct.has_multi_unit && selectedProduct.main_unit) {
             if (unit === selectedProduct.main_unit && selectedProduct.box_price != null) {
                 setItemPrice(selectedProduct.box_price);
             } else {
                 setItemPrice(selectedProduct.price);
             }
        }
    };

    // New product mode state
    const [isNewProductMode, setIsNewProductMode] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductBarcode, setNewProductBarcode] = useState('');
    const [newProductUnit, setNewProductUnit] = useState('pcs');

    const { data: selectedPO, isLoading: selectedPOLoading } = usePurchaseOrder(selectedPOId || '');
    const { data: poReceipt, isLoading: receiptLoading } = usePOReceipt(selectedPOId || '');

    const loading = productsLoading || suppliersLoading || posLoading;

    const filteredPOs = useMemo(() => {
        if (activeTab === 'all') return purchaseOrders;
        return purchaseOrders.filter(po => po.status === activeTab);
    }, [purchaseOrders, activeTab]);

    const totalAmount = useMemo(() => {
        // Item bonus tidak dihitung ke total (harganya 0)
        return items.reduce((acc, item) => acc + (item.isBonus ? 0 : (item.quantity * item.unitPrice)), 0);
    }, [items]);

    const handleAddItem = () => {
        // Harga 0 diizinkan (produk gratis atau bonus)
        if (itemQty <= 0) return;

        if (isNewProductMode) {
            // New product mode - use free text input
            if (!newProductName.trim()) return;

            const newItem: POItem = {
                id: crypto.randomUUID(),
                productId: '', // No product ID for new products
                productName: newProductName.trim(),
                barcode: newProductBarcode.trim() || undefined,
                unit: newProductUnit || 'pcs',
                quantity: itemQty,
                unitPrice: itemIsBonus ? 0 : itemPrice,
                isNewProduct: true,
                isBonus: itemIsBonus,
            };

            setItems([...items, newItem]);
            setNewProductName('');
            setNewProductBarcode('');
            setNewProductUnit('pcs');
        } else {
            // Existing product mode
            if (!selectedProductId) return;
            const product = products.find(p => p.id === selectedProductId);
            if (!product) return;

            const newItem: POItem = {
                id: crypto.randomUUID(),
                productId: product.id,
                productName: product.name,
                unit: selectedUnit || product.sell_unit || 'pcs',
                quantity: itemQty,
                unitPrice: itemIsBonus ? 0 : itemPrice,
                isNewProduct: false,
                isBonus: itemIsBonus,
            };

            setItems([...items, newItem]);
            setSelectedProductId('');
        }

        setItemQty(1);
        setItemPrice(0);
        setItemIsBonus(false);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleCreatePO = async () => {
        if (!supplierId || items.length === 0) return;

        if (editPOId) {
            await updatePO.mutateAsync({
                poId: editPOId,
                supplierId,
                destination,
                notes: notes || undefined,
                createdBy: user?.id || '',
                createdByName: profile?.name || '',
                poDate,
                items: items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.isBonus ? 0 : item.unitPrice,
                    isNewProduct: item.isNewProduct,
                    barcode: item.barcode,
                    unit: item.unit,
                    isBonus: item.isBonus,
                })),
            });
        } else {
            await createPO.mutateAsync({
                supplierId,
                destination,
                notes: notes || undefined,
                createdBy: user?.id || '',
                createdByName: profile?.name || '',
                poDate,
                items: items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.isBonus ? 0 : item.unitPrice,
                    isNewProduct: item.isNewProduct,
                    barcode: item.barcode,
                    unit: item.unit,
                    isBonus: item.isBonus,
                })),
            });
        }

        // Reset form
        setSupplierId('');
        setDestination('toko');
        setNotes('');
        setItems([]);
        setEditPOId(null);
        setPODate(() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        });
        setIsCreateOpen(false);
    };

    const openCreateDialog = () => {
        setEditPOId(null);
        setSupplierId('');
        setDestination('toko');
        setNotes('');
        setItems([]);
        setPODate(() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        });
        setIsCreateOpen(true);
    };

    const handleEditPO = async (po: PurchaseOrder) => {
        setEditPOId(po.id);
        setSupplierId(po.supplier_id || '');
        setDestination(po.destination);
        setNotes(po.notes || '');
        setPODate(po.po_date || po.created_at.split('T')[0]);
        // we need to set items, but we need items array not yet loaded?
        // Ah, if we open edit, we better fetch items if they are not in the current `po` object.
        // Wait, does `purchaseOrders` query include items? No, it only includes `supplier:suppliers(*)`.
        // We will just do a quick supabase query to fetch items. Or `usePurchaseOrder` will fetch it.
        // For immediate UI, let's fetch it manually here since it's a one-off.
        try {
            const { data: poItems } = await supabase
                .from('purchase_order_items')
                .select('*')
                .eq('purchase_order_id', po.id);
                
            if (poItems) {
                setItems(poItems.map((item: any) => ({
                    id: crypto.randomUUID(), // local UI id
                    productId: item.product_id || '',
                    productName: item.product_name,
                    barcode: item.barcode,
                    unit: item.unit,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    isNewProduct: item.is_new_product,
                    isBonus: item.is_bonus || false,
                })));
            }
        } catch (err) {
            console.error('Failed to load items for editing', err);
        }
        setIsCreateOpen(true);
    };

    const handleViewPO = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        setIsViewOpen(true);
    };

    const handlePrint = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        setIsPrintDialogOpen(true);
    };

    const handleCancelPO = (po: PurchaseOrder) => {
        setPOToCancel(po);
        setCancelReason('');
        setIsCancelDialogOpen(true);
    };

    const confirmCancelPO = async () => {
        if (!poToCancel) return;
        await cancelPO.mutateAsync({
            poId: poToCancel.id,
            cancelledBy: user?.id || '',
            cancelledByName: profile?.name || '',
            reason: cancelReason || undefined,
        });
        setIsCancelDialogOpen(false);
        setPOToCancel(null);
        setCancelReason('');
    };

    const columns: Column<PurchaseOrder>[] = [
        {
            header: 'No. PO',
            accessorKey: 'po_number',
            cell: (item) => <span className="font-mono font-medium">{item.po_number}</span>,
        },
        {
            header: 'Supplier',
            accessorKey: 'supplier',
            cell: (item) => <span>{item.supplier?.name || '-'}</span>,
        },
        {
            header: 'Tujuan',
            accessorKey: 'destination',
            cell: (item) => (
                <span className="capitalize">{item.destination}</span>
            ),
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            cell: (item) => (
                <span className="font-semibold">Rp {item.total_amount.toLocaleString('id-ID')}</span>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item) => {
                const status = statusLabels[item.status] || { label: item.status, color: 'bg-gray-100' };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.label}
                    </span>
                );
            },
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (item) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'dd MMM yyyy', { locale: localeId })}
                </span>
            ),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewPO(item)}>
                        <Eye className="w-4 h-4" />
                    </Button>
                    {['pending_receipt', 'pending_auditor', 'rejected'].includes(item.status) && (
                        <Button size="sm" variant="outline" onClick={() => handleEditPO(item)}>
                            <Pencil className="w-4 h-4" />
                        </Button>
                    )}
                    {(item.status === 'pending_receipt' || item.status === 'completed') && (
                        <Button size="sm" variant="outline" onClick={() => handlePrint(item)}>
                            <Printer className="w-4 h-4" />
                        </Button>
                    )}
                    {['pending_receipt', 'pending_auditor', 'approved'].includes(item.status) && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelPO(item)}
                            className="text-destructive hover:text-destructive"
                            title="Batalkan PO"
                        >
                            <Ban className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    if (loading) {
        return (
            <MainLayout title="Purchase Order" subtitle="Kelola pembelian barang">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Purchase Order"
            subtitle="Kelola pembelian barang dari supplier"
            actions={
                <Button
                    onClick={openCreateDialog}
                    className="rounded-xl text-xs sm:text-sm"
                >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Buat PO Baru</span>
                </Button>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total PO"
                        value={purchaseOrders.length}
                        icon={<FileText className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Pending"
                        value={purchaseOrders.filter(p => p.status === 'pending_auditor').length}
                        icon={<Eye className="w-5 h-5" />}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Menunggu"
                        value={purchaseOrders.filter(p => p.status === 'pending_receipt').length}
                        icon={<Package className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Selesai"
                        value={purchaseOrders.filter(p => p.status === 'completed').length}
                        icon={<Check className="w-5 h-5" />}
                        subtitleType="success"
                    />
                </StatsGrid>

                {/* Header */}
                <div className="flex justify-between items-center">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="all">Semua</TabsTrigger>
                            <TabsTrigger value="pending_auditor">Pending</TabsTrigger>
                            <TabsTrigger value="pending_receipt">Menunggu</TabsTrigger>
                            <TabsTrigger value="completed">Selesai</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Table */}
                <BeautifulTable
                    data={filteredPOs}
                    columns={columns}
                    title="Daftar Purchase Order"
                    hideSelection
                    emptyState={{
                        icon: <FileText className="w-10 h-10" />,
                        title: "Belum Ada Purchase Order",
                        description: "Buat PO pertama untuk mulai pemesanan ke supplier.",
                        actionLabel: "Buat PO Baru",
                        onAction: openCreateDialog
                    }}
                />

                {/* Create/Edit PO Dialog */}
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    if (!open) setEditPOId(null);
                    setIsCreateOpen(open);
                }}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                {editPOId ? 'Edit Purchase Order' : 'Buat Purchase Order Baru'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                            {/* Supplier & Destination */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Supplier *</Label>
                                    <SearchableSelect
                                        options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                        value={supplierId}
                                        onValueChange={setSupplierId}
                                        placeholder="Pilih supplier..."
                                        searchPlaceholder="Cari supplier..."
                                        emptyMessage="Supplier tidak ditemukan."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tujuan Pengiriman *</Label>
                                    <Select value={destination} onValueChange={(v) => setDestination(v as PODestination)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gudang">Gudang</SelectItem>
                                            <SelectItem value="toko">Toko</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Tanggal PO */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Tanggal PO *
                                </Label>
                                <DateInput
                                    value={poDate}
                                    onChange={setPODate}
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Nomor PO akan di-generate otomatis berdasarkan tanggal ini (format: PO-DDMMYYYY-XXXX)
                                </p>
                            </div>

                            {/* Add Item */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            Tambah Item
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="new-product-toggle" className="text-sm text-muted-foreground cursor-pointer">
                                                Produk Baru?
                                            </Label>
                                            <button
                                                id="new-product-toggle"
                                                type="button"
                                                onClick={() => setIsNewProductMode(!isNewProductMode)}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${isNewProductMode ? 'bg-primary' : 'bg-muted'
                                                    }`}
                                            >
                                                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isNewProductMode ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                            </button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isNewProductMode ? (
                                        /* New Product Mode - Text Inputs */
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label>Nama Produk *</Label>
                                                    <Input
                                                        value={newProductName}
                                                        onChange={(e) => setNewProductName(e.target.value)}
                                                        placeholder="Nama produk baru"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Barcode (opsional)</Label>
                                                    <Input
                                                        value={newProductBarcode}
                                                        onChange={(e) => setNewProductBarcode(e.target.value)}
                                                        placeholder="Barcode/SKU"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-3 items-end">
                                                <div className="w-24 space-y-2">
                                                    <Label>Unit</Label>
                                                    <UnitSelector
                                                        value={newProductUnit}
                                                        onChange={setNewProductUnit}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="w-24 space-y-2">
                                                    <Label>Qty</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={itemQty}
                                                        onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Label>Harga Satuan</Label>
                                                    <Input isCurrency
                                                        type="number"
                                                        min={0}
                                                        value={itemIsBonus ? 0 : itemPrice}
                                                        disabled={itemIsBonus}
                                                        onChange={(e) => setItemPrice(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <Button onClick={handleAddItem} disabled={!newProductName.trim()}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            {/* Bonus Toggle for new products */}
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setItemIsBonus(!itemIsBonus)}
                                                    className={`relative w-9 h-5 rounded-full transition-colors ${itemIsBonus ? 'bg-green-500' : 'bg-muted'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${itemIsBonus ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                                <Label className="text-sm cursor-pointer" onClick={() => setItemIsBonus(!itemIsBonus)}>
                                                    {itemIsBonus ? (
                                                        <span className="text-green-600 font-medium">✅ Item Bonus (harga Rp 0)</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">Tandai sebagai item bonus?</span>
                                                    )}
                                                </Label>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                💡 Produk baru akan dibuat otomatis saat PO diterima.
                                            </p>
                                        </>
                                    ) : (
                                        /* Existing Product Mode - Dropdown with Search */
                                        <div className="space-y-3">
                                            <div className="flex gap-3 items-end">
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <Label>Produk</Label>
                                                    <ProductSearchSelect
                                                        products={products}
                                                        value={selectedProductId}
                                                        onChange={setSelectedProductId}
                                                        placeholder="Cari produk..."
                                                        excludeIds={items.map(i => i.productId || '')}
                                                    />
                                                </div>
                                                <div className="w-32 space-y-2">
                                                    <Label>Unit</Label>
                                                    <UnitSelector
                                                        product={products.find(p => p.id === selectedProductId)}
                                                        value={selectedUnit}
                                                        onChange={handleUnitChange}
                                                        disabled={!selectedProductId}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="w-24 space-y-2">
                                                    <Label>Qty</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={itemQty}
                                                        onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                                <div className="w-40 space-y-2">
                                                    <Label>Harga Satuan</Label>
                                                    <Input isCurrency
                                                        type="number"
                                                        min={0}
                                                        value={itemIsBonus ? 0 : itemPrice}
                                                        disabled={itemIsBonus}
                                                        onChange={(e) => setItemPrice(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <Button onClick={handleAddItem} disabled={!selectedProductId}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            {/* Bonus Toggle */}
                                            <div className="flex items-center gap-3 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setItemIsBonus(!itemIsBonus)}
                                                    className={`relative w-9 h-5 rounded-full transition-colors ${itemIsBonus ? 'bg-green-500' : 'bg-muted'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${itemIsBonus ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                                <Label className="text-sm cursor-pointer" onClick={() => setItemIsBonus(!itemIsBonus)}>
                                                    {itemIsBonus ? (
                                                        <span className="text-green-600 font-medium">✅ Item Bonus (harga Rp 0, tidak dihitung ke total)</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">Tandai sebagai item bonus dari supplier?</span>
                                                    )}
                                                </Label>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Items List */}
                            {items.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            Item PO ({items.length})
                                            {editPOId && (
                                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                                    — klik qty/harga untuk edit
                                                </span>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {items.map((item, idx) => (
                                                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg ${item.isBonus ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-muted/30'}`}>
                                                    {/* Product name */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-medium truncate">{item.productName}</p>
                                                            {item.isNewProduct && (
                                                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full shrink-0">
                                                                    Produk Baru
                                                                </span>
                                                            )}
                                                            {item.isBonus && (
                                                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full shrink-0 font-semibold">
                                                                    🎁 BONUS
                                                                </span>
                                                            )}
                                                            {!item.isBonus && item.unitPrice === 0 && (
                                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full shrink-0">
                                                                    GRATIS
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.barcode && (
                                                            <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
                                                        )}
                                                    </div>

                                                    {/* Unit (read-only) */}
                                                    <span className="text-xs uppercase font-semibold text-muted-foreground w-10 text-center shrink-0">
                                                        {item.unit || 'pcs'}
                                                    </span>

                                                    {/* Qty — editable */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-xs text-muted-foreground">Qty</span>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const qty = parseInt(e.target.value) || 1;
                                                                setItems(prev => prev.map(it =>
                                                                    it.id === item.id ? { ...it, quantity: qty } : it
                                                                ));
                                                            }}
                                                            className="w-16 h-8 text-center text-sm px-1"
                                                        />
                                                    </div>

                                                    {/* Unit price — editable (locked if bonus) */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-xs text-muted-foreground">Rp</span>
                                                        <Input isCurrency
                                                            type="number"
                                                            min={0}
                                                            value={item.isBonus ? 0 : item.unitPrice}
                                                            disabled={item.isBonus}
                                                            onChange={(e) => {
                                                                const price = parseInt(e.target.value) || 0;
                                                                setItems(prev => prev.map(it =>
                                                                    it.id === item.id ? { ...it, unitPrice: price } : it
                                                                ));
                                                            }}
                                                            className="w-28 h-8 text-sm px-2"
                                                        />
                                                    </div>

                                                    {/* Subtotal */}
                                                    <span className="text-sm font-semibold text-right shrink-0 w-28 tabular-nums">
                                                        {item.isBonus ? (
                                                            <span className="text-green-600 dark:text-green-400">BONUS</span>
                                                        ) : (
                                                            `Rp ${(item.quantity * item.unitPrice).toLocaleString('id-ID')}`
                                                        )}
                                                    </span>

                                                    {/* Bonus toggle button */}
                                                    <button
                                                        type="button"
                                                        title={item.isBonus ? 'Klik untuk hapus status bonus' : 'Tandai sebagai bonus'}
                                                        onClick={() => setItems(prev => prev.map(it =>
                                                            it.id === item.id ? { ...it, isBonus: !it.isBonus, unitPrice: it.isBonus ? it.unitPrice : 0 } : it
                                                        ))}
                                                        className={`shrink-0 h-8 w-8 p-0 rounded text-sm transition-colors ${item.isBonus ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hover:bg-green-200' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                                                    >
                                                        🎁
                                                    </button>

                                                    {/* Remove */}
                                                    <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.id)} className="shrink-0 h-8 w-8 p-0">
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <div className="pt-3 border-t space-y-1">
                                                {items.some(i => i.isBonus) && (
                                                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                                        <span>Item Bonus ({items.filter(i => i.isBonus).reduce((a,i) => a + i.quantity, 0)} pcs, tidak dihitung)</span>
                                                        <span className="font-medium">🎁 Gratis</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between">
                                                    <span className="font-semibold">Total Pembelian</span>
                                                    <span className="font-bold text-lg">Rp {totalAmount.toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}


                            {/* Notes */}
                            <div className="space-y-2">
                                <Label>Catatan (opsional)</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Catatan tambahan..."
                                    rows={3}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 justify-end pt-4">
                                <Button variant="outline" onClick={() => {
                                    setIsCreateOpen(false);
                                    setEditPOId(null);
                                }}>
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleCreatePO}
                                    disabled={!supplierId || items.length === 0 || createPO.isPending || updatePO.isPending}
                                >
                                    {createPO.isPending || updatePO.isPending ? 'Menyimpan...' : (editPOId ? 'Simpan Perubahan' : 'Buat Purchase Order')}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* View PO Dialog */}
                <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detail Purchase Order</DialogTitle>
                        </DialogHeader>
                        {selectedPOLoading ? (
                            <div className="py-8 text-center text-muted-foreground">Memuat...</div>
                        ) : selectedPO ? (
                            <div className="space-y-4 mt-4" id="print-area">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">No. PO</p>
                                        <p className="font-mono font-bold">{selectedPO.po_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusLabels[selectedPO.status]?.color || ''}`}>
                                            {statusLabels[selectedPO.status]?.label || selectedPO.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Supplier</p>
                                        <p className="font-medium">{selectedPO.supplier?.name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tujuan</p>
                                        <p className="font-medium capitalize">{selectedPO.destination}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tanggal</p>
                                        <p>{format(new Date(selectedPO.created_at), 'dd MMMM yyyy', { locale: localeId })}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Dibuat Oleh</p>
                                        <p>{selectedPO.created_by_name || '-'}</p>
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3">Produk</th>
                                                <th className="text-right p-3">Qty</th>
                                                <th className="text-right p-3">Harga</th>
                                                <th className="text-right p-3">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPO.items?.map(item => {
                                                const isBonus = (item as any).is_bonus === true;
                                                const isFree = !isBonus && item.unit_price === 0;
                                                return (
                                                    <tr key={item.id} className={`border-t ${isBonus ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span>{item.product_name}</span>
                                                                {isBonus && (
                                                                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded font-semibold">🎁 BONUS</span>
                                                                )}
                                                                {isFree && (
                                                                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">GRATIS</span>
                                                                )}
                                                                {(item as any).is_new_product && (
                                                                    <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Baru</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="text-right p-3">{item.quantity} <span className="text-xs text-muted-foreground uppercase">{item.unit || 'pcs'}</span></td>
                                                        <td className="text-right p-3">
                                                            {isBonus ? <span className="text-green-600 dark:text-green-400 text-xs font-medium">Gratis</span> : `Rp ${item.unit_price.toLocaleString('id-ID')}`}
                                                        </td>
                                                        <td className="text-right p-3 font-medium">
                                                            {isBonus ? <span className="text-green-600 dark:text-green-400 text-xs">-</span> : `Rp ${item.total_price.toLocaleString('id-ID')}`}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-muted/30">
                                            <tr>
                                                <td colSpan={3} className="text-right p-3 font-semibold">Total</td>
                                                <td className="text-right p-3 font-bold">Rp {selectedPO.total_amount.toLocaleString('id-ID')}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {selectedPO.notes && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Catatan PO</p>
                                        <p>{selectedPO.notes}</p>
                                    </div>
                                )}

                                {selectedPO.rejected_reason && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <p className="text-sm text-red-600 dark:text-red-400">Alasan Ditolak</p>
                                        <p className="text-red-700 dark:text-red-300">{selectedPO.rejected_reason}</p>
                                    </div>
                                )}

                                {/* ===== RECEIPT INFO SECTION ===== */}
                                {(selectedPO.status === 'completed' || selectedPO.status === 'completed_with_discrepancy') && (
                                    <Card className="border-green-200 dark:border-green-800">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                                                <Check className="w-4 h-4" />
                                                Informasi Penerimaan
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {receiptLoading ? (
                                                <div className="py-4 text-center text-muted-foreground text-sm">Memuat data penerimaan...</div>
                                            ) : poReceipt ? (
                                                <div className="space-y-4">
                                                    {/* Receiver info */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-start gap-2">
                                                            <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Diterima Oleh</p>
                                                                <p className="font-medium">{poReceipt.received_by_name || '-'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <CalendarCheck className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Tanggal Penerimaan</p>
                                                                <p className="font-medium">
                                                                    {poReceipt.received_at
                                                                        ? format(new Date(poReceipt.received_at), 'dd MMMM yyyy, HH:mm', { locale: localeId })
                                                                        : format(new Date(poReceipt.created_at), 'dd MMMM yyyy, HH:mm', { locale: localeId })
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Discrepancy details */}
                                                    {poReceipt.has_discrepancy && (
                                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="font-medium text-amber-800 dark:text-amber-200">Terdapat Selisih Penerimaan</p>
                                                                    <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                                                                        <div>
                                                                            <p className="text-amber-600 dark:text-amber-400">Dipesan</p>
                                                                            <p className="font-bold text-amber-800 dark:text-amber-200">{poReceipt.total_ordered} unit</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-amber-600 dark:text-amber-400">Diterima</p>
                                                                            <p className="font-bold text-amber-800 dark:text-amber-200">{poReceipt.total_received} unit</p>
                                                                        </div>
                                                                        {(poReceipt.total_damaged ?? 0) > 0 && (
                                                                            <div>
                                                                                <p className="text-red-600 dark:text-red-400">Rusak</p>
                                                                                <p className="font-bold text-red-700 dark:text-red-300">{poReceipt.total_damaged} unit</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Receipt notes */}
                                                    {poReceipt.notes && (
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1">Catatan Penerimaan</p>
                                                            <p className="text-sm bg-muted/40 p-2 rounded">{poReceipt.notes}</p>
                                                        </div>
                                                    )}

                                                    {/* Photo & Signature Evidence */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Photo evidence */}
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                                <Camera className="w-3 h-3" />
                                                                Foto Bukti Penerimaan
                                                            </p>
                                                            {poReceipt.photo_url ? (
                                                                <img
                                                                    src={poReceipt.photo_url}
                                                                    alt="Bukti penerimaan"
                                                                    className="rounded-lg border cursor-pointer hover:opacity-80 transition-opacity max-h-40 w-full object-cover"
                                                                    onClick={() => setPhotoModalUrl(poReceipt.photo_url!)}
                                                                />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-24 bg-muted/30 rounded-lg border border-dashed text-muted-foreground text-xs">
                                                                    <Image className="w-4 h-4 mr-1" />
                                                                    Tidak ada foto
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Signature */}
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-2">✍️ Tanda Tangan</p>
                                                            {poReceipt.signature_url ? (
                                                                <img
                                                                    src={poReceipt.signature_url}
                                                                    alt="Tanda tangan penerima"
                                                                    className="rounded-lg border bg-white p-2 max-h-40 w-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                                    onClick={() => setPhotoModalUrl(poReceipt.signature_url!)}
                                                                />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-24 bg-muted/30 rounded-lg border border-dashed text-muted-foreground text-xs">
                                                                    Tidak ada tanda tangan
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground py-2">Data penerimaan tidak ditemukan</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>
            </div>

            {/* Print Dialog */}
            <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Printer className="w-5 h-5" />
                            Cetak Purchase Order
                        </DialogTitle>
                    </DialogHeader>
                    {selectedPOLoading ? (
                        <div className="py-8 text-center text-muted-foreground">Memuat...</div>
                    ) : selectedPO ? (
                        <>
                            {/* Printable Content */}
                            <PrintPurchaseOrder
                                ref={printRef}
                                purchaseOrder={selectedPO}
                                companyName={storeSettings?.store_name}
                                companyAddress={storeSettings?.store_address}
                                companyPhone={storeSettings?.store_phone}
                                companyEmail={storeSettings?.store_email}
                            />

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                                    Batal
                                </Button>
                                <Button onClick={() => handlePrintAction()} className="gap-2">
                                    <Printer className="w-4 h-4" />
                                    Cetak
                                </Button>
                            </div>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

            {/* Cancel PO Confirmation Dialog */}
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Ban className="w-5 h-5" />
                            Batalkan Purchase Order
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <p className="text-muted-foreground">
                            Anda yakin ingin membatalkan PO <span className="font-semibold text-foreground">{poToCancel?.po_number}</span>?
                        </p>
                        <div className="space-y-2">
                            <Label>Alasan Pembatalan (opsional)</Label>
                            <Textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Masukkan alasan pembatalan..."
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                                Kembali
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmCancelPO}
                                disabled={cancelPO.isPending}
                            >
                                {cancelPO.isPending ? 'Membatalkan...' : 'Ya, Batalkan PO'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Photo/Signature Fullscreen Modal */}
            <Dialog open={!!photoModalUrl} onOpenChange={() => setPhotoModalUrl(null)}>
                <DialogContent className="max-w-3xl p-2">
                    <DialogHeader>
                        <DialogTitle>Bukti Penerimaan</DialogTitle>
                    </DialogHeader>
                    {photoModalUrl && (
                        <img
                            src={photoModalUrl}
                            alt="Bukti penerimaan fullsize"
                            className="w-full rounded-lg"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

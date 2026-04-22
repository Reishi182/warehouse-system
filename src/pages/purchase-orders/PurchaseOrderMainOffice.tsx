import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, FileText, Printer, Eye, Trash2, Package, Check, Ban, Calendar, Camera, User, CalendarCheck, AlertTriangle, Image, Pencil } from 'lucide-react';
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
import StatusBadge from '@/components/common/StatusBadge';
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
import { useDataStore } from '@/store/useDataStore';
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

    approved: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
    pending_receipt: { label: 'Menunggu Penerimaan', color: 'bg-purple-100 text-purple-700' },
    completed: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
    completed_with_discrepancy: { label: 'Selesai Ada Selisih', color: 'bg-orange-100 text-orange-700' },
    cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-700' },
};

export default function PurchaseOrderMainOffice() {
    const { user, profile } = useAuth();
    const products = useDataStore(s => s.products);
    const productsLoading = useDataStore(s => s.loading);
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
    const [itemBonusQty, setItemBonusQty] = useState(0);
    const [itemTotalPrice, setItemTotalPrice] = useState(0);
    const [selectedUnit, setSelectedUnit] = useState<string>('');

    const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

    // Auto-populate unit when a product is selected
    useEffect(() => {
        if (selectedProduct) {
            const defaultUnit = selectedProduct.has_multi_unit && selectedProduct.main_unit 
                ? selectedProduct.main_unit 
                : (selectedProduct.sell_unit || 'pcs');
            setSelectedUnit(defaultUnit);
        } else {
            setSelectedUnit('');
            setItemTotalPrice(0);
        }
    }, [selectedProduct]);

    // Update unit when unit changes manually
    const handleUnitChange = (unit: string) => {
        setSelectedUnit(unit);
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
        // unitPrice di sini sudah merupakan harga satuan (total/qty), jadi total = qty * unitPrice
        return items.reduce((acc, item) => acc + (item.isBonus ? 0 : (item.quantity * item.unitPrice)), 0);
    }, [items]);

    const handleAddItem = () => {
        // Harus ada Qty atau Bonus Qty
        if (itemQty <= 0 && itemBonusQty <= 0) return;

        const newItems: POItem[] = [];
        // Hitung harga satuan dari harga total / qty
        const computedUnitPrice = itemQty > 0 ? Math.round(itemTotalPrice / itemQty) : 0;

        if (isNewProductMode) {
            // New product mode - use free text input
            if (!newProductName.trim()) return;

            if (itemQty > 0) {
                newItems.push({
                    id: crypto.randomUUID(),
                    productId: '', // No product ID for new products
                    productName: newProductName.trim(),
                    barcode: newProductBarcode.trim() || undefined,
                    unit: newProductUnit || 'pcs',
                    quantity: itemQty,
                    unitPrice: computedUnitPrice,
                    isNewProduct: true,
                    isBonus: false,
                });
            }

            if (itemBonusQty > 0) {
                newItems.push({
                    id: crypto.randomUUID(),
                    productId: '',
                    productName: newProductName.trim(),
                    barcode: newProductBarcode.trim() || undefined,
                    unit: newProductUnit || 'pcs',
                    quantity: itemBonusQty,
                    unitPrice: 0,
                    isNewProduct: true,
                    isBonus: true,
                });
            }

            setItems([...items, ...newItems]);
            setNewProductName('');
            setNewProductBarcode('');
            setNewProductUnit('pcs');
        } else {
            // Existing product mode
            if (!selectedProductId) return;
            const product = products.find(p => p.id === selectedProductId);
            if (!product) return;

            if (itemQty > 0) {
                newItems.push({
                    id: crypto.randomUUID(),
                    productId: product.id,
                    productName: product.name,
                    unit: selectedUnit || product.sell_unit || 'pcs',
                    quantity: itemQty,
                    unitPrice: computedUnitPrice,
                    isNewProduct: false,
                    isBonus: false,
                });
            }

            if (itemBonusQty > 0) {
                newItems.push({
                    id: crypto.randomUUID(),
                    productId: product.id,
                    productName: product.name,
                    unit: selectedUnit || product.sell_unit || 'pcs',
                    quantity: itemBonusQty,
                    unitPrice: 0,
                    isNewProduct: false,
                    isBonus: true,
                });
            }

            setItems([...items, ...newItems]);
            setSelectedProductId('');
        }

        setItemQty(1);
        setItemBonusQty(0);
        setItemTotalPrice(0);
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
                    {['pending_receipt', 'rejected'].includes(item.status) && (
                        <Button size="sm" variant="outline" onClick={() => handleEditPO(item)}>
                            <Pencil className="w-4 h-4" />
                        </Button>
                    )}
                    {(item.status === 'pending_receipt' || item.status === 'completed') && (
                        <Button size="sm" variant="outline" onClick={() => handlePrint(item)}>
                            <Printer className="w-4 h-4" />
                        </Button>
                    )}
                    {['pending_receipt', 'approved'].includes(item.status) && (
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
                    <span className="hidden sm:inline">Buat PO</span>
                </Button>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Total PO"
                        value={purchaseOrders.length}
                        icon={<FileText className="w-5 h-5" />}
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
                    exportDateFilterAccessor="created_at"
                    exportFilename="laporan_purchase_order"
                    exportTitle="Laporan Purchase Order"
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
                                            <div className="flex gap-3 items-end flex-wrap sm:flex-nowrap mt-4">
                                                <div className="flex-1 min-w-[6rem] space-y-2">
                                                    <Label>Unit</Label>
                                                    <UnitSelector
                                                        value={newProductUnit}
                                                        onChange={setNewProductUnit}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="w-20 space-y-2">
                                                    <Label>Qty</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={itemQty}
                                                        onChange={(e) => setItemQty(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="w-24 space-y-2">
                                                    <Label>Qty Bonus</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={itemBonusQty}
                                                        onChange={(e) => setItemBonusQty(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-[9rem] space-y-2">
                                                    <Label>Harga Total</Label>
                                                    <Input isCurrency
                                                        type="number"
                                                        min={0}
                                                        value={itemTotalPrice}
                                                        onChange={(e) => setItemTotalPrice(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <Button onClick={handleAddItem} disabled={!newProductName.trim() || (itemQty === 0 && itemBonusQty === 0)}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                💡 Produk baru akan dibuat otomatis saat PO diterima.
                                            </p>
                                        </>
                                    ) : (
                                        /* Existing Product Mode - Dropdown with Search */
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Produk</Label>
                                                <ProductSearchSelect
                                                    products={products}
                                                    value={selectedProductId}
                                                    onChange={setSelectedProductId}
                                                    placeholder="Cari produk..."
                                                    excludeIds={items.map(i => i.productId || '')}
                                                />
                                            </div>
                                            <div className="flex gap-3 items-end flex-wrap sm:flex-nowrap">
                                                <div className="flex-1 min-w-[6rem] space-y-2">
                                                    <Label>Unit</Label>
                                                    <UnitSelector
                                                        product={products.find(p => p.id === selectedProductId)}
                                                        value={selectedUnit}
                                                        onChange={handleUnitChange}
                                                        disabled={!selectedProductId}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="w-20 space-y-2">
                                                    <Label>Qty</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={itemQty}
                                                        onChange={(e) => setItemQty(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="w-24 space-y-2">
                                                    <Label>Qty Bonus</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={itemBonusQty}
                                                        onChange={(e) => setItemBonusQty(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-[9rem] space-y-2">
                                                    <Label>Harga Total</Label>
                                                    <Input isCurrency
                                                        type="number"
                                                        min={0}
                                                        value={itemTotalPrice}
                                                        onChange={(e) => setItemTotalPrice(parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <Button onClick={handleAddItem} disabled={!selectedProductId || (itemQty === 0 && itemBonusQty === 0)}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
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

                                                    {/* Harga total — editable (locked if bonus) */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-xs text-muted-foreground">Total Rp</span>
                                                        <Input isCurrency
                                                            type="number"
                                                            min={0}
                                                            value={item.isBonus ? 0 : (item.quantity * item.unitPrice)}
                                                            disabled={item.isBonus}
                                                            onChange={(e) => {
                                                                const total = parseInt(e.target.value) || 0;
                                                                const qty = item.quantity || 1;
                                                                const newUnitPrice = Math.round(total / qty);
                                                                setItems(prev => prev.map(it =>
                                                                    it.id === item.id ? { ...it, unitPrice: newUnitPrice } : it
                                                                ));
                                                            }}
                                                            className="w-32 h-8 text-sm px-2"
                                                        />
                                                    </div>

                                                    {/* Harga satuan (info) */}
                                                    {!item.isBonus && item.unitPrice > 0 && (
                                                        <span className="text-xs text-muted-foreground shrink-0">
                                                            @Rp {item.unitPrice.toLocaleString('id-ID')}
                                                        </span>
                                                    )}
                                                    {item.isBonus && (
                                                        <span className="text-sm font-semibold text-green-600 dark:text-green-400 shrink-0">BONUS</span>
                                                    )}

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
                                                <div className="flex justify-between mt-2 pt-2 border-t">
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
                    <DialogContent className="max-w-4xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                        {selectedPOLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center space-y-4">
                                <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                                <p className="text-muted-foreground animate-pulse">Memuat detail Purchase Order...</p>
                            </div>
                        ) : selectedPO ? (
                            <div className="flex flex-col h-full max-h-[90vh]">
                                {/* Premium Gradient Header */}
                                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white relative shrink-0">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                        <FileText className="w-32 h-32" />
                                    </div>
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                                Detail Purchase Order
                                            </h2>
                                            <p className="text-indigo-100 flex items-center gap-1.5 mt-1 font-mono text-sm">
                                                {selectedPO.po_number}
                                            </p>
                                        </div>
                                        <StatusBadge status={selectedPO.status} className="bg-white/20 text-white border-white/30 backdrop-blur-md shadow-sm" showIcon />
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <Package className="w-3.5 h-3.5 text-indigo-500" /> Supplier
                                            </p>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedPO.supplier?.name || '-'}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <Eye className="w-3.5 h-3.5 text-indigo-500" /> Tujuan
                                            </p>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{selectedPO.destination}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Tanggal PO
                                            </p>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                {format(new Date(selectedPO.created_at), 'dd MMM yyyy', { locale: localeId })}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-indigo-500" /> Dibuat Oleh
                                            </p>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedPO.created_by_name || '-'}</p>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                            <Package className="w-4 h-4 text-indigo-500" />
                                            Daftar Barang Pesanan
                                        </h3>
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50/80 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700">Produk</th>
                                                        <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700 text-center">Qty</th>
                                                        <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700 text-right">Harga Satuan</th>
                                                        <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {selectedPO.items?.map(item => {
                                                        const isBonus = (item as any).is_bonus === true;
                                                        const isFree = !isBonus && item.unit_price === 0;
                                                        return (
                                                            <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${isBonus ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.product_name}</span>
                                                                        {isBonus && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full font-bold uppercase tracking-wider">Bonus</span>
                                                                        )}
                                                                        {isFree && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full font-bold uppercase tracking-wider">Gratis</span>
                                                                        )}
                                                                        {(item as any).is_new_product && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold uppercase tracking-wider">Baru</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className="inline-flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold px-2.5 py-1 rounded-lg min-w-[3rem]">
                                                                        {item.quantity}
                                                                    </span>
                                                                    <span className="ml-1.5 text-xs text-gray-500 uppercase">{item.unit || 'pcs'}</span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                                                    {isBonus ? <span className="text-green-600 dark:text-green-400 text-xs font-medium italic">Gratis</span> : `Rp ${item.unit_price.toLocaleString('id-ID')}`}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                                                                    {isBonus ? <span className="text-green-600 dark:text-green-400 text-xs">-</span> : `Rp ${item.total_price.toLocaleString('id-ID')}`}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot className="bg-indigo-50/50 dark:bg-indigo-900/10">
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-4 text-right font-bold text-gray-700 dark:text-gray-300">Total Pembelian</td>
                                                        <td className="px-4 py-4 text-right font-black text-lg text-indigo-700 dark:text-indigo-400">Rp {selectedPO.total_amount.toLocaleString('id-ID')}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Notes & Rejections */}
                                    {selectedPO.notes && (
                                        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 p-4 shadow-sm">
                                            <h3 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <FileText className="w-4 h-4" /> Catatan Purchase Order
                                            </h3>
                                            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{selectedPO.notes}</p>
                                        </div>
                                    )}

                                    {selectedPO.rejected_reason && (
                                        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 p-4 shadow-sm">
                                            <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <Ban className="w-4 h-4" /> Alasan Penolakan
                                            </h3>
                                            <p className="text-sm font-medium text-red-800 dark:text-red-300">{selectedPO.rejected_reason}</p>
                                        </div>
                                    )}

                                    {/* ===== RECEIPT INFO SECTION ===== */}
                                    {(selectedPO.status === 'completed' || selectedPO.status === 'completed_with_discrepancy') && (
                                        <div className="mt-8">
                                            <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                                                <Check className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/50 rounded-full p-0.5" />
                                                Informasi Penerimaan Barang
                                            </h3>
                                            
                                            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-emerald-100 dark:border-emerald-900/30 shadow-sm p-5 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                                    <Check className="w-32 h-32 text-emerald-500" />
                                                </div>
                                                
                                                {receiptLoading ? (
                                                    <div className="py-8 text-center text-emerald-600 dark:text-emerald-400 text-sm flex flex-col items-center justify-center">
                                                        <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-2"></div>
                                                        Memuat data penerimaan...
                                                    </div>
                                                ) : poReceipt ? (
                                                    <div className="space-y-6 relative z-10">
                                                        {/* Receiver info grid */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="flex items-center gap-3 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30">
                                                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                                                    <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">Diterima Oleh</p>
                                                                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">{poReceipt.received_by_name || '-'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30">
                                                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                                                    <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">Tanggal Penerimaan</p>
                                                                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                                                                        {poReceipt.received_at
                                                                            ? format(new Date(poReceipt.received_at), 'dd MMM yyyy, HH:mm', { locale: localeId })
                                                                            : format(new Date(poReceipt.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Discrepancy details */}
                                                        {poReceipt.has_discrepancy && (
                                                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl shadow-inner">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-full shrink-0">
                                                                        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="font-bold text-orange-800 dark:text-orange-200 mb-2">Peringatan: Terdapat Selisih Penerimaan</p>
                                                                        <div className="grid grid-cols-3 gap-3">
                                                                            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-2 text-center border border-orange-100 dark:border-orange-800">
                                                                                <p className="text-[10px] uppercase font-bold text-orange-600/80 dark:text-orange-400/80 mb-0.5">Dipesan</p>
                                                                                <p className="font-bold text-orange-900 dark:text-orange-100">{poReceipt.total_ordered} unit</p>
                                                                            </div>
                                                                            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-2 text-center border border-orange-100 dark:border-orange-800">
                                                                                <p className="text-[10px] uppercase font-bold text-orange-600/80 dark:text-orange-400/80 mb-0.5">Diterima</p>
                                                                                <p className="font-bold text-orange-900 dark:text-orange-100">{poReceipt.total_received} unit</p>
                                                                            </div>
                                                                            {(poReceipt.total_damaged ?? 0) > 0 && (
                                                                                <div className="bg-red-50/80 dark:bg-red-900/40 rounded-lg p-2 text-center border border-red-200 dark:border-red-800">
                                                                                    <p className="text-[10px] uppercase font-bold text-red-600/80 dark:text-red-400/80 mb-0.5">Rusak</p>
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
                                                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30">
                                                                <p className="text-xs font-bold text-emerald-700/70 dark:text-emerald-400/70 uppercase tracking-wider mb-2">Catatan Penerimaan</p>
                                                                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{poReceipt.notes}</p>
                                                            </div>
                                                        )}

                                                        {/* Photo & Signature Evidence */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {/* Photo evidence */}
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                                                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                                    <Camera className="w-4 h-4 text-indigo-500" /> Foto Bukti Penerimaan
                                                                </p>
                                                                {poReceipt.photo_url ? (
                                                                    <div className="relative group rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                                                                        <img
                                                                            src={poReceipt.photo_url}
                                                                            alt="Bukti penerimaan"
                                                                            className="w-full h-40 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                                                            onClick={() => setPhotoModalUrl(poReceipt.photo_url!)}
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                                            <Eye className="w-8 h-8 text-white" />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center justify-center h-40 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                                                                        <Camera className="w-8 h-8 mb-2 opacity-50" />
                                                                        <span className="text-xs font-medium">Tidak ada foto bukti</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Signature */}
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                                                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                                    ✍️ Tanda Tangan Penerima
                                                                </p>
                                                                {poReceipt.signature_url ? (
                                                                    <div className="relative group rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-white">
                                                                        <img
                                                                            src={poReceipt.signature_url}
                                                                            alt="Tanda tangan penerima"
                                                                            className="w-full h-40 object-contain p-4 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                                                            onClick={() => setPhotoModalUrl(poReceipt.signature_url!)}
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                                            <Eye className="w-8 h-8 text-white" />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center justify-center h-40 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                                                                        <span className="text-2xl mb-2 opacity-50">✍️</span>
                                                                        <span className="text-xs font-medium">Tidak ada tanda tangan</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="py-8 text-center bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                                        <Package className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                                                        <p className="text-emerald-700 dark:text-emerald-400 font-medium">Data penerimaan tidak tersedia</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end shrink-0">
                                    <Button variant="outline" className="rounded-xl px-6" onClick={() => setIsViewOpen(false)}>
                                        Tutup Detail
                                    </Button>
                                </div>
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

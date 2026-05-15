import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, FileText, Printer, Eye, Trash2, Package, Check, Ban, Calendar, Camera, User, CalendarCheck, AlertTriangle, Image, Pencil, DollarSign, MapPin } from 'lucide-react';
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
import { AppModal } from '@/components/ui/app-modal';
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
    useCancelCompletedPurchaseOrder,
    usePOReceipt,
    useUpdatePOPrices,
    UpdatePOPricesInput,
    useUpdatePODestination,
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
    const cancelCompletedPO = useCancelCompletedPurchaseOrder();
    const updatePOPrices = useUpdatePOPrices();
    const updatePODestination = useUpdatePODestination();

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

    // ── State untuk dialog pindah lokasi PO completed ──
    const [isMoveDestionationOpen, setIsMoveDestinationOpen] = useState(false);
    const [moveDestPO, setMoveDestPO] = useState<PurchaseOrder | null>(null);
    const [newDestination, setNewDestination] = useState<'gudang' | 'toko'>('gudang');

    const handleOpenMoveDestination = (po: PurchaseOrder) => {
        setMoveDestPO(po);
        // default ke lokasi lawan dari yang sekarang
        setNewDestination(po.destination === 'gudang' ? 'toko' : 'gudang');
        setIsMoveDestinationOpen(true);
    };

    const handleConfirmMoveDestination = async () => {
        if (!moveDestPO) return;
        await updatePODestination.mutateAsync({
            poId: moveDestPO.id,
            newDestination,
            updatedBy: user?.id || '',
            updatedByName: profile?.name || '',
        });
        setIsMoveDestinationOpen(false);
        setMoveDestPO(null);
    };

    // ── State untuk dialog edit harga & stok PO completed ──
    const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
    const [editPricePO, setEditPricePO] = useState<PurchaseOrder | null>(null);
    interface EditPriceItem {
        itemId: string;
        productId: string;
        productName: string;
        quantity: number;
        originalQuantity: number;  // qty saat pertama kali dialog dibuka
        unitPrice: number;
        isBonus: boolean;
        unit: string;
    }
    const [editPriceItems, setEditPriceItems] = useState<EditPriceItem[]>([]);
    const [editDiscount1, setEditDiscount1] = useState(0);
    const [editDiscount2, setEditDiscount2] = useState(0);

    const handleOpenEditPrice = async (po: PurchaseOrder) => {
        setEditPricePO(po);
        setEditDiscount1(po.discount_1_percent ?? 0);
        setEditDiscount2(po.discount_2_percent ?? 0);
        try {
            const { data: poItems } = await supabase
                .from('purchase_order_items')
                .select('*')
                .eq('purchase_order_id', po.id);
            if (poItems) {
                setEditPriceItems(poItems.map((it: any) => ({
                    itemId: it.id,
                    productId: it.product_id || '',
                    productName: it.product_name,
                    quantity: it.quantity,
                    originalQuantity: it.quantity,  // simpan qty asli
                    unitPrice: it.unit_price ?? 0,
                    isBonus: it.is_bonus ?? false,
                    unit: it.unit || 'pcs',
                })));
            }
        } catch (err) {
            console.error('Gagal memuat item PO:', err);
        }
        setIsEditPriceOpen(true);
    };

    const handleSaveEditPrice = async () => {
        if (!editPricePO) return;
        const payload: UpdatePOPricesInput = {
            poId: editPricePO.id,
            discount1Percent: editDiscount1,
            discount2Percent: editDiscount2,
            updatedBy: user?.id || '',
            updatedByName: profile?.name || '',
            items: editPriceItems.map(it => ({
                itemId: it.itemId,
                unitPrice: it.unitPrice,
                quantity: it.quantity,
                originalQuantity: it.originalQuantity,
                isBonus: it.isBonus,
                productId: it.productId,
                unit: it.unit,
            })),
        };
        await updatePOPrices.mutateAsync(payload);
        setIsEditPriceOpen(false);
        setEditPricePO(null);
        setEditPriceItems([]);
    };

    const editPriceTotal = useMemo(() => {
        let total = editPriceItems.reduce((s, it) => s + (it.isBonus ? 0 : it.unitPrice * it.quantity), 0);
        if (editDiscount1) total = total - total * (editDiscount1 / 100);
        if (editDiscount2) total = total - total * (editDiscount2 / 100);
        return total;
    }, [editPriceItems, editDiscount1, editDiscount2]);

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

    const isCompletedCancel = poToCancel && ['completed', 'completed_with_discrepancy'].includes(poToCancel.status);

    const confirmCancelPO = async () => {
        if (!poToCancel) return;

        if (isCompletedCancel) {
            // PO sudah selesai → gunakan hook khusus yang rollback stok
            if (!cancelReason.trim()) return; // alasan wajib untuk completed
            await cancelCompletedPO.mutateAsync({
                poId: poToCancel.id,
                cancelledBy: user?.id || '',
                cancelledByName: profile?.name || '',
                reason: cancelReason,
            });
        } else {
            // PO belum selesai → cancel biasa
            await cancelPO.mutateAsync({
                poId: poToCancel.id,
                cancelledBy: user?.id || '',
                cancelledByName: profile?.name || '',
                reason: cancelReason || undefined,
            });
        }

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
                    {['completed', 'completed_with_discrepancy'].includes(item.status) && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditPrice(item)}
                            title="Koreksi Harga & Stok"
                            className="text-amber-600 hover:text-amber-700 border-amber-300 hover:border-amber-400"
                        >
                            <DollarSign className="w-4 h-4" />
                        </Button>
                    )}
                    {['completed', 'completed_with_discrepancy'].includes(item.status) && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenMoveDestination(item)}
                            title="Pindah Lokasi Tujuan"
                            className="text-indigo-600 hover:text-indigo-700 border-indigo-300 hover:border-indigo-400"
                        >
                            <MapPin className="w-4 h-4" />
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
                    {['completed', 'completed_with_discrepancy'].includes(item.status) && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelPO(item)}
                            className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 hover:bg-red-50"
                            title="Batalkan PO Selesai (Rollback Stok)"
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
                    globalFilterFn={(item: PurchaseOrder, filterValue: string) => {
                        const search = filterValue.toLowerCase();
                        const status = statusLabels[item.status]?.label || item.status;
                        return (
                            item.po_number?.toLowerCase().includes(search) ||
                            item.supplier?.name?.toLowerCase().includes(search) ||
                            item.destination?.toLowerCase().includes(search) ||
                            status.toLowerCase().includes(search) ||
                            item.total_amount?.toString().includes(search) ||
                            item.notes?.toLowerCase().includes(search) || false
                        );
                    }}
                />

                {/* Create/Edit PO Dialog */}
                <AppModal 
                    open={isCreateOpen} 
                    onClose={() => {
                        setEditPOId(null);
                        setIsCreateOpen(false);
                    }}
                    hideHeader
                    noPadding
                    size="3xl"
                >
                    <div className="max-h-[90vh] overflow-y-auto rounded-2xl">
                        {/* Premium Gradient Header */}
                        <div className={`relative p-6 text-white overflow-hidden ${editPOId ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-600 to-violet-600'}`}>
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
                                <div className="absolute -bottom-12 -left-8 w-52 h-52 rounded-full bg-white" />
                            </div>
                            <div className="relative z-10 flex items-center gap-3">
                                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{editPOId ? 'Edit Purchase Order' : 'Buat Purchase Order Baru'}</h2>
                                    <p className="text-white/70 text-sm mt-0.5">{editPOId ? 'Perbarui detail pesanan pembelian' : 'Buat pesanan pembelian ke supplier'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4 bg-gray-50/60 dark:bg-slate-900/60 rounded-b-2xl">
                            {/* Section 1: Info Pemesanan */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Informasi Pemesanan</span>
                                </div>
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />Supplier *
                                        </label>
                                        <SearchableSelect
                                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                            value={supplierId}
                                            onValueChange={setSupplierId}
                                            placeholder="Pilih supplier..."
                                            searchPlaceholder="Cari supplier..."
                                            emptyMessage="Supplier tidak ditemukan."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />Tujuan Pengiriman *
                                        </label>
                                        <Select value={destination} onValueChange={(v) => setDestination(v as PODestination)}>
                                            <SelectTrigger className="h-11 rounded-xl bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gudang">ðŸ“¦ Gudang</SelectItem>
                                                <SelectItem value="toko">ðŸª Toko</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />Tanggal PO *
                                        </label>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <DateInput value={poDate} onChange={setPODate} className="max-w-xs" />
                                            <p className="text-xs text-muted-foreground">Format nomor: <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">PO-DDMMYYYY-XXXX</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Tambah Item */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
                                        <span className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">Tambah Item</span>
                                    </div>
                                    <button
                                        id="new-product-toggle"
                                        type="button"
                                        onClick={() => setIsNewProductMode(!isNewProductMode)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${isNewProductMode
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 ring-1 ring-amber-300'
                                            : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 hover:bg-gray-200'
                                        }`}
                                    >
                                        <span className={`w-3 h-3 rounded-full transition-colors ${isNewProductMode ? 'bg-amber-500' : 'bg-gray-300'}`} />
                                        {isNewProductMode ? 'âœ¨ Produk Baru (aktif)' : 'Produk Baru?'}
                                    </button>
                                </div>
                                <div className="p-4 space-y-4">
                                    {isNewProductMode ? (
                                        <>
                                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                                                <span className="text-amber-700 dark:text-amber-400 text-xs font-semibold">ðŸ’¡ Produk baru akan dibuat otomatis saat PO diterima gudang</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama Produk *</label>
                                                    <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)}
                                                        placeholder="Nama produk baru..." className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Barcode / SKU</label>
                                                    <Input value={newProductBarcode} onChange={(e) => setNewProductBarcode(e.target.value)}
                                                        placeholder="Opsional..." className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                                                <div className="sm:col-span-2 space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</label>
                                                    <UnitSelector value={newProductUnit} onChange={setNewProductUnit} className="h-10 rounded-xl" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</label>
                                                    <Input type="number" min={0} step="any" value={itemQty}
                                                        onChange={(e) => setItemQty(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 text-center font-bold" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-green-600 uppercase tracking-wide">Qty Bonus</label>
                                                    <Input type="number" min={0} step="any" value={itemBonusQty}
                                                        onChange={(e) => setItemBonusQty(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-center text-green-700 font-bold" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Harga Total (Rp)</label>
                                                    <Input isCurrency type="number" min={0} value={itemTotalPrice}
                                                        onChange={(e) => setItemTotalPrice(parseInt(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 font-semibold" />
                                                </div>
                                            </div>
                                            <Button onClick={handleAddItem}
                                                disabled={!newProductName.trim() || (itemQty === 0 && itemBonusQty === 0)}
                                                className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold gap-2">
                                                <Plus className="w-4 h-4" /> Tambah ke Daftar
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cari Produk</label>
                                                <ProductSearchSelect
                                                    products={products}
                                                    value={selectedProductId}
                                                    onChange={setSelectedProductId}
                                                    placeholder="Ketik nama produk..."
                                                    excludeIds={items.map(i => i.productId || '')}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                                                <div className="sm:col-span-2 space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</label>
                                                    <UnitSelector
                                                        product={products.find(p => p.id === selectedProductId)}
                                                        value={selectedUnit}
                                                        onChange={handleUnitChange}
                                                        disabled={!selectedProductId}
                                                        className="h-10 rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</label>
                                                    <Input type="number" min={0} step="any" value={itemQty}
                                                        onChange={(e) => setItemQty(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 text-center font-bold" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-green-600 uppercase tracking-wide">Qty Bonus</label>
                                                    <Input type="number" min={0} step="any" value={itemBonusQty}
                                                        onChange={(e) => setItemBonusQty(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-center text-green-700 font-bold" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Harga Total (Rp)</label>
                                                    <Input isCurrency type="number" min={0} value={itemTotalPrice}
                                                        onChange={(e) => setItemTotalPrice(parseInt(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 font-semibold" />
                                                </div>
                                            </div>
                                            <Button onClick={handleAddItem}
                                                disabled={!selectedProductId || (itemQty === 0 && itemBonusQty === 0)}
                                                className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold gap-2">
                                                <Plus className="w-4 h-4" /> Tambah ke Daftar
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Items List */}
                            {items.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Daftar Item PO</span>
                                            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                                        </div>
                                        {editPOId && <span className="text-xs text-muted-foreground italic">edit qty/harga langsung</span>}
                                    </div>
                                    <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                        {items.map((item, idx) => (
                                            <div key={item.id} className={`flex items-center gap-2 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-slate-700/20 transition-colors ${item.isBonus ? 'bg-green-50/40 dark:bg-green-900/5' : ''}`}>
                                                <span className="text-xs font-bold text-gray-300 w-5 shrink-0 text-center">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{item.productName}</p>
                                                        {item.isNewProduct && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold shrink-0">BARU</span>}
                                                        {item.isBonus && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full font-bold shrink-0">ðŸŽ BONUS</span>}
                                                        {!item.isBonus && item.unitPrice === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold shrink-0">GRATIS</span>}
                                                    </div>
                                                    {item.barcode && <p className="text-[10px] text-muted-foreground font-mono">{item.barcode}</p>}
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded shrink-0">{item.unit || 'pcs'}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="text-[10px] text-gray-400 font-medium">QTY</span>
                                                    <Input type="number" min={0.001} step="any" value={item.quantity}
                                                        onChange={(e) => {
                                                            const qty = parseFloat(e.target.value) || 0.001;
                                                            setItems(prev => prev.map(it => it.id === item.id ? { ...it, quantity: qty } : it));
                                                        }}
                                                        className="w-16 h-8 text-center text-sm px-1 rounded-lg font-bold bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300" />
                                                </div>
                                                {item.isBonus ? (
                                                    <span className="w-28 h-8 flex items-center justify-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg shrink-0">ðŸŽ Gratis</span>
                                                ) : (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-[10px] text-gray-400 font-medium">Rp</span>
                                                        <Input isCurrency type="number" min={0}
                                                            value={item.quantity * item.unitPrice}
                                                            onChange={(e) => {
                                                                const total = parseFloat(e.target.value) || 0;
                                                                const newUnitPrice = Math.round(total / (item.quantity || 1));
                                                                setItems(prev => prev.map(it => it.id === item.id ? { ...it, unitPrice: newUnitPrice } : it));
                                                            }}
                                                            className="w-28 h-8 text-sm px-2 rounded-lg font-semibold bg-gray-50 dark:bg-slate-700" />
                                                    </div>
                                                )}
                                                {!item.isBonus && item.unitPrice > 0 && (
                                                    <span className="text-[10px] text-gray-400 shrink-0 hidden sm:block">@Rp {item.unitPrice.toLocaleString('id-ID')}</span>
                                                )}
                                                <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.id)}
                                                    className="shrink-0 h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors rounded-lg ml-1">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-t border-gray-100 dark:border-slate-700 space-y-1">
                                        {items.some(i => i.isBonus) && (
                                            <div className="flex justify-between text-xs text-green-600 dark:text-green-400 font-medium">
                                                <span>ðŸŽ Bonus â€” {items.filter(i => i.isBonus).reduce((a, i) => a + i.quantity, 0)} item (tidak dihitung)</span>
                                                <span>Gratis</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-gray-700 dark:text-gray-200">Total Pembelian</span>
                                            <span className="font-black text-xl text-indigo-700 dark:text-indigo-400">Rp {totalAmount.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section 4: Notes */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-gray-300 rounded-full" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan (opsional)</span>
                                </div>
                                <div className="p-4">
                                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Tambahkan catatan untuk supplier atau tim gudang..."
                                        rows={3} className="rounded-xl bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 resize-none" />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex gap-3 justify-end pt-1 pb-1">
                                <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditPOId(null); }}
                                    className="rounded-xl px-6 border-gray-200 hover:bg-gray-100 font-semibold">
                                    Batal
                                </Button>
                                <Button onClick={handleCreatePO}
                                    disabled={!supplierId || items.length === 0 || createPO.isPending || updatePO.isPending}
                                    className={`rounded-xl px-8 font-bold gap-2 text-white shadow-lg ${editPOId ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'}`}>
                                    {createPO.isPending || updatePO.isPending ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Menyimpan...</>
                                    ) : editPOId ? (
                                        <><Check className="w-4 h-4" /> Simpan Perubahan</>
                                    ) : (
                                        <><Plus className="w-4 h-4" /> Buat Purchase Order</>
                                    )}
                                </Button>
                            </div>
                            </div>
                        </div>
                </AppModal>
                {/* View PO Dialog */}
                <AppModal 
                    open={isViewOpen} 
                    onClose={() => setIsViewOpen(false)}
                    hideHeader
                    noPadding
                    size="3xl"
                >
                    <div className="max-h-[90vh]">
                        {selectedPOLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center space-y-4">
                                <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                                <p className="text-muted-foreground animate-pulse">Memuat detail Purchase Order...</p>
                            </div>
                        ) : selectedPO ? (
                            <div className="flex flex-col h-full">
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
                    </div>
                </AppModal>
            </div>

            {/* Print Dialog */}
            <AppModal 
                open={isPrintDialogOpen} 
                onClose={() => setIsPrintDialogOpen(false)}
                title={<div className="flex items-center gap-2"><Printer className="w-5 h-5" /> Cetak Purchase Order</div>}
                size="2xl"
            >
                <div className="max-h-[80vh] overflow-y-auto">
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
                </div>
            </AppModal>

            {/* Cancel PO Confirmation Dialog */}
            <AppModal 
                open={isCancelDialogOpen} 
                onClose={() => setIsCancelDialogOpen(false)}
                title={
                    <div className="flex items-center gap-2 text-destructive">
                        <Ban className="w-5 h-5" />
                        {isCompletedCancel ? 'Batalkan PO yang Sudah Selesai' : 'Batalkan Purchase Order'}
                    </div>
                }
            >
                <div className="space-y-4 mt-2">
                        {/* Warning khusus untuk PO completed */}
                        {isCompletedCancel && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-3 space-y-2">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-red-800 dark:text-red-200">⚠️ Peringatan: Operasi Berbahaya</p>
                                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                            PO ini sudah <strong>selesai</strong> dan stok sudah ditambahkan ke sistem.
                                            Membatalkan PO ini akan:
                                        </p>
                                        <ul className="text-sm text-red-700 dark:text-red-300 mt-1 space-y-0.5 list-disc list-inside">
                                            <li><strong>Mengurangi stok</strong> semua produk yang sudah diterima</li>
                                            <li>Mencatat perubahan stok di <strong>log stok</strong></li>
                                            <li>Mengubah status PO menjadi <strong>Dibatalkan</strong></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-muted-foreground">
                            Anda yakin ingin membatalkan PO <span className="font-semibold text-foreground">{poToCancel?.po_number}</span>?
                        </p>

                        {/* Info PO */}
                        {poToCancel && (
                            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                                <p><span className="text-muted-foreground">Supplier:</span> <span className="font-medium">{poToCancel.supplier?.name || '-'}</span></p>
                                <p><span className="text-muted-foreground">Total:</span> <span className="font-medium">Rp {poToCancel.total_amount.toLocaleString('id-ID')}</span></p>
                                <p><span className="text-muted-foreground">Tujuan:</span> <span className="font-medium capitalize">{poToCancel.destination}</span></p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>
                                Alasan Pembatalan {isCompletedCancel ? <span className="text-red-500">* (wajib)</span> : '(opsional)'}
                            </Label>
                            <Textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder={isCompletedCancel
                                    ? 'Jelaskan alasan pembatalan PO yang sudah selesai ini...'
                                    : 'Masukkan alasan pembatalan...'
                                }
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
                                disabled={
                                    cancelPO.isPending ||
                                    cancelCompletedPO.isPending ||
                                    (isCompletedCancel && !cancelReason.trim())
                                }
                            >
                                {(cancelPO.isPending || cancelCompletedPO.isPending)
                                    ? 'Membatalkan...'
                                    : isCompletedCancel
                                        ? 'Ya, Batalkan & Rollback Stok'
                                        : 'Ya, Batalkan PO'
                                }
                            </Button>
                        </div>
                    </div>
            </AppModal>
            {/* Photo/Signature Fullscreen Modal */}
            <AppModal 
                open={!!photoModalUrl} 
                onClose={() => setPhotoModalUrl(null)}
                title="Bukti Penerimaan"
                size="3xl"
            >
                    {photoModalUrl && (
                        <img
                            src={photoModalUrl}
                            alt="Bukti penerimaan fullsize"
                            className="w-full rounded-lg"
                        />
                    )}
                </AppModal>
            {/* Edit Price/Stock PO Dialog */}
            <AppModal 
                open={isEditPriceOpen} 
                onClose={() => setIsEditPriceOpen(false)}
                title={
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-amber-500" />
                        Koreksi Harga & Stok PO Selesai
                    </div>
                }
                size="4xl"
            >
                <div className="space-y-4 max-h-[80vh] overflow-y-auto mt-2">
                        {/* Info banner */}
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 space-y-1">
                            <p><strong>Koreksi Harga:</strong> Hanya mengubah nilai PO, stok tidak terpengaruh.</p>
                            <p><strong>Koreksi Qty:</strong> Jika qty diubah, stok gudang/toko akan disesuaikan otomatis dan tercatat di log stok.</p>
                        </div>

                        {/* Item rows */}
                        <div className="space-y-2 mt-4">
                            {editPriceItems.map((item) => {
                                const qtyChanged = item.quantity !== item.originalQuantity;
                                const qtyDelta = item.quantity - item.originalQuantity;
                                return (
                                    <div
                                        key={item.itemId}
                                        className={`flex items-center gap-3 p-3 rounded-lg border ${qtyChanged
                                                ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700'
                                                : 'bg-slate-50 dark:bg-slate-800 border-transparent'
                                            }`}
                                    >
                                        {/* Nama produk */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{item.productName}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {item.isBonus && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">🎁 BONUS</span>
                                                )}
                                                {qtyChanged && (
                                                    <span className={`text-xs font-semibold ${qtyDelta > 0 ? 'text-blue-600' : 'text-red-600'
                                                        }`}>
                                                        {qtyDelta > 0 ? `+${qtyDelta}` : qtyDelta} stok ({qtyDelta > 0 ? 'tambah' : 'kurang'})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Qty */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Label className="text-xs text-muted-foreground">Qty</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="any"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newQty = parseFloat(e.target.value) || 0;
                                                    setEditPriceItems(prev => prev.map(it =>
                                                        it.itemId === item.itemId ? { ...it, quantity: newQty } : it
                                                    ));
                                                }}
                                                className="w-20 text-center"
                                                title={`Qty asli: ${item.originalQuantity} ${item.unit}`}
                                            />
                                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                                        </div>

                                        {item.isBonus ? (
                                            <div className="text-sm font-semibold text-green-600 px-4">BONUS</div>
                                        ) : (
                                            <>
                                                {/* Harga satuan */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Label className="text-xs w-12 text-right">Satuan</Label>
                                                    <Input
                                                        isCurrency
                                                        value={item.unitPrice}
                                                        onChange={(e) => {
                                                            const newPrice = parseInt(e.target.value) || 0;
                                                            setEditPriceItems(prev => prev.map(it =>
                                                                it.itemId === item.itemId ? { ...it, unitPrice: newPrice } : it
                                                            ));
                                                        }}
                                                        className="w-32"
                                                    />
                                                </div>
                                                {/* Harga total */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Label className="text-xs w-10 text-right">Total</Label>
                                                    <Input
                                                        isCurrency
                                                        value={item.unitPrice * item.quantity}
                                                        onChange={(e) => {
                                                            const newTotal = parseInt(e.target.value) || 0;
                                                            const newPrice = item.quantity > 0 ? Math.round(newTotal / item.quantity) : 0;
                                                            setEditPriceItems(prev => prev.map(it =>
                                                                it.itemId === item.itemId ? { ...it, unitPrice: newPrice } : it
                                                            ));
                                                        }}
                                                        className="w-32 font-semibold"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total */}
                        <div className="flex justify-end gap-4 border-t pt-4">
                            <div className="flex flex-col items-end">
                                <span className="text-sm text-muted-foreground">Total Keseluruhan</span>
                                <span className="text-lg font-bold">Rp {editPriceTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {/* Stock change summary */}
                        {editPriceItems.some(it => it.quantity !== it.originalQuantity) && (
                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm">
                                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">⚠️ Perubahan Stok yang akan diterapkan:</p>
                                <ul className="space-y-0.5">
                                    {editPriceItems.filter(it => it.quantity !== it.originalQuantity).map(it => {
                                        const delta = it.quantity - it.originalQuantity;
                                        return (
                                            <li key={it.itemId} className="text-blue-700 dark:text-blue-300">
                                                • {it.productName}: {it.originalQuantity} → {it.quantity} {it.unit}
                                                <span className={`ml-1 font-semibold ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    ({delta > 0 ? '+' : ''}{delta})
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setIsEditPriceOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleSaveEditPrice}
                                disabled={updatePOPrices.isPending}
                            >
                                {updatePOPrices.isPending ? 'Menyimpan...' : 'Simpan Koreksi'}
                            </Button>
                        </div>
                    </div>
            </AppModal>

            {/* Pindah Lokasi Tujuan PO Dialog */}
            <AppModal 
                open={isMoveDestionationOpen} 
                onClose={() => setIsMoveDestinationOpen(false)}
                title={
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-500" />
                        Pindah Lokasi Tujuan PO
                    </div>
                }
            >
                <div className="space-y-4 mt-2">
                        {/* Warning */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-800 dark:text-indigo-300 space-y-1">
                            <p>
                                <strong>PO:</strong> {moveDestPO?.po_number}
                            </p>
                            <p>
                                <strong>Lokasi saat ini:</strong>{' '}
                                <span className="capitalize font-semibold">{moveDestPO?.destination}</span>
                            </p>
                            <p className="pt-1 text-indigo-700 dark:text-indigo-400">
                                ⚠️ Seluruh stok item PO ini akan <strong>dipindah otomatis</strong> ke lokasi baru dan tercatat di log stok.
                            </p>
                        </div>

                        {/* Pilih lokasi baru */}
                        <div className="space-y-2">
                            <Label>Lokasi Tujuan Baru</Label>
                            <Select
                                value={newDestination}
                                onValueChange={(v) => setNewDestination(v as 'gudang' | 'toko')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gudang" disabled={moveDestPO?.destination === 'gudang'}>
                                        Gudang {moveDestPO?.destination === 'gudang' ? '(saat ini)' : ''}
                                    </SelectItem>
                                    <SelectItem value="toko" disabled={moveDestPO?.destination === 'toko'}>
                                        Toko {moveDestPO?.destination === 'toko' ? '(saat ini)' : ''}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Ringkasan perubahan */}
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border text-sm">
                            <span className="font-semibold capitalize">{moveDestPO?.destination}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold text-indigo-600 capitalize">{newDestination}</span>
                            <span className="text-xs text-muted-foreground ml-auto">semua item PO</span>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setIsMoveDestinationOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleConfirmMoveDestination}
                                disabled={updatePODestination.isPending || newDestination === moveDestPO?.destination}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {updatePODestination.isPending ? 'Memindahkan...' : 'Ya, Pindahkan Stok'}
                            </Button>
                        </div>
                </div>
            </AppModal>
        </MainLayout>
    );
}

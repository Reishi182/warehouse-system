import { useState, useRef } from 'react';
import { Package, Check, Eye, AlertTriangle, FileText, Calendar, ClipboardCheck, TrendingUp, Boxes, ChevronRight, ShieldCheck, X, Hash, Minus, Plus, Building2, Store } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import SignaturePad, { SignaturePadRef } from '@/components/common/SignaturePad';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AppModal } from '@/components/ui/app-modal';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { usePendingReceiptPOs, usePurchaseOrder, useConfirmPOReceipt } from '@/hooks/usePurchaseOrders';
import { PurchaseOrder } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { compressImageToFile } from '@/lib/imageCompression';

interface ReceivedItemState {
    itemId: string;
    productId: string;
    productName: string;
    orderedQty: number;
    receivedQty: number;
    damagedQty: number;
    barcode?: string;
    unit?: string;
    unitPrice?: number;
    isNewProduct?: boolean;
}

export default function PurchaseOrderReceipt() {
    const { user, profile } = useAuth();
    const role = useRole();

    const destination = role === 'admin' ? 'all' : (role === 'warehouse' ? 'gudang' : 'toko');
    const roleLabel = role === 'admin' ? 'Admin' : (role === 'warehouse' ? 'Gudang' : 'Kasir');

    const { data: pendingPOs = [], isLoading } = usePendingReceiptPOs(destination);
    const confirmReceipt = useConfirmPOReceipt();

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [receivedItems, setReceivedItems] = useState<ReceivedItemState[]>([]);

    const signatureRef = useRef<SignaturePadRef>(null);

    const { data: selectedPO, isLoading: selectedPOLoading } = usePurchaseOrder(selectedPOId || '');

    const handleView = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        setIsViewOpen(true);
    };

    const openConfirmDialog = (po: PurchaseOrder) => {
        setSelectedPOId(po.id);
        setNotes('');
        setPhotoFile(null);
        setPhotoPreview(null);
        setSignatureData(null);

        if (po.items) {
            setReceivedItems(po.items.map(item => ({
                itemId: item.id,
                productId: item.product_id || '',
                productName: item.product_name,
                orderedQty: item.quantity,
                receivedQty: item.quantity,
                damagedQty: 0,
                barcode: (item as any).barcode || undefined,
                unit: (item as any).unit || 'pcs',
                unitPrice: item.unit_price,
                isNewProduct: (item as any).is_new_product || !item.product_id,
            })));
        }
        setIsConfirmOpen(true);
    };

    const updateReceivedQty = (itemId: string, qty: number) => {
        const floatQty = Math.max(0, qty);
        setReceivedItems(prev => prev.map(item =>
            item.itemId === itemId ? { ...item, receivedQty: floatQty } : item
        ));
    };

    const updateDamagedQty = (itemId: string, qty: number) => {
        const floatQty = Math.max(0, qty);
        setReceivedItems(prev => prev.map(item =>
            item.itemId === itemId ? { ...item, damagedQty: floatQty } : item
        ));
    };

    const updateBarcode = (itemId: string, barcode: string) => {
        setReceivedItems(prev => prev.map(item =>
            item.itemId === itemId ? { ...item, barcode } : item
        ));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedFile = await compressImageToFile(file, {
                    maxWidth: 1200,
                    maxHeight: 1200,
                    quality: 0.8,
                });
                setPhotoFile(compressedFile);
                const reader = new FileReader();
                reader.onloadend = () => setPhotoPreview(reader.result as string);
                reader.readAsDataURL(compressedFile);
            } catch {
                setPhotoFile(file);
                const reader = new FileReader();
                reader.onloadend = () => setPhotoPreview(reader.result as string);
                reader.readAsDataURL(file);
            }
        }
    };

    const totalOrdered = receivedItems.reduce((sum, item) => sum + item.orderedQty, 0);
    const totalReceived = receivedItems.reduce((sum, item) => sum + item.receivedQty, 0);
    const totalDamaged = receivedItems.reduce((sum, item) => sum + item.damagedQty, 0);
    const hasDiscrepancy = totalReceived < totalOrdered || totalDamaged > 0;
    const itemsWithIssue = receivedItems.filter(i => i.receivedQty < i.orderedQty || i.damagedQty > 0).length;

    const handleConfirm = async () => {
        if (!selectedPOId) return;

        for (const item of receivedItems) {
            if (isNaN(item.receivedQty) || isNaN(item.damagedQty)) {
                alert(`Jumlah untuk "${item.productName}" tidak valid.`);
                return;
            }
        }

        let photoUrl: string | undefined;
        let signatureUrl: string | undefined;

        setUploading(true);
        try {
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `po_receipts/${selectedPOId}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, photoFile);
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
                    photoUrl = urlData.publicUrl;
                }
            }

            if (signatureData && typeof signatureData === 'string' && signatureData.startsWith('data:')) {
                try {
                    const blob = await fetch(signatureData).then(r => r.blob());
                    const signatureFileName = `po_receipts/sig_${selectedPOId}_${Date.now()}.png`;
                    const { error: sigError } = await supabase.storage
                        .from('receipts')
                        .upload(signatureFileName, blob, { contentType: 'image/png' });
                    if (!sigError) {
                        const { data: sigUrlData } = supabase.storage.from('receipts').getPublicUrl(signatureFileName);
                        signatureUrl = sigUrlData.publicUrl;
                    }
                } catch (sigFetchError) {
                    console.error('Signature conversion error:', sigFetchError);
                }
            }

            await confirmReceipt.mutateAsync({
                poId: selectedPOId,
                receivedBy: user?.id || '',
                receivedByName: profile?.name || '',
                receivedItems,
                photoUrl,
                signatureUrl,
                notes: notes || undefined,
            });

            setIsConfirmOpen(false);
            setSelectedPOId(null);
            setNotes('');
            setPhotoFile(null);
            setPhotoPreview(null);
            setSignatureData(null);
            setReceivedItems([]);
        } finally {
            setUploading(false);
        }
    };

    const columns: Column<PurchaseOrder>[] = [
        {
            header: 'No. PO',
            accessorKey: 'po_number',
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 text-sm">{item.po_number}</span>
                </div>
            ),
        },
        {
            header: 'Supplier',
            accessorKey: 'supplier',
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="font-medium text-sm">{item.supplier?.name || '-'}</span>
                </div>
            ),
        },
        {
            header: 'Total Nilai',
            accessorKey: 'total_amount',
            cell: (item) => (
                <div className="flex flex-col">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        Rp {item.total_amount.toLocaleString('id-ID')}
                    </span>
                </div>
            ),
        },
        {
            header: 'Produk',
            accessorKey: 'items',
            cell: (item) => (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Boxes className="w-3 h-3" />
                    {item.items?.length || 0} item
                </span>
            ),
        },
        {
            header: 'Tanggal PO',
            accessorKey: 'created_at',
            cell: (item) => (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(item.created_at), 'dd MMM yyyy', { locale: localeId })}
                </div>
            ),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(item)}
                        className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                    >
                        <Eye className="w-3.5 h-3.5 text-slate-500 hover:text-indigo-600" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => openConfirmDialog(item)}
                        className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 border-0 text-xs font-semibold transition-all hover:shadow-md"
                    >
                        <Check className="w-3.5 h-3.5" />
                        Terima
                    </Button>
                </div>
            ),
        },
    ];

    if (isLoading) {
        return (
            <MainLayout title="Penerimaan PO" subtitle={`Konfirmasi penerimaan barang (${roleLabel})`}>
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Penerimaan PO"
            subtitle={`Konfirmasi penerimaan barang dari supplier ke ${destination === 'all' ? 'Gudang & Toko' : (destination === 'gudang' ? 'Gudang' : 'Toko')}`}
        >
            <div className="space-y-6">
                {/* Stats */}
                <StatsGrid columns={2}>
                    <StatsCard
                        title="Menunggu Penerimaan"
                        value={pendingPOs.length}
                        icon={<Package className="w-5 h-5" />}
                        subtitle="PO belum dikonfirmasi"
                    />
                    <StatsCard
                        title="Total Nilai"
                        value={`Rp ${pendingPOs.reduce((a, p) => a + p.total_amount, 0).toLocaleString()}`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        subtitle="Est. nilai persediaan masuk"
                    />
                </StatsGrid>

                {/* Table */}
                <BeautifulTable
                    data={pendingPOs}
                    columns={columns}
                    title={`PO Pending (${destination === 'all' ? 'Semua Lokasi' : (destination === 'gudang' ? 'Gudang' : 'Toko')})`}
                    hideSelection
                    emptyState={{
                        icon: <Package className="w-10 h-10" />,
                        title: "Tidak Ada PO Pending",
                        description: "Semua purchase order sudah diterima. Tidak ada yang perlu dikonfirmasi."
                    }}
                />

                {/* ─── VIEW DETAIL MODAL ─── */}
                <AppModal
                    open={isViewOpen}
                    onClose={() => setIsViewOpen(false)}
                    hideHeader
                    noPadding
                    size="2xl"
                >
                    <div className="max-h-[90vh] flex flex-col">
                        {selectedPOLoading ? (
                            <div className="py-16 flex flex-col items-center justify-center space-y-4">
                                <div className="w-10 h-10 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin" />
                                <p className="text-muted-foreground text-sm animate-pulse">Memuat detail Purchase Order...</p>
                            </div>
                        ) : selectedPO ? (
                            <>
                                {/* Header */}
                                <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 text-white overflow-hidden flex-shrink-0">
                                    {/* Decorative circles */}
                                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                                    <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/5" />
                                    <div className="absolute top-4 right-16 opacity-10">
                                        <FileText className="w-24 h-24" />
                                    </div>

                                    <div className="relative z-10 flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                                                    <ClipboardCheck className="w-4 h-4" />
                                                </div>
                                                <span className="text-indigo-200 text-sm font-medium">Detail Purchase Order</span>
                                            </div>
                                            <h2 className="text-2xl font-bold tracking-tight">{selectedPO.po_number}</h2>
                                            <p className="text-indigo-200 text-sm mt-1">{selectedPO.supplier?.name}</p>
                                        </div>
                                        <button
                                            onClick={() => setIsViewOpen(false)}
                                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Info pills */}
                                    <div className="relative z-10 flex flex-wrap gap-2 mt-4">
                                        <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(selectedPO.created_at), 'dd MMM yyyy', { locale: localeId })}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                                            <Boxes className="w-3 h-3" />
                                            {selectedPO.items?.length || 0} produk
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-emerald-100">
                                            Rp {selectedPO.total_amount.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                                            <p className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-1">Supplier</p>
                                            <p className="font-bold text-indigo-900 dark:text-indigo-100">{selectedPO.supplier?.name || '-'}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
                                            <p className="text-xs text-violet-500 dark:text-violet-400 font-semibold uppercase tracking-wider mb-1">Tanggal PO</p>
                                            <p className="font-bold text-violet-900 dark:text-violet-100">
                                                {format(new Date(selectedPO.created_at), 'dd MMM yyyy', { locale: localeId })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                            <Boxes className="w-4 h-4 text-indigo-500" />
                                            Daftar Barang Pesanan
                                        </h3>
                                        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                                            {selectedPO.items?.map((item, idx) => {
                                                const isBonus = (item as any).is_bonus === true;
                                                const isFree = !isBonus && item.unit_price === 0;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors ${isBonus ? 'bg-green-50/50 dark:bg-green-900/10' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <p className="font-semibold text-sm">{item.product_name}</p>
                                                                    {isBonus && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full font-bold uppercase tracking-wider">Bonus</span>
                                                                    )}
                                                                    {isFree && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full font-bold uppercase tracking-wider">Gratis</span>
                                                                    )}
                                                                    {(item as any).is_new_product && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold uppercase tracking-wider">Baru</span>
                                                                    )}
                                                                </div>
                                                                {item.unit_price > 0 && (
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        Rp {item.unit_price.toLocaleString('id-ID')} / {(item as any).unit?.toUpperCase() || 'PCS'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <span className="inline-flex items-center justify-center bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-sm min-w-[2.5rem]">
                                                                {item.quantity}
                                                            </span>
                                                            <span className="ml-1.5 text-xs font-semibold text-muted-foreground uppercase">
                                                                {(item as any).unit?.toUpperCase() || 'PCS'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Total Nilai PO</span>
                                        <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                                            Rp {selectedPO.total_amount.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-3 flex-shrink-0">
                                    <Button variant="outline" className="rounded-xl px-5" onClick={() => setIsViewOpen(false)}>
                                        Tutup
                                    </Button>
                                    <Button
                                        className="rounded-xl px-5 gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0 shadow-sm"
                                        onClick={() => { setIsViewOpen(false); openConfirmDialog(selectedPO); }}
                                    >
                                        <Check className="w-4 h-4" />
                                        Konfirmasi Penerimaan
                                    </Button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </AppModal>

                {/* ─── CONFIRM RECEIPT MODAL ─── */}
                <AppModal
                    open={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    hideHeader
                    noPadding
                    size="2xl"
                >
                    <div className="flex flex-col max-h-[92vh] bg-slate-50/50 dark:bg-slate-900/50">
                        {/* Premium Redesigned Header */}
                        <div className="bg-white dark:bg-slate-900 border-b border-border/60 p-5 flex-shrink-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                            Konfirmasi Penerimaan Barang
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Masukkan jumlah barang yang diterima dan kondisi barang rusak (jika ada).
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsConfirmOpen(false)}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Summary Chips */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50">
                                    <Boxes className="w-3.5 h-3.5 text-indigo-500" />
                                    {receivedItems.length} Item
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50">
                                    Dipesan: <span className="font-bold text-slate-950 dark:text-white ml-0.5">{totalOrdered}</span>
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                                    hasDiscrepancy 
                                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/30 text-amber-700 dark:text-amber-400' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                    Diterima: <span className="font-bold ml-0.5">{totalReceived}</span>
                                </span>
                                {totalDamaged > 0 && (
                                    <span className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 px-3 py-1 rounded-full text-xs font-semibold text-red-700 dark:text-red-400">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Rusak: <span className="font-bold ml-0.5">{totalDamaged}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto flex-1 p-5 space-y-5 custom-scrollbar">
                            {/* Discrepancy Alert */}
                            {hasDiscrepancy && (
                                <div className="flex items-start gap-3 p-4 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl animate-fade-in">
                                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Terdeteksi Selisih Penerimaan</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                            Terdapat perbedaan jumlah antara pesanan dengan yang diterima ({itemsWithIssue} barang).
                                            {totalDamaged > 0 && ` Barang rusak: ${totalDamaged} unit.`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Daftar Barang Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <Boxes className="w-4 h-4 text-indigo-500" />
                                    Daftar Barang
                                </h3>
                                
                                <div className="space-y-3">
                                    {receivedItems.map((item, idx) => {
                                        const itemHasIssue = item.receivedQty < item.orderedQty || item.damagedQty > 0;
                                        const receivePercent = item.orderedQty > 0 ? Math.min(100, (item.receivedQty / item.orderedQty) * 100) : 100;

                                        return (
                                            <div
                                                key={item.itemId}
                                                className={`rounded-xl border transition-all duration-200 overflow-hidden bg-card hover:border-slate-300 dark:hover:border-slate-700 ${
                                                    item.damagedQty > 0
                                                        ? 'border-l-4 border-l-red-500 border-red-100 dark:border-red-900/30'
                                                        : item.receivedQty < item.orderedQty
                                                        ? 'border-l-4 border-l-amber-500 border-amber-100 dark:border-amber-900/30'
                                                        : 'border-l-4 border-l-emerald-500 border-border'
                                                }`}
                                            >
                                                {/* Progress bar indicator */}
                                                <div className="h-0.5 bg-slate-100 dark:bg-slate-800">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${
                                                            item.damagedQty > 0 
                                                                ? 'bg-red-500' 
                                                                : receivePercent >= 100 
                                                                ? 'bg-emerald-500' 
                                                                : 'bg-amber-400'
                                                        }`}
                                                        style={{ width: `${receivePercent}%` }}
                                                    />
                                                </div>

                                                <div className="p-4 space-y-3">
                                                    {/* Header item */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-2.5">
                                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                                item.damagedQty > 0
                                                                    ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                                                                    : item.receivedQty < item.orderedQty
                                                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                                                                    : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                            }`}>
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 leading-tight">
                                                                    {item.productName}
                                                                </p>
                                                                {item.isNewProduct && (
                                                                    <span className="inline-block text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 rounded font-bold uppercase tracking-wider mt-1">
                                                                        Produk Baru
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            <Badge variant="outline" className="rounded-full text-xs font-semibold px-2.5 py-0.5 bg-slate-50 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/50">
                                                                Dipesan: {item.orderedQty} {item.unit?.toUpperCase() || 'PCS'}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    {/* Barcode scanner for new products */}
                                                    {item.isNewProduct && (
                                                        <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30">
                                                            <Label className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1.5 block">
                                                                🔖 Barcode Produk Baru (Wajib)
                                                            </Label>
                                                            <BarcodeScanner
                                                                onScan={(barcode) => updateBarcode(item.itemId, barcode)}
                                                                placeholder="Scan atau ketik barcode..."
                                                            />
                                                            {item.barcode && (
                                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono font-semibold flex items-center gap-1">
                                                                    <Check className="w-3.5 h-3.5" /> {item.barcode}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Inputs Row */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Received Input with Stepper */}
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                                <Check className="w-3.5 h-3.5" /> Diterima
                                                            </Label>
                                                            <div className="flex items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateReceivedQty(item.itemId, Math.max(0, item.receivedQty - 1))}
                                                                    className="h-10 w-10 border border-r-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-lg flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                                >
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div className="relative flex-1">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        step="any"
                                                                        value={item.receivedQty}
                                                                        onChange={(e) => updateReceivedQty(item.itemId, parseFloat(e.target.value) || 0)}
                                                                        className="h-10 text-center font-bold text-base rounded-none border-x-0 border-slate-200 dark:border-slate-800 focus:border-indigo-400 focus:ring-0 focus-visible:ring-0 pr-10"
                                                                    />
                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                                                                        {item.unit?.toUpperCase() || 'PCS'}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateReceivedQty(item.itemId, item.receivedQty + 1)}
                                                                    className="h-10 w-10 border border-l-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-lg flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Damaged Input with Stepper */}
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                                                                <AlertTriangle className="w-3.5 h-3.5" /> Rusak
                                                            </Label>
                                                            <div className="flex items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateDamagedQty(item.itemId, Math.max(0, item.damagedQty - 1))}
                                                                    className="h-10 w-10 border border-r-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-l-lg flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                                >
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div className="relative flex-1">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        step="any"
                                                                        value={item.damagedQty}
                                                                        onChange={(e) => updateDamagedQty(item.itemId, parseFloat(e.target.value) || 0)}
                                                                        className={`h-10 text-center font-bold text-base rounded-none border-x-0 border-slate-200 dark:border-slate-800 focus:border-red-400 focus:ring-0 focus-visible:ring-0 pr-10 ${
                                                                            item.damagedQty > 0 ? 'text-red-600 dark:text-red-400 border-y-red-200 dark:border-y-red-900/30' : ''
                                                                        }`}
                                                                    />
                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                                                                        {item.unit?.toUpperCase() || 'PCS'}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateDamagedQty(item.itemId, item.damagedQty + 1)}
                                                                    className="h-10 w-10 border border-l-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-r-lg flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 block flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-indigo-500" />
                                    Catatan Penerimaan {hasDiscrepancy && <span className="text-amber-500 font-normal text-xs ml-1">(wajib jika ada selisih)</span>}
                                </Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Catatan kondisi fisik barang, keterangan selisih, nomor DO/surat jalan..."
                                    rows={3}
                                    className="rounded-xl resize-none border-slate-200 dark:border-slate-800 focus:border-indigo-300 focus:ring-indigo-200 bg-slate-50/50 dark:bg-slate-950/20"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 border-t border-border/60 bg-white dark:bg-slate-900">
                            {/* Summary Alert at the footer */}
                            {hasDiscrepancy && (
                                <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100/60 dark:border-amber-900/30 flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                        Ada selisih penerimaan: pesanan {totalOrdered}, diterima {totalReceived}
                                        {totalDamaged > 0 && `, rusak ${totalDamaged}`}.
                                    </p>
                                </div>
                            )}

                            <div className="p-4 flex gap-3 justify-end bg-slate-50/30 dark:bg-slate-900/10">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsConfirmOpen(false)}
                                    className="rounded-xl px-5 border-slate-200 dark:border-slate-800 font-semibold"
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleConfirm}
                                    disabled={confirmReceipt.isPending || uploading}
                                    className={`rounded-xl px-6 gap-2 font-semibold border-0 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] ${
                                        hasDiscrepancy
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-200/50 dark:shadow-none'
                                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-200/50 dark:shadow-none'
                                    }`}
                                >
                                    {confirmReceipt.isPending || uploading ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            {hasDiscrepancy
                                                ? <><AlertTriangle className="w-4.5 h-4.5" /> Konfirmasi dengan Selisih</>
                                                : <><ShieldCheck className="w-4.5 h-4.5" /> Konfirmasi & Tambah Stok</>
                                            }
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </AppModal>
            </div>
        </MainLayout>
    );
}

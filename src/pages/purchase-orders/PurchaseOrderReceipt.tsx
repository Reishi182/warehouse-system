import { useState, useRef } from 'react';
import { Package, Check, Eye, Camera, Wallet, AlertTriangle, FileText, Calendar } from 'lucide-react';
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

    // Determine destination based on role (admin can view all)
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

        // Initialize received items from PO items
        if (po.items) {
            setReceivedItems(po.items.map(item => ({
                itemId: item.id,
                productId: item.product_id || '',
                productName: item.product_name,
                orderedQty: item.quantity,
                receivedQty: item.quantity, // Pre-fill with ordered qty
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
                // Auto-compress image
                const compressedFile = await compressImageToFile(file, {
                    maxWidth: 1200,
                    maxHeight: 1200,
                    quality: 0.8,
                });
                setPhotoFile(compressedFile);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPhotoPreview(reader.result as string);
                };
                reader.readAsDataURL(compressedFile);
            } catch {
                // Fallback to original
                setPhotoFile(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPhotoPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    // Calculate discrepancy stats
    const totalOrdered = receivedItems.reduce((sum, item) => sum + item.orderedQty, 0);
    const totalReceived = receivedItems.reduce((sum, item) => sum + item.receivedQty, 0);
    const totalDamaged = receivedItems.reduce((sum, item) => sum + item.damagedQty, 0);
    const hasDiscrepancy = totalReceived < totalOrdered || totalDamaged > 0;

    const handleConfirm = async () => {
        if (!selectedPOId) return;

        // Validate all quantities are valid numbers before submitting
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
            // Upload photo if provided
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `po_receipts/${selectedPOId}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, photoFile);

                if (uploadError) {
                    console.error('Photo upload error:', uploadError);
                } else {
                    const { data: urlData } = supabase.storage
                        .from('receipts')
                        .getPublicUrl(fileName);
                    photoUrl = urlData.publicUrl;
                    console.log('Photo uploaded successfully:', photoUrl);
                }
            }

            // Upload signature if provided - ensure signatureData is a valid data URL
            if (signatureData && typeof signatureData === 'string' && signatureData.startsWith('data:')) {
                try {
                    const blob = await fetch(signatureData).then(r => r.blob());
                    const signatureFileName = `po_receipts/sig_${selectedPOId}_${Date.now()}.png`;

                    const { error: sigError } = await supabase.storage
                        .from('receipts')
                        .upload(signatureFileName, blob, {
                            contentType: 'image/png',
                        });

                    if (sigError) {
                        console.error('Signature upload error:', sigError);
                    } else {
                        const { data: sigUrlData } = supabase.storage
                            .from('receipts')
                            .getPublicUrl(signatureFileName);
                        signatureUrl = sigUrlData.publicUrl;
                        console.log('Signature uploaded successfully:', signatureUrl);
                    }
                } catch (sigFetchError) {
                    console.error('Signature conversion error:', sigFetchError);
                }
            } else if (signatureData) {
                console.warn('Invalid signature data format, expected data URL but got:', typeof signatureData, signatureData?.substring?.(0, 50));
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
            cell: (item) => <span className="font-mono font-medium">{item.po_number}</span>,
        },
        {
            header: 'Supplier',
            accessorKey: 'supplier',
            cell: (item) => <span>{item.supplier?.name || '-'}</span>,
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            cell: (item) => (
                <span className="font-semibold">Rp {item.total_amount.toLocaleString('id-ID')}</span>
            ),
        },
        {
            header: 'Items',
            accessorKey: 'items',
            cell: (item) => (
                <span>{item.items?.length || 0} produk</span>
            ),
        },
        {
            header: 'Tanggal PO',
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
                    <Button size="sm" variant="outline" onClick={() => handleView(item)}>
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={() => openConfirmDialog(item)} className="gap-1">
                        <Check className="w-4 h-4" />
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
        <MainLayout title="Penerimaan PO" subtitle={`Konfirmasi penerimaan barang dari supplier ke ${destination === 'all' ? 'Gudang & Toko' : (destination === 'gudang' ? 'Gudang' : 'Toko')}`}>
            <div className="space-y-6">
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
                        icon={<Wallet className="w-5 h-5" />}
                        subtitle="Est. nilai persediaan"
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

                {/* View Dialog */}
                <AppModal 
                    open={isViewOpen} 
                    onClose={() => setIsViewOpen(false)}
                    hideHeader
                    noPadding
                    size="2xl"
                >
                    <div className="max-h-[90vh]">
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
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <Package className="w-3.5 h-3.5 text-indigo-500" /> Supplier
                                            </p>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedPO.supplier?.name || '-'}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Tanggal Dibuat
                                            </p>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                {format(new Date(selectedPO.created_at), 'dd MMM yyyy', { locale: localeId })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                            <Package className="w-4 h-4 text-indigo-500" />
                                            Daftar Barang Pesanan
                                        </h3>
                                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {selectedPO.items?.map(item => {
                                                    const isBonus = (item as any).is_bonus === true;
                                                    const isFree = !isBonus && item.unit_price === 0;
                                                    return (
                                                        <div key={item.id} className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${isBonus ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.product_name}</p>
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
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="inline-flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-lg min-w-[3rem]">
                                                                    {item.quantity}
                                                                </span>
                                                                <span className="ml-2 text-sm font-medium text-gray-500 uppercase">{item.unit?.toUpperCase() || 'PCS'}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0">
                                    <Button variant="outline" className="rounded-xl px-6" onClick={() => setIsViewOpen(false)}>
                                        Tutup
                                    </Button>
                                    <Button 
                                        className="rounded-xl px-6 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                        onClick={() => {
                                            setIsViewOpen(false);
                                            openConfirmDialog(selectedPO);
                                        }}
                                    >
                                        <Check className="w-4 h-4" />
                                        Konfirmasi Penerimaan
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </AppModal>

                {/* Confirm Receipt Dialog - Enhanced with per-item input */}
                <AppModal 
                    open={isConfirmOpen} 
                    onClose={() => setIsConfirmOpen(false)}
                    title={
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Konfirmasi Penerimaan Barang
                        </div>
                    }
                    size="2xl"
                >
                    <div className="space-y-4 mt-2">
                            <p className="text-sm text-muted-foreground">
                                Masukkan jumlah barang yang diterima dan kondisi barang rusak (jika ada).
                            </p>

                            {/* Discrepancy Alert */}
                            {hasDiscrepancy && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-800 dark:text-amber-200">Terdeteksi Selisih!</p>
                                        <p className="text-sm text-amber-700 dark:text-amber-300">
                                            Dipesan: {totalOrdered} unit • Diterima: {totalReceived} unit
                                            {totalDamaged > 0 && ` • Rusak: ${totalDamaged} unit`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Per-item quantity input */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Daftar Barang</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {receivedItems.map((item) => {
                                            const itemHasIssue = item.receivedQty < item.orderedQty || item.damagedQty > 0;
                                            return (
                                                <div
                                                    key={item.itemId}
                                                    className={`p-3 rounded-lg border ${itemHasIssue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-muted/30'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="font-medium">{item.productName}</p>
                                                        <Badge variant="outline">Dipesan: {item.orderedQty} {item.unit?.toUpperCase() || 'PCS'}</Badge>
                                                    </div>

                                                    {item.isNewProduct && (
                                                        <div className="mb-3">
                                                            <Label className="text-xs text-blue-600 dark:text-blue-400 mb-1 block">Barcode Produk Baru (Wajib)</Label>
                                                            <BarcodeScanner
                                                                onScan={(barcode) => updateBarcode(item.itemId, barcode)}
                                                                placeholder="Scan atau ketik barcode..."
                                                            />
                                                            {item.barcode && (
                                                                <p className="text-xs text-green-600 mt-1 font-mono">✓ {item.barcode}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <Label className="text-xs">Diterima</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={item.orderedQty}
                                                                step="any"
                                                                value={item.receivedQty}
                                                                onChange={(e) => updateReceivedQty(item.itemId, parseFloat(e.target.value) || 0)}
                                                                className="h-9 mt-1"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs text-red-600">Rusak</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                step="any"
                                                                value={item.damagedQty}
                                                                onChange={(e) => updateDamagedQty(item.itemId, parseFloat(e.target.value) || 0)}
                                                                className="h-9 mt-1"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Photo Upload (Temporarily Disabled)
                            <div className="space-y-2">
                                <Label>Foto Bukti Penerimaan <span className="text-red-500">*</span></Label>
                                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                                    {photoPreview ? (
                                        <div className="space-y-2">
                                            <img src={photoPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                                            <Button variant="outline" size="sm" onClick={() => {
                                                setPhotoFile(null);
                                                setPhotoPreview(null);
                                            }}>
                                                Hapus Foto
                                            </Button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer block">
                                            <div className="flex flex-col items-center gap-2 py-4">
                                                <Camera className="w-8 h-8 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Klik untuk upload foto</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                            */}

                            {/* Digital Signature (Temporarily Disabled)
                            <div className="space-y-2">
                                <Label>Tanda Tangan Digital <span className="text-red-500">*</span></Label>
                                <SignaturePad
                                    ref={signatureRef}
                                    onSignatureChange={setSignatureData}
                                    width={450}
                                    height={150}
                                />
                            </div>
                            */}

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label>Catatan {hasDiscrepancy && '(wajib jika ada selisih)'}</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Catatan penerimaan, keterangan selisih, dll..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
                                <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleConfirm}
                                    disabled={confirmReceipt.isPending || uploading}
                                    className="gap-1"
                                >
                                    {confirmReceipt.isPending || uploading ? 'Memproses...' : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            {hasDiscrepancy ? 'Konfirmasi dengan Selisih' : 'Konfirmasi & Tambah Stok'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                </AppModal>
            </div>
        </MainLayout>
    );
}

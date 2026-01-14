import { useState } from 'react';
import { Package, Check, Eye, Upload, Camera, Wallet } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

export default function PurchaseOrderReceipt() {
    const { user, profile } = useAuth();
    const role = useRole();

    // Determine destination based on role
    const destination = role === 'warehouse' ? 'gudang' : 'toko';
    const roleLabel = role === 'warehouse' ? 'Gudang' : 'Kasir';

    const { data: pendingPOs = [], isLoading } = usePendingReceiptPOs(destination);
    const confirmReceipt = useConfirmPOReceipt();

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

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
        setIsConfirmOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirm = async () => {
        if (!selectedPOId) return;

        let photoUrl: string | undefined;

        // Upload photo if provided
        if (photoFile) {
            setUploading(true);
            try {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `po_receipts/${selectedPOId}_${Date.now()}.${fileExt}`;

                const { data, error } = await supabase.storage
                    .from('uploads')
                    .upload(fileName, photoFile);

                if (error) throw error;

                const { data: urlData } = supabase.storage
                    .from('uploads')
                    .getPublicUrl(fileName);

                photoUrl = urlData.publicUrl;
            } catch (err) {
                console.error('Upload failed:', err);
            } finally {
                setUploading(false);
            }
        }

        await confirmReceipt.mutateAsync({
            poId: selectedPOId,
            receivedBy: user?.id || '',
            receivedByName: profile?.name || '',
            photoUrl,
            notes: notes || undefined,
        });

        setIsConfirmOpen(false);
        setSelectedPOId(null);
        setNotes('');
        setPhotoFile(null);
        setPhotoPreview(null);
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
                        Konfirmasi
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
        <MainLayout title="Penerimaan PO" subtitle={`Konfirmasi penerimaan barang dari supplier ke ${destination === 'gudang' ? 'Gudang' : 'Toko'}`}>
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
                    title={`PO Pending (${destination === 'gudang' ? 'Gudang' : 'Toko'})`}
                    hideSelection
                    emptyState={{
                        icon: <Package className="w-10 h-10" />,
                        title: "Tidak Ada PO Pending",
                        description: "Semua purchase order sudah diterima. Tidak ada yang perlu dikonfirmasi."
                    }}
                />

                {/* View Dialog */}
                <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Detail Purchase Order</DialogTitle>
                        </DialogHeader>
                        {selectedPOLoading ? (
                            <div className="py-8 text-center text-muted-foreground">Memuat...</div>
                        ) : selectedPO ? (
                            <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">No. PO</p>
                                        <p className="font-mono font-bold">{selectedPO.po_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Supplier</p>
                                        <p className="font-medium">{selectedPO.supplier?.name || '-'}</p>
                                    </div>
                                </div>

                                {/* Items */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Daftar Barang</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {selectedPO.items?.map(item => (
                                                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{item.product_name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold">{item.quantity} unit</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex gap-3 justify-end pt-4">
                                    <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                                        Tutup
                                    </Button>
                                    <Button onClick={() => {
                                        setIsViewOpen(false);
                                        openConfirmDialog(selectedPO);
                                    }} className="gap-1">
                                        <Check className="w-4 h-4" />
                                        Konfirmasi Penerimaan
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>

                {/* Confirm Receipt Dialog */}
                <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Konfirmasi Penerimaan Barang
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <p className="text-sm text-muted-foreground">
                                Konfirmasi bahwa barang dari PO ini telah diterima. Stok akan otomatis ditambahkan ke {destination === 'gudang' ? 'Gudang' : 'Toko'}.
                            </p>

                            {/* Photo Upload */}
                            <div className="space-y-2">
                                <Label>Foto Bukti Penerimaan</Label>
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

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label>Catatan (opsional)</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Catatan penerimaan..."
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
                                            Konfirmasi & Tambah Stok
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}

import { useState, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import StatusBadge from '@/components/common/StatusBadge';
import LocationBadge from '@/components/common/LocationBadge';
import { useSuratJalanB2B } from '@/hooks/useSuratJalanB2B';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Package, Truck, CheckCircle, List, Clock, Camera, PenTool, User, AlertCircle } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { AppModal } from '@/components/ui/app-modal';
import SignaturePad, { SignaturePadRef } from '@/components/common/SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { compressImageToFile, isImageFile } from '@/lib/imageCompression';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function SuratJalanWarehouse() {
    const { user } = useAuth();
    const { suratJalans, completeOrder, processOrder, isLoading } = useSuratJalanB2B();
    const { toast } = useToast();
    const [selectedSj, setSelectedSj] = useState<any | null>(null);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [processDialogOpen, setProcessDialogOpen] = useState(false);
    const [sjToProcess, setSjToProcess] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
    const [deliveryPhotoPreview, setDeliveryPhotoPreview] = useState<string | null>(null);
    const [senderName, setSenderName] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [hasSenderSignature, setHasSenderSignature] = useState(false);
    const [hasReceiverSignature, setHasReceiverSignature] = useState(false);

    // Refs
    const senderSignatureRef = useRef<SignaturePadRef>(null);
    const receiverSignatureRef = useRef<SignaturePadRef>(null);

    if (isLoading) {
        return (
            <MainLayout title="Selesaikan Pengiriman" subtitle="Selesaikan pengiriman dengan bukti">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    // Filter for processing orders (waiting for warehouse to complete)
    const approvedOrders = suratJalans.filter((sj: any) => sj.status === 'approved');
    const processingOrders = suratJalans.filter((sj: any) => sj.status === 'processing');
    const completedOrders = suratJalans.filter((sj: any) => sj.status === 'completed');
    const pendingCount = suratJalans.filter((sj: any) => sj.status === 'pending_review').length; // old feature legacy

    const handleProcessOrder = () => {
        if (!sjToProcess || !user) return;
        processOrder.mutate({
            suratJalanId: sjToProcess.id,
            processedBy: user.id,
        }, {
            onSuccess: () => {
                setProcessDialogOpen(false);
                setSjToProcess(null);
            }
        });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setDeliveryPhoto(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setDeliveryPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleOpenComplete = (sj: any) => {
        setSelectedSj(sj);
        setDeliveryPhoto(null);
        setDeliveryPhotoPreview(null);
        setSenderName('');
        setReceiverName(sj.recipient_name || ''); // Pre-fill with recipient name
        setHasSenderSignature(false);
        setHasReceiverSignature(false);
        setCompleteDialogOpen(true);
    };

    const uploadFile = async (file: File | Blob, folder: string): Promise<string> => {
        const fileExt = file instanceof File ? file.name.split('.').pop() : 'png';
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
        return urlData.publicUrl;
    };

    const handleCompleteOrder = async () => {
        if (!selectedSj || !user) return;

        // Validation
        if (!deliveryPhoto) {
            toast({ title: 'Error', description: 'Foto bukti pengiriman wajib diupload', variant: 'destructive' });
            return;
        }
        if (!senderName.trim()) {
            toast({ title: 'Error', description: 'Nama pengirim wajib diisi', variant: 'destructive' });
            return;
        }
        if (!receiverName.trim()) {
            toast({ title: 'Error', description: 'Nama penerima wajib diisi', variant: 'destructive' });
            return;
        }
        if (!hasSenderSignature || senderSignatureRef.current?.isEmpty()) {
            toast({ title: 'Error', description: 'Tanda tangan pengirim wajib diisi', variant: 'destructive' });
            return;
        }
        if (!hasReceiverSignature || receiverSignatureRef.current?.isEmpty()) {
            toast({ title: 'Error', description: 'Tanda tangan penerima wajib diisi', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Upload delivery photo
            const fileToUpload = isImageFile(deliveryPhoto)
                ? await compressImageToFile(deliveryPhoto, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
                : deliveryPhoto;
            const deliveryPhotoUrl = await uploadFile(fileToUpload, 'delivery-photos');

            // 2. Upload signatures
            const senderSignatureUrl = await new Promise<string>((resolve, reject) => {
                senderSignatureRef.current?.toBlob(async (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to get sender signature'));
                        return;
                    }
                    try {
                        const url = await uploadFile(blob, 'signatures');
                        resolve(url);
                    } catch (err) {
                        reject(err);
                    }
                }, 'image/png');
            });

            const receiverSignatureUrl = await new Promise<string>((resolve, reject) => {
                receiverSignatureRef.current?.toBlob(async (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to get receiver signature'));
                        return;
                    }
                    try {
                        const url = await uploadFile(blob, 'signatures');
                        resolve(url);
                    } catch (err) {
                        reject(err);
                    }
                }, 'image/png');
            });

            // 3. Complete order
            await completeOrder.mutateAsync({
                suratJalanId: selectedSj.id,
                completedBy: user.id,
                deliveryPhotoUrl,
                receiverSignatureUrl,
                senderSignatureUrl,
                receiverName: receiverName.trim(),
                senderName: senderName.trim(),
            });

            setCompleteDialogOpen(false);
            setSelectedSj(null);
        } catch (error: any) {
            toast({
                title: 'Gagal',
                description: error.message || 'Terjadi kesalahan saat menyelesaikan pesanan',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <MainLayout title="Selesaikan Pengiriman" subtitle="Selesaikan pengiriman dengan bukti foto dan tanda tangan">
            <div className="space-y-6">
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Pesanan Baru"
                        value={approvedOrders.length}
                        icon={<Package className="w-5 h-5" />}
                        subtitle={approvedOrders.length > 0 ? "siap diproses" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Perlu Dikirim"
                        value={processingOrders.length}
                        icon={<Truck className="w-5 h-5" />}
                        subtitle="dalam pengiriman"
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Selesai"
                        value={completedOrders.length}
                        icon={<CheckCircle className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Total"
                        value={suratJalans.length}
                        icon={<List className="w-5 h-5" />}
                    />
                </StatsGrid>

                {/* Approved Orders - Need to Process (New Step for Warehouse) */}
                {approvedOrders.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Pesanan Baru (Siap Diproses) ({approvedOrders.length})
                        </h3>
                        <div className="grid gap-4">
                            {approvedOrders.map((sj: any) => (
                                <div key={sj.id} className="bg-card border-2 border-blue-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="font-bold text-xl">{sj.number}</span>
                                                <StatusBadge status={sj.status} showIcon />
                                                <LocationBadge location={sj.source_location} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Penerima</p>
                                                    <p className="font-semibold">{sj.recipient_name}</p>
                                                    <p className="text-sm text-muted-foreground">{sj.recipient_address}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Dibuat</p>
                                                    <p className="font-semibold">
                                                        {sj.created_at && format(new Date(sj.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 justify-center">
                                            <Button
                                                size="lg"
                                                onClick={() => { setSjToProcess(sj); setProcessDialogOpen(true); }}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Package className="mr-2 h-4 w-4" />
                                                Proses Pesanan
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Processing Orders - Need to Complete */}
                {processingOrders.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-purple-500" />
                            Perlu Diselesaikan ({processingOrders.length})
                        </h3>
                        <div className="grid gap-4">
                            {processingOrders.map((sj: any) => (
                                <div key={sj.id} className="bg-card border-2 border-purple-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="font-bold text-xl">{sj.number}</span>
                                                <StatusBadge status={sj.status} showIcon />
                                                <LocationBadge location={sj.source_location} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Penerima</p>
                                                    <p className="font-semibold">{sj.recipient_name}</p>
                                                    <p className="text-sm text-muted-foreground">{sj.recipient_address}</p>
                                                    {sj.recipient_phone && (
                                                        <p className="text-sm text-muted-foreground">📞 {sj.recipient_phone}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Diproses</p>
                                                    <p className="font-semibold">
                                                        {sj.processed_at && format(new Date(sj.processed_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Items */}
                                            <div className="mt-4 bg-muted/50 p-3 rounded-md">
                                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Daftar Barang</p>
                                                <ul className="text-sm space-y-1">
                                                    {sj.items?.map((item: any) => (
                                                        <li key={item.id} className="flex gap-2">
                                                            <span className="font-mono text-primary font-bold">{item.quantity}x</span>
                                                            <span>{item.product_name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 justify-center">
                                            <Button
                                                size="lg"
                                                onClick={() => handleOpenComplete(sj)}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Selesaikan Pengiriman
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {processingOrders.length === 0 && approvedOrders.length === 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
                        <Package className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                        <h3 className="font-bold text-blue-800 dark:text-blue-200">Tidak Ada Pesanan Aktif</h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400">Pesanan yang dibuat oleh kasir akan muncul di sini</p>
                    </div>
                )}

                {/* Completed History — BeautifulTable */}
                {(() => {
                    const completedColumns: Column<any>[] = [
                        {
                            header: 'No. Surat Jalan',
                            accessorKey: 'number',
                            cell: (row) => <span className="font-semibold">{row.number}</span>,
                        },
                        {
                            header: 'Penerima',
                            accessorKey: 'recipient_name',
                            cell: (row) => (
                                <div>
                                    <p className="font-medium">{row.recipient_name}</p>
                                    <p className="text-xs text-muted-foreground">{row.recipient_address}</p>
                                </div>
                            ),
                        },
                        {
                            header: 'Pengirim → Penerima',
                            accessorKey: 'sender_name',
                            cell: (row) =>
                                row.sender_name && row.receiver_name ? (
                                    <span className="text-xs text-green-600 font-medium">
                                        ✓ {row.sender_name} → {row.receiver_name}
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                ),
                        },
                        {
                            header: 'Tanggal Selesai',
                            accessorKey: 'completed_at',
                            cell: (row) =>
                                row.completed_at
                                    ? format(new Date(row.completed_at), 'dd MMM yyyy', { locale: idLocale })
                                    : '-',
                        },
                        {
                            header: 'Status',
                            accessorKey: 'status',
                            cell: (row) => <StatusBadge status={row.status} showIcon />,
                        },
                    ];
                    return (
                        <BeautifulTable
                            data={completedOrders}
                            columns={completedColumns}
                            title="Riwayat Selesai"
                            subtitle="Daftar pengiriman yang telah diselesaikan"
                            variant="premium"
                            hideSelection
                            emptyState={{
                                icon: <CheckCircle className="w-8 h-8 text-white" />,
                                title: 'Belum Ada Riwayat',
                                description: 'Pengiriman yang selesai akan muncul di sini.',
                            }}
                        />
                    );
                })()}
            </div>

            {/* Complete Order Dialog */}
            <AppModal 
                open={completeDialogOpen} 
                onClose={() => !isSubmitting && setCompleteDialogOpen(false)}
                title={<div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /> Selesaikan Pengiriman</div>}
                size="2xl"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground mt-2">
                        Upload bukti pengiriman dan tanda tangan untuk menyelesaikan pesanan
                    </p>

                    {selectedSj && (
                        <>
                            {/* Order Info */}
                            <div className="bg-muted p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">No. Surat Jalan</p>
                                        <p className="font-bold text-lg">{selectedSj.number}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Penerima</p>
                                        <p className="font-semibold">{selectedSj.recipient_name}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Photo Upload */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Camera className="h-4 w-4" />
                                    Foto Bukti Pengiriman <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoChange}
                                    className="rounded-xl"
                                />
                                {deliveryPhotoPreview && (
                                    <div className="mt-2">
                                        <img
                                            src={deliveryPhotoPreview}
                                            alt="Preview"
                                            className="rounded-lg max-h-48 object-cover border"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Sender Info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-4">
                                <h4 className="font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-200">
                                    <User className="h-4 w-4" />
                                    Data Pengirim (Yang Mengantar)
                                </h4>
                                <div className="space-y-2">
                                    <Label>Nama Pengirim <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        placeholder="Masukkan nama pengantar barang"
                                        className="rounded-xl bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <PenTool className="h-4 w-4" />
                                        Tanda Tangan Pengirim <span className="text-red-500">*</span>
                                    </Label>
                                    <SignaturePad
                                        ref={senderSignatureRef}
                                        width={400}
                                        height={150}
                                        onSignatureChange={(v: string | null) => setHasSenderSignature(!!v)}
                                    />
                                </div>
                            </div>

                            {/* Receiver Info */}
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-4">
                                <h4 className="font-semibold flex items-center gap-2 text-green-800 dark:text-green-200">
                                    <User className="h-4 w-4" />
                                    Data Penerima (Customer)
                                </h4>
                                <div className="space-y-2">
                                    <Label>Nama Penerima <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={receiverName}
                                        onChange={(e) => setReceiverName(e.target.value)}
                                        placeholder="Masukkan nama penerima barang"
                                        className="rounded-xl bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <PenTool className="h-4 w-4" />
                                        Tanda Tangan Penerima <span className="text-red-500">*</span>
                                    </Label>
                                    <SignaturePad
                                        ref={receiverSignatureRef}
                                        width={400}
                                        height={150}
                                        onSignatureChange={(v: string | null) => setHasReceiverSignature(!!v)}
                                    />
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Pastikan semua data sudah benar. Stok akan dikurangi setelah pengiriman diselesaikan.
                                </p>
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setCompleteDialogOpen(false)} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleCompleteOrder}
                            disabled={isSubmitting || !deliveryPhoto || !senderName.trim() || !receiverName.trim() || !hasSenderSignature || !hasReceiverSignature}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Selesaikan Pengiriman'}
                        </Button>
                    </div>
                </div>
            </AppModal>

            {/* Process Confirmation Dialog */}
            <AppModal open={processDialogOpen} onClose={() => setProcessDialogOpen(false)} title="Proses Pesanan">
                <div className="space-y-4 mt-2">
                    <p className="text-sm text-muted-foreground">
                        Pesanan akan disiapkan untuk pengiriman. Status pesanan akan berubah menjadi 'Dalam Pengiriman'.
                    </p>

                    {sjToProcess && (
                        <div className="bg-muted p-4 rounded-md my-2 text-sm space-y-1">
                            <p><b>No. Surat Jalan:</b> {sjToProcess.number}</p>
                            <p><b>Penerima:</b> {sjToProcess.recipient_name}</p>
                            <p><b>Lokasi Barang:</b> {sjToProcess.source_location === 'toko' ? '🏪 Toko' : '📦 Gudang'}</p>
                            <p><b>Total Item:</b> {sjToProcess.items?.length} jenis barang</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>Batal</Button>
                        <Button
                            onClick={handleProcessOrder}
                            disabled={processOrder.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {processOrder.isPending ? 'Memproses...' : 'Ya, Proses Pesanan'}
                        </Button>
                    </div>
                </div>
            </AppModal>
        </MainLayout>
    );
}

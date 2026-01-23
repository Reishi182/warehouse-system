import { useState } from 'react';
import { RotateCcw, Upload, Check, Image } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplaceReturns, useUpdateMarketplaceReturn } from '@/hooks/useMarketplaceOrders';
import { MarketplaceReturn, MarketplaceOrder } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { compressImageToFile, isImageFile } from '@/lib/imageCompression';

type ReturnWithOrder = MarketplaceReturn & { marketplace_orders: MarketplaceOrder };

export default function MarketplaceReturns() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [selectedReturn, setSelectedReturn] = useState<ReturnWithOrder | null>(null);
    const [uploadType, setUploadType] = useState<'pickup' | 'complete'>('pickup');
    const [proofFile, setProofFile] = useState<File | null>(null);

    // Hooks
    const { data: returns = [], isLoading } = useMarketplaceReturns();
    const updateReturn = useUpdateMarketplaceReturn();

    const openUploadDialog = (ret: ReturnWithOrder, type: 'pickup' | 'complete') => {
        setSelectedReturn(ret);
        setUploadType(type);
        setProofFile(null);
    };

    const handleUploadProof = async () => {
        if (!selectedReturn || !proofFile) {
            toast({ title: 'Pilih file bukti', variant: 'destructive' });
            return;
        }

        // Upload file
        // Auto-compress if it's an image
        const fileToUpload = isImageFile(proofFile)
            ? await compressImageToFile(proofFile, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
            : proofFile;

        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `marketplace-returns/${selectedReturn.id}-${uploadType}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, fileToUpload);

        if (uploadError) {
            toast({ title: 'Gagal upload file', description: uploadError.message, variant: 'destructive' });
            return;
        }

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
        const proofUrl = urlData.publicUrl;

        await updateReturn.mutateAsync({
            returnId: selectedReturn.id,
            orderId: selectedReturn.order_id,
            status: uploadType === 'pickup' ? 'picked_up' : 'completed',
            pickupProofUrl: uploadType === 'pickup' ? proofUrl : undefined,
            returnProofUrl: uploadType === 'complete' ? proofUrl : undefined,
            completedBy: uploadType === 'complete' ? user?.id : undefined,
        });

        setSelectedReturn(null);
        setProofFile(null);
    };

    // Table columns
    const columns: Column<ReturnWithOrder>[] = [
        {
            header: 'No. Pesanan',
            accessorKey: 'order_id',
            cell: (ret) => (
                <span className="font-semibold">{ret.marketplace_orders?.order_number || '-'}</span>
            ),
        },
        {
            header: 'Marketplace',
            accessorKey: 'marketplace_orders',
            cell: (ret) => ret.marketplace_orders?.marketplace?.toUpperCase() || '-',
        },
        {
            header: 'Alasan',
            accessorKey: 'reason',
            cell: (ret) => (
                <div className="max-w-xs truncate" title={ret.reason}>{ret.reason}</div>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (ret) => {
                const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-100 text-yellow-700',
                    picked_up: 'bg-blue-100 text-blue-700',
                    completed: 'bg-green-100 text-green-700',
                };
                const statusLabels: Record<string, string> = {
                    pending: 'Menunggu Pickup',
                    picked_up: 'Sudah Diambil',
                    completed: 'Selesai',
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ret.status]}`}>
                        {statusLabels[ret.status]}
                    </span>
                );
            },
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (ret) => format(new Date(ret.created_at), 'dd MMM yyyy', { locale: localeId }),
        },
        {
            header: 'Bukti',
            sortable: false,
            cell: (ret) => (
                <div className="flex items-center gap-2">
                    {ret.pickup_proof_url && (
                        <a href={ret.pickup_proof_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                            📷 Pickup
                        </a>
                    )}
                    {ret.return_proof_url && (
                        <a href={ret.return_proof_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                            📷 Return
                        </a>
                    )}
                    {!ret.pickup_proof_url && !ret.return_proof_url && '-'}
                </div>
            ),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (ret) => {
                if (ret.status === 'completed') {
                    return <span className="text-green-600 text-sm">✓ Selesai</span>;
                }
                if (ret.status === 'pending') {
                    return (
                        <Button size="sm" onClick={() => openUploadDialog(ret, 'pickup')} className="rounded-lg">
                            <Upload className="w-4 h-4 mr-1" />
                            Upload Bukti Pickup
                        </Button>
                    );
                }
                if (ret.status === 'picked_up') {
                    return (
                        <Button size="sm" onClick={() => openUploadDialog(ret, 'complete')} className="rounded-lg">
                            <Check className="w-4 h-4 mr-1" />
                            Selesaikan Return
                        </Button>
                    );
                }
                return null;
            },
        },
    ];

    if (isLoading) {
        return (
            <MainLayout title="Return Marketplace" subtitle="Kelola return pesanan marketplace">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Return Marketplace"
            subtitle="Kelola return pesanan marketplace"
        >
            <BeautifulTable
                data={returns}
                columns={columns}
                title="Daftar Return"
                hideSelection
                emptyState={{
                    icon: <RotateCcw className="w-10 h-10" />,
                    title: "Tidak Ada Return",
                    description: "Tidak ada return request saat ini.",
                }}
            />

            {/* Upload Proof Dialog */}
            <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {uploadType === 'pickup' ? (
                                <>
                                    <Image className="w-5 h-5" />
                                    Upload Bukti Pickup Ekspedisi
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    Upload Bukti Return Selesai
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <p className="text-sm text-muted-foreground">
                            {uploadType === 'pickup'
                                ? 'Upload foto/screenshot bukti bahwa barang sudah diambil ekspedisi untuk proses return.'
                                : 'Upload bukti bahwa return sudah selesai (refund/penggantian diterima).'}
                        </p>

                        <div className="space-y-2">
                            <Label>Pilih File Bukti</Label>
                            <Input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                            />
                            {proofFile && <p className="text-xs text-green-600">📎 {proofFile.name}</p>}
                        </div>

                        <Button
                            className="w-full"
                            disabled={!proofFile || updateReturn.isPending}
                            onClick={handleUploadProof}
                        >
                            {updateReturn.isPending ? 'Mengupload...' : (
                                uploadType === 'pickup' ? 'Simpan Bukti Pickup' : 'Selesaikan Return'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

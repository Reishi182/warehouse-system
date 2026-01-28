import { useState, useRef } from 'react';
import {
    AlertTriangle,
    Package,
    FileText,
    CheckCircle,
    Clock,
    Eye,
    Plus,
    Camera,
    X,
    Loader2,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
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
import { useAuth } from '@/contexts/AuthContext';
import {
    usePOsWithDiscrepancy,
    usePODiscrepancyStats,
    usePOClaims,
    useCreatePOClaim,
    useUpdatePOClaimStatus,
} from '@/hooks/usePODiscrepancies';
import { PurchaseOrder, POClaim, ClaimedItem, POClaimType, POClaimStatus, POReceiptWithDetails } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { compressImageToFile } from '@/lib/imageCompression';

export default function PODiscrepancyReport() {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('discrepancy');

    // Queries
    const { data: posWithDiscrepancy = [], isLoading: loadingPOs } = usePOsWithDiscrepancy();
    const { data: stats, isLoading: loadingStats } = usePODiscrepancyStats();
    const { data: allClaims = [] } = usePOClaims(); // For lookup in update status
    const { data: historyClaims = [], isLoading: loadingClaims } = usePOClaims(['resolved', 'rejected']); // History only

    // Mutations
    const createClaim = useCreatePOClaim();
    const updateClaimStatus = useUpdatePOClaimStatus();

    // Dialog states
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isClaimOpen, setIsClaimOpen] = useState(false);
    const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<(PurchaseOrder & { receipt: POReceiptWithDetails | null }) | null>(null);
    const [selectedClaim, setSelectedClaim] = useState<POClaim | null>(null);

    // Claim form state
    const [claimedItems, setClaimedItems] = useState<ClaimedItem[]>([]);
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
    const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    // Update status form state
    const [newStatus, setNewStatus] = useState<POClaimStatus>('in_progress');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolutionType, setResolutionType] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Open view dialog
    const handleViewPO = (po: PurchaseOrder & { receipt: POReceiptWithDetails | null }) => {
        setSelectedPO(po);
        setIsViewOpen(true);
    };

    // Open claim dialog
    const handleOpenClaimDialog = (po: PurchaseOrder & { receipt: POReceiptWithDetails | null }) => {
        setSelectedPO(po);

        // Pre-fill claimed items from receipt or PO items
        if (po.receipt?.discrepancy_details && po.receipt.discrepancy_details.length > 0) {
            // Try to enrich discrepancy_details with product_id from PO items if missing
            const enrichedItems = po.receipt.discrepancy_details.map(item => {
                if (item.product_id) return item;
                const matchingPoItem = po.items?.find(i => i.product_name === item.product_name);
                return {
                    ...item,
                    product_id: matchingPoItem?.product_id || null,
                };
            });
            setClaimedItems(enrichedItems);
        } else if (po.items) {
            // Build from PO items with receipt data
            const items: ClaimedItem[] = po.items.map(item => ({
                product_id: item.product_id || null,
                product_name: item.product_name,
                qty_ordered: item.quantity,
                qty_received: po.receipt?.total_received
                    ? Math.round((po.receipt.total_received / (po.receipt.total_ordered || 1)) * item.quantity)
                    : item.quantity,
                qty_damaged: 0,
                unit_price: item.unit_price,
            }));
            setClaimedItems(items);
        }

        setEvidenceFiles([]);
        setEvidencePreviews([]);
        setIsClaimOpen(true);
    };

    // Handle evidence file upload
    const handleEvidenceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newFiles: File[] = [];
        const newPreviews: string[] = [];

        for (const file of files) {
            try {
                const compressed = await compressImageToFile(file, {
                    maxWidth: 1200,
                    maxHeight: 1200,
                    quality: 0.8,
                });
                newFiles.push(compressed);

                const reader = new FileReader();
                reader.onloadend = () => {
                    newPreviews.push(reader.result as string);
                    if (newPreviews.length === files.length) {
                        setEvidencePreviews(prev => [...prev, ...newPreviews]);
                    }
                };
                reader.readAsDataURL(compressed);
            } catch {
                newFiles.push(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    newPreviews.push(reader.result as string);
                    if (newPreviews.length === files.length) {
                        setEvidencePreviews(prev => [...prev, ...newPreviews]);
                    }
                };
                reader.readAsDataURL(file);
            }
        }

        setEvidenceFiles(prev => [...prev, ...newFiles]);
    };

    // Remove evidence
    const removeEvidence = (index: number) => {
        setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
        setEvidencePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Determine claim type
    const getClaimType = (items: ClaimedItem[]): POClaimType => {
        const hasShortage = items.some(i => i.qty_received < i.qty_ordered);
        const hasDamaged = items.some(i => i.qty_damaged > 0);

        if (hasShortage && hasDamaged) return 'mixed';
        if (hasDamaged) return 'damaged';
        return 'shortage';
    };

    // Submit claim
    const handleSubmitClaim = async () => {
        if (!selectedPO || !user || !profile) return;

        setUploading(true);
        try {
            // Upload evidence files
            const evidenceUrls: string[] = [];
            for (const file of evidenceFiles) {
                const ext = file.name.split('.').pop();
                const fileName = `po_claims/${selectedPO.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from('uploads')
                    .upload(fileName, file);

                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
                    evidenceUrls.push(urlData.publicUrl);
                }
            }

            await createClaim.mutateAsync({
                purchaseOrderId: selectedPO.id,
                poReceiptId: selectedPO.receipt?.id,
                supplierId: selectedPO.supplier_id || undefined,
                claimType: getClaimType(claimedItems),
                claimedItems,
                evidenceUrls,
                createdBy: user.id,
                createdByName: profile.name,
            });

            setIsClaimOpen(false);
            setSelectedPO(null);
            setClaimedItems([]);
            setEvidenceFiles([]);
            setEvidencePreviews([]);
        } finally {
            setUploading(false);
        }
    };

    // Open update status dialog
    const handleOpenUpdateStatus = (claim: POClaim) => {
        setSelectedClaim(claim);
        setNewStatus(claim.status === 'pending' ? 'in_progress' : 'resolved');
        setResolutionNotes('');
        setResolutionType('');
        setIsUpdateStatusOpen(true);
    };

    // Submit status update
    const handleUpdateStatus = async () => {
        if (!selectedClaim || !user || !profile) return;

        await updateClaimStatus.mutateAsync({
            claimId: selectedClaim.id,
            status: newStatus,
            resolutionNotes: resolutionNotes || undefined,
            resolutionType: resolutionType || undefined,
            resolvedBy: user.id,
            resolvedByName: profile.name,
        });

        setIsUpdateStatusOpen(false);
        setSelectedClaim(null);
    };

    // Status badge helper
    const getStatusBadge = (status: POClaimStatus) => {
        const config = {
            pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
            in_progress: { label: 'Dalam Proses', variant: 'info' as const, icon: Loader2 },
            resolved: { label: 'Selesai', variant: 'success' as const, icon: CheckCircle },
            rejected: { label: 'Ditolak', variant: 'destructive' as const, icon: X },
        };
        const { label, variant, icon: Icon } = config[status] || config.pending;
        return (
            <Badge variant={variant} className="gap-1">
                <Icon className="w-3 h-3" />
                {label}
            </Badge>
        );
    };

    // Discrepancy table columns
    const discrepancyColumns: Column<PurchaseOrder & { receipt: POReceiptWithDetails | null }>[] = [
        {
            header: 'No. PO',
            accessorKey: 'po_number',
            cell: (po) => <span className="font-mono font-medium">{po.po_number}</span>,
        },
        {
            header: 'Supplier',
            accessorKey: 'supplier',
            cell: (po) => <span>{po.supplier?.name || '-'}</span>,
        },
        {
            header: 'Selisih',
            accessorKey: 'receipt',
            cell: (po) => {
                if (!po.receipt) return <span className="text-muted-foreground">-</span>;
                const shortage = po.receipt.total_ordered - po.receipt.total_received;
                return (
                    <div className="text-sm">
                        <span className="text-red-600 font-medium">-{shortage} unit</span>
                        {po.receipt.total_damaged > 0 && (
                            <span className="text-amber-600 ml-2">({po.receipt.total_damaged} rusak)</span>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Tanggal',
            accessorKey: 'updated_at',
            cell: (po) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(po.updated_at), 'dd MMM yyyy', { locale: localeId })}
                </span>
            ),
        },
        {
            header: 'Status Klaim',
            accessorKey: 'activeClaim',
            cell: (po: any) => {
                if (po.activeClaim) {
                    const statusConfig: Record<string, { label: string; variant: 'warning' | 'info' }> = {
                        pending: { label: 'Pending', variant: 'warning' },
                        in_progress: { label: 'Dalam Proses', variant: 'info' },
                    };
                    const config = statusConfig[po.activeClaim.status] || statusConfig.pending;
                    return (
                        <div className="flex flex-col gap-1">
                            <Badge variant={config.variant}>{config.label}</Badge>
                            <span className="text-xs text-muted-foreground font-mono">{po.activeClaim.claim_number}</span>
                        </div>
                    );
                }
                return <Badge variant="outline">Belum Diklaim</Badge>;
            },
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (po: any) => (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewPO(po)}>
                        <Eye className="w-4 h-4" />
                    </Button>
                    {!po.activeClaim ? (
                        <Button size="sm" onClick={() => handleOpenClaimDialog(po)} className="gap-1">
                            <Plus className="w-4 h-4" />
                            Klaim
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                // Find the claim and open update status
                                const claim = allClaims.find(c => c.id === po.activeClaim.id);
                                if (claim) handleOpenUpdateStatus(claim);
                            }}
                        >
                            Update
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    // Claims table columns
    const claimsColumns: Column<POClaim>[] = [
        {
            header: 'No. Klaim',
            accessorKey: 'claim_number',
            cell: (claim) => <span className="font-mono font-medium">{claim.claim_number}</span>,
        },
        {
            header: 'No. PO',
            accessorKey: 'purchase_order',
            cell: (claim) => <span className="font-mono">{claim.purchase_order?.po_number || '-'}</span>,
        },
        {
            header: 'Supplier',
            accessorKey: 'supplier',
            cell: (claim) => <span>{claim.supplier?.name || claim.purchase_order?.supplier?.name || '-'}</span>,
        },
        {
            header: 'Tipe',
            accessorKey: 'claim_type',
            cell: (claim) => {
                const labels = { shortage: 'Kurang', damaged: 'Rusak', mixed: 'Campuran' };
                return <Badge variant="outline">{labels[claim.claim_type]}</Badge>;
            },
        },
        {
            header: 'Nilai Klaim',
            accessorKey: 'total_claimed_amount',
            cell: (claim) => (
                <span className="font-semibold text-red-600">
                    Rp {claim.total_claimed_amount.toLocaleString('id-ID')}
                </span>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (claim) => getStatusBadge(claim.status),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (claim) => (
                <div className="flex items-center gap-2">
                    {claim.status !== 'resolved' && claim.status !== 'rejected' && (
                        <Button size="sm" variant="outline" onClick={() => handleOpenUpdateStatus(claim)}>
                            Update
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const isLoading = loadingPOs || loadingStats || loadingClaims;

    if (isLoading) {
        return (
            <MainLayout title="Selisih & Klaim PO" subtitle="Kelola PO dengan selisih dan klaim supplier">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Selisih & Klaim PO" subtitle="Kelola PO dengan selisih dan klaim ke supplier">
            <div className="space-y-6">
                {/* Stats */}
                <StatsGrid columns={4}>
                    <StatsCard
                        title="PO dengan Selisih"
                        value={stats?.discrepancyCount || 0}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        subtitle="Perlu ditindaklanjuti"
                        trend="warning"
                    />
                    <StatsCard
                        title="Klaim Pending"
                        value={stats?.pendingClaimsCount || 0}
                        icon={<Clock className="w-5 h-5" />}
                        subtitle="Menunggu proses"
                    />
                    <StatsCard
                        title="Klaim Selesai"
                        value={stats?.resolvedClaimsCount || 0}
                        icon={<CheckCircle className="w-5 h-5" />}
                        subtitle="Diselesaikan"
                        trend="success"
                    />
                    <StatsCard
                        title="Nilai Pending"
                        value={`Rp ${(stats?.totalPendingAmount || 0).toLocaleString('id-ID')}`}
                        icon={<FileText className="w-5 h-5" />}
                        subtitle="Total klaim aktif"
                    />
                </StatsGrid>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="discrepancy" className="gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            PO Selisih ({posWithDiscrepancy.length})
                        </TabsTrigger>
                        <TabsTrigger value="claims" className="gap-2">
                            <FileText className="w-4 h-4" />
                            Daftar Klaim ({historyClaims.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="discrepancy" className="mt-4">
                        <BeautifulTable
                            data={posWithDiscrepancy}
                            columns={discrepancyColumns}
                            title="PO dengan Selisih"
                            hideSelection
                            emptyState={{
                                icon: <Package className="w-10 h-10" />,
                                title: 'Tidak Ada Selisih',
                                description: 'Semua penerimaan PO sesuai dengan pesanan.',
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="claims" className="mt-4">
                        <BeautifulTable
                            data={historyClaims}
                            columns={claimsColumns}
                            title="Daftar Klaim Supplier"
                            hideSelection
                            emptyState={{
                                icon: <FileText className="w-10 h-10" />,
                                title: 'Belum Ada Klaim',
                                description: 'Buat klaim dari tab PO Selisih.',
                            }}
                        />
                    </TabsContent>
                </Tabs>

                {/* View PO Dialog */}
                <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Detail PO dengan Selisih</DialogTitle>
                        </DialogHeader>
                        {selectedPO && (
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

                                {selectedPO.receipt && (
                                    <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base text-red-700 dark:text-red-300 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Detail Selisih
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Dipesan</p>
                                                    <p className="font-bold text-lg">{selectedPO.receipt.total_ordered} unit</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Diterima</p>
                                                    <p className="font-bold text-lg text-amber-600">{selectedPO.receipt.total_received} unit</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Rusak</p>
                                                    <p className="font-bold text-lg text-red-600">{selectedPO.receipt.total_damaged} unit</p>
                                                </div>
                                            </div>
                                            {selectedPO.receipt.notes && (
                                                <p className="mt-3 text-sm text-muted-foreground">
                                                    <strong>Catatan:</strong> {selectedPO.receipt.notes}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                <div className="flex gap-3 justify-end pt-4">
                                    <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                                        Tutup
                                    </Button>
                                    {!selectedPO.has_claim && (
                                        <Button
                                            onClick={() => {
                                                setIsViewOpen(false);
                                                handleOpenClaimDialog(selectedPO);
                                            }}
                                            className="gap-1"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Buat Klaim
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Create Claim Dialog */}
                <Dialog open={isClaimOpen} onOpenChange={setIsClaimOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Buat Klaim Supplier
                            </DialogTitle>
                            <DialogDescription>
                                PO: {selectedPO?.po_number} - {selectedPO?.supplier?.name}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                            {/* Claimed Items */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Detail Item yang Diklaim</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {claimedItems.map((item, idx) => {
                                        const shortage = item.qty_ordered - item.qty_received;
                                        const hasIssue = shortage > 0 || item.qty_damaged > 0;
                                        if (!hasIssue) return null;

                                        const claimValue = (shortage + item.qty_damaged) * item.unit_price;

                                        return (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{item.product_name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Dipesan: {item.qty_ordered} | Diterima: {item.qty_received}
                                                            {item.qty_damaged > 0 && ` | Rusak: ${item.qty_damaged}`}
                                                        </p>
                                                    </div>
                                                    <Badge variant="destructive">
                                                        Rp {claimValue.toLocaleString('id-ID')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            {/* Evidence Upload */}
                            <div className="space-y-2">
                                <Label>Bukti Foto (Opsional)</Label>
                                <div className="border-2 border-dashed rounded-lg p-4">
                                    {evidencePreviews.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {evidencePreviews.map((preview, idx) => (
                                                <div key={idx} className="relative">
                                                    <img src={preview} alt={`Evidence ${idx + 1}`} className="rounded-lg h-24 w-full object-cover" />
                                                    <button
                                                        onClick={() => removeEvidence(idx)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <label className="border-2 border-dashed rounded-lg h-24 flex items-center justify-center cursor-pointer hover:bg-muted/50">
                                                <Plus className="w-6 h-6 text-muted-foreground" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={handleEvidenceChange}
                                                    ref={fileInputRef}
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer block">
                                            <div className="flex flex-col items-center gap-2 py-4">
                                                <Camera className="w-8 h-8 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Klik untuk upload foto bukti</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleEvidenceChange}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="p-4 bg-muted rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Total Nilai Klaim</span>
                                    <span className="text-xl font-bold text-red-600">
                                        Rp {claimedItems.reduce((sum, item) => {
                                            const shortage = item.qty_ordered - item.qty_received;
                                            return sum + ((shortage + item.qty_damaged) * item.unit_price);
                                        }, 0).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
                                <Button variant="outline" onClick={() => setIsClaimOpen(false)}>
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleSubmitClaim}
                                    disabled={createClaim.isPending || uploading}
                                    className="gap-1"
                                >
                                    {createClaim.isPending || uploading ? 'Memproses...' : 'Ajukan Klaim'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Update Status Dialog */}
                <Dialog open={isUpdateStatusOpen} onOpenChange={setIsUpdateStatusOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Status Klaim</DialogTitle>
                            <DialogDescription>
                                Klaim: {selectedClaim?.claim_number}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Status Baru</Label>
                                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as POClaimStatus)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in_progress">Dalam Proses</SelectItem>
                                        <SelectItem value="resolved">Selesai</SelectItem>
                                        <SelectItem value="rejected">Ditolak</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {(newStatus === 'resolved' || newStatus === 'rejected') && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Tipe Resolusi</Label>
                                        <Select value={resolutionType} onValueChange={setResolutionType}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih tipe resolusi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="refund">Refund/Pengembalian Dana</SelectItem>
                                                <SelectItem value="replacement">Penggantian Barang</SelectItem>
                                                <SelectItem value="credit">Kredit/Potongan</SelectItem>
                                                <SelectItem value="rejected">Klaim Ditolak</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Catatan Resolusi</Label>
                                        <Textarea
                                            value={resolutionNotes}
                                            onChange={(e) => setResolutionNotes(e.target.value)}
                                            placeholder="Jelaskan hasil resolusi klaim..."
                                            rows={3}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 justify-end pt-4">
                                <Button variant="outline" onClick={() => setIsUpdateStatusOpen(false)}>
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleUpdateStatus}
                                    disabled={updateClaimStatus.isPending}
                                >
                                    {updateClaimStatus.isPending ? 'Memproses...' : 'Update Status'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}

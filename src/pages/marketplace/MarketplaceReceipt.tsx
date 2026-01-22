import { useState, useMemo } from 'react';
import { Package, Check, AlertTriangle, PenTool } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { usePendingMarketplaceOrders, useReceiveMarketplaceOrder, useCreateMarketplaceReturn } from '@/hooks/useMarketplaceOrders';
import { MarketplaceOrder, MarketplaceOrderItem } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import SignatureCanvas from '@/components/common/SignatureCanvas';

interface ReceiptItem {
    id: string;
    productName: string;
    quantityOrdered: number;
    quantityReceived: number;
    quantityDamaged: number;
    damageNotes: string;
}

export default function MarketplaceReceipt() {
    const role = useRole();
    const { user, profile } = useAuth();
    const { toast } = useToast();

    const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);
    const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
    const [signature, setSignature] = useState<string>('');
    const [showReturnDialog, setShowReturnDialog] = useState(false);
    const [returnReason, setReturnReason] = useState('');

    // Determine destination based on role
    const destination = role === 'warehouse' ? 'gudang' : 'toko';

    // Hooks
    const { data: pendingOrders = [], isLoading } = usePendingMarketplaceOrders(destination as 'gudang' | 'toko');
    const receiveOrder = useReceiveMarketplaceOrder();
    const createReturn = useCreateMarketplaceReturn();

    const openReceiptDialog = (order: MarketplaceOrder) => {
        setSelectedOrder(order);
        // Initialize receipt items from order items
        setReceiptItems(
            (order.items || []).map(item => ({
                id: item.id,
                productName: item.product_name,
                quantityOrdered: item.quantity_ordered,
                quantityReceived: item.quantity_ordered, // Default: all received
                quantityDamaged: 0,
                damageNotes: '',
            }))
        );
        setSignature('');
    };

    const updateItem = (id: string, field: keyof ReceiptItem, value: number | string) => {
        setReceiptItems(items =>
            items.map(item => {
                if (item.id !== id) return item;

                const updated = { ...item, [field]: value };

                // Auto-adjust: damaged can't exceed received
                if (field === 'quantityReceived' && typeof value === 'number') {
                    if (updated.quantityDamaged > value) {
                        updated.quantityDamaged = value;
                    }
                }
                if (field === 'quantityDamaged' && typeof value === 'number') {
                    if (value > updated.quantityReceived) {
                        updated.quantityDamaged = updated.quantityReceived;
                    }
                }

                return updated;
            })
        );
    };

    const handleSubmitReceipt = async () => {
        if (!selectedOrder) return;

        if (!signature) {
            toast({ title: 'Tanda tangan diperlukan', variant: 'destructive' });
            return;
        }

        // Upload signature
        let signatureUrl: string | undefined;
        try {
            const base64Data = signature.split(',')[1];
            const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());
            const fileName = `signatures/marketplace-${selectedOrder.id}-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, blob);

            if (!uploadError) {
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
                signatureUrl = urlData.publicUrl;
            }
        } catch (e) {
            console.error('Signature upload failed', e);
        }

        await receiveOrder.mutateAsync({
            orderId: selectedOrder.id,
            receivedBy: user?.id || '',
            receivedByName: profile?.name || '',
            signatureUrl,
            items: receiptItems.map(item => ({
                id: item.id,
                quantityReceived: item.quantityReceived,
                quantityDamaged: item.quantityDamaged,
                damageNotes: item.damageNotes || undefined,
            })),
        });

        // Check if there are damaged items
        const hasDamaged = receiptItems.some(item => item.quantityDamaged > 0);
        if (hasDamaged) {
            setShowReturnDialog(true);
        } else {
            setSelectedOrder(null);
        }
    };

    const handleCreateReturn = async () => {
        if (!selectedOrder || !returnReason.trim()) {
            toast({ title: 'Alasan return wajib diisi', variant: 'destructive' });
            return;
        }

        const damagedItems = receiptItems.filter(item => item.quantityDamaged > 0).map(item => ({
            productName: item.productName,
            quantityDamaged: item.quantityDamaged,
            notes: item.damageNotes,
        }));

        await createReturn.mutateAsync({
            orderId: selectedOrder.id,
            reason: returnReason,
            itemsJson: damagedItems,
            createdBy: user?.id || '',
            createdByName: profile?.name || '',
        });

        setShowReturnDialog(false);
        setSelectedOrder(null);
        setReturnReason('');
    };

    // Table columns
    const columns: Column<MarketplaceOrder>[] = [
        {
            header: 'No. Pesanan',
            accessorKey: 'order_number',
            cell: (order) => <span className="font-semibold">{order.order_number}</span>,
        },
        {
            header: 'Marketplace',
            accessorKey: 'marketplace',
            cell: (order) => order.marketplace.toUpperCase(),
        },
        {
            header: 'Items',
            accessorKey: 'items',
            cell: (order) => (
                <div className="text-sm">
                    {order.items?.slice(0, 2).map((item, i) => (
                        <div key={i}>{item.product_name} x{item.quantity_ordered}</div>
                    ))}
                    {(order.items?.length || 0) > 2 && (
                        <span className="text-muted-foreground">+{(order.items?.length || 0) - 2} lainnya</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            cell: (order) => `Rp ${order.total_amount.toLocaleString('id-ID')}`,
        },
        {
            header: 'Tanggal Order',
            accessorKey: 'created_at',
            cell: (order) => format(new Date(order.created_at), 'dd MMM yyyy', { locale: localeId }),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (order) => (
                <Button onClick={() => openReceiptDialog(order)} className="rounded-lg">
                    <Package className="w-4 h-4 mr-2" />
                    Terima Barang
                </Button>
            ),
        },
    ];

    const hasDiscrepancy = useMemo(() => {
        return receiptItems.some(item =>
            item.quantityReceived !== item.quantityOrdered || item.quantityDamaged > 0
        );
    }, [receiptItems]);

    if (isLoading) {
        return (
            <MainLayout title="Penerimaan Marketplace" subtitle="Terima barang dari marketplace">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Penerimaan Marketplace"
            subtitle={`Terima barang tujuan ${destination === 'gudang' ? 'Gudang' : 'Toko'}`}
        >
            <BeautifulTable
                data={pendingOrders}
                columns={columns}
                title="Pesanan Menunggu Diterima"
                hideSelection
                emptyState={{
                    icon: <Package className="w-10 h-10" />,
                    title: "Tidak Ada Pesanan",
                    description: "Tidak ada pesanan marketplace yang perlu diterima saat ini.",
                }}
            />

            {/* Receipt Dialog */}
            <Dialog open={!!selectedOrder && !showReturnDialog} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Penerimaan: {selectedOrder?.order_number}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 mt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Marketplace:</span>
                                <span className="ml-2 font-medium">{selectedOrder?.marketplace.toUpperCase()}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Total:</span>
                                <span className="ml-2 font-medium">Rp {selectedOrder?.total_amount.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {/* Items Receipt */}
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="text-left p-3">Produk</th>
                                        <th className="text-center p-3">Dipesan</th>
                                        <th className="text-center p-3">Diterima</th>
                                        <th className="text-center p-3">Rusak</th>
                                        <th className="text-left p-3">Catatan Kerusakan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receiptItems.map(item => (
                                        <tr key={item.id} className="border-t">
                                            <td className="p-3 font-medium">{item.productName}</td>
                                            <td className="text-center p-3">{item.quantityOrdered}</td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={item.quantityOrdered}
                                                    value={item.quantityReceived}
                                                    onChange={(e) => updateItem(item.id, 'quantityReceived', parseInt(e.target.value) || 0)}
                                                    className="w-20 text-center mx-auto"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={item.quantityReceived}
                                                    value={item.quantityDamaged}
                                                    onChange={(e) => updateItem(item.id, 'quantityDamaged', parseInt(e.target.value) || 0)}
                                                    className="w-20 text-center mx-auto"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    value={item.damageNotes}
                                                    onChange={(e) => updateItem(item.id, 'damageNotes', e.target.value)}
                                                    placeholder="Keterangan rusak..."
                                                    disabled={item.quantityDamaged === 0}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Discrepancy Warning */}
                        {hasDiscrepancy && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Ada perbedaan jumlah/kerusakan
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                                    Setelah konfirmasi, Anda dapat membuat return request untuk item rusak.
                                </p>
                            </div>
                        )}

                        {/* Signature */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <PenTool className="w-4 h-4" />
                                    Tanda Tangan Penerima
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SignatureCanvas
                                    onSave={setSignature}
                                    width={400}
                                    height={150}
                                />
                            </CardContent>
                        </Card>

                        <Button
                            className="w-full"
                            size="lg"
                            disabled={!signature || receiveOrder.isPending}
                            onClick={handleSubmitReceipt}
                        >
                            {receiveOrder.isPending ? 'Menyimpan...' : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Konfirmasi Penerimaan
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Return Dialog */}
            <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Buat Return Request
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <p className="text-sm text-muted-foreground">
                            Ada {receiptItems.filter(i => i.quantityDamaged > 0).length} item dengan kerusakan.
                            Apakah Anda ingin membuat return request?
                        </p>

                        <div className="space-y-2">
                            <Label>Alasan Return</Label>
                            <Textarea
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                                placeholder="Jelaskan alasan return..."
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowReturnDialog(false);
                                    setSelectedOrder(null);
                                }}
                                className="flex-1"
                            >
                                Lewati
                            </Button>
                            <Button
                                onClick={handleCreateReturn}
                                disabled={!returnReason.trim() || createReturn.isPending}
                                className="flex-1"
                            >
                                {createReturn.isPending ? 'Menyimpan...' : 'Buat Return'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

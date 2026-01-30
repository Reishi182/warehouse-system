import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';

interface CreatePOInput {
    supplierId: string;
    destination: 'gudang' | 'toko';
    notes?: string;
    createdBy: string;
    createdByName: string;
    customNumber?: string;
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        isNewProduct?: boolean;
        barcode?: string;
        unit?: string;
    }>;
}

export function useCreatePurchaseOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: CreatePOInput) => {
            let poNumber = input.customNumber?.trim();

            if (!poNumber) {
                const { data: poNumberData, error: poNumError } = await supabase
                    .rpc('generate_po_number');

                if (poNumError) {
                    const now = new Date();
                    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
                    poNumber = `PO-${dateStr}-${randomNum}`;
                } else {
                    poNumber = poNumberData;
                }
            }

            const totalAmount = input.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .insert([{
                    po_number: poNumber,
                    supplier_id: input.supplierId,
                    destination: input.destination,
                    status: 'pending_receipt',
                    total_amount: totalAmount,
                    notes: input.notes || null,
                    created_by: input.createdBy,
                    created_by_name: input.createdByName,
                }])
                .select()
                .single();

            if (poError) throw poError;

            const itemsToInsert = input.items.map(item => ({
                purchase_order_id: po.id,
                product_id: item.productId || null, // Send null for new products (empty string is invalid UUID)
                product_name: item.productName,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                total_price: item.quantity * item.unitPrice,
            }));

            const { error: itemsError } = await supabase
                .from('purchase_order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return po;
        },
        onSuccess: (po) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil dibuat',
            });

            sendNotificationToRole('warehouse', {
                title: 'PO Baru Siap Diterima',
                message: `Purchase Order ${po.po_number} siap untuk penerimaan barang`,
                type: 'info',
                link: '/purchase-orders/receipt',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

interface ApprovePOInput {
    poId: string;
    auditorId: string;
    auditorName: string;
}

export function useApprovePurchaseOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: ApprovePOInput) => {
            const { data: po } = await supabase
                .from('purchase_orders')
                .select('po_number, created_by')
                .eq('id', input.poId)
                .single();

            const { error } = await supabase
                .from('purchase_orders')
                .update({
                    status: 'pending_receipt',
                    auditor_id: input.auditorId,
                    auditor_name: input.auditorName,
                    auditor_action_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.poId);

            if (error) throw error;
            return po;
        },
        onSuccess: (po) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil diapprove',
            });

            sendNotificationToRole('main_office', {
                title: 'PO Disetujui',
                message: `Purchase Order ${po?.po_number} telah disetujui, menunggu penerimaan barang`,
                type: 'success',
                link: '/purchase-orders',
            });

            if (po?.created_by) {
                sendNotificationToUser(po.created_by, {
                    title: 'PO Disetujui',
                    message: `Purchase Order ${po?.po_number} telah disetujui`,
                    type: 'success',
                    link: '/purchase-orders',
                });
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

interface RejectPOInput {
    poId: string;
    auditorId: string;
    auditorName: string;
    reason: string;
}

export function useRejectPurchaseOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: RejectPOInput) => {
            const { data: po } = await supabase
                .from('purchase_orders')
                .select('po_number, created_by')
                .eq('id', input.poId)
                .single();

            const { error } = await supabase
                .from('purchase_orders')
                .update({
                    status: 'rejected',
                    auditor_id: input.auditorId,
                    auditor_name: input.auditorName,
                    auditor_action_at: new Date().toISOString(),
                    rejected_reason: input.reason,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.poId);

            if (error) throw error;
            return po;
        },
        onSuccess: (po) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil ditolak',
            });

            sendNotificationToRole('main_office', {
                title: 'PO Ditolak',
                message: `Purchase Order ${po?.po_number} ditolak oleh Auditor`,
                type: 'error',
                link: '/purchase-orders',
            });

            if (po?.created_by) {
                sendNotificationToUser(po.created_by, {
                    title: 'PO Ditolak',
                    message: `Purchase Order ${po?.po_number} telah ditolak`,
                    type: 'error',
                    link: '/purchase-orders',
                });
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

interface ConfirmReceiptInput {
    poId: string;
    receivedBy: string;
    receivedByName: string;
    receivedItems: Array<{
        itemId: string;
        productId: string;
        productName: string;
        orderedQty: number;
        receivedQty: number;
        damagedQty: number;
    }>;
    photoUrl?: string;
    signatureUrl?: string;
    notes?: string;
}

export function useConfirmPOReceipt() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: ConfirmReceiptInput) => {
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .select('*, items:purchase_order_items(*)')
                .eq('id', input.poId)
                .single();

            if (poError) throw poError;

            let totalOrdered = 0;
            let totalReceived = 0;
            let totalDamaged = 0;
            const discrepancyItems: string[] = [];

            for (const item of input.receivedItems) {
                totalOrdered += item.orderedQty;
                totalReceived += item.receivedQty;
                totalDamaged += item.damagedQty;

                const shortage = item.orderedQty - item.receivedQty;
                if (shortage > 0 || item.damagedQty > 0) {
                    discrepancyItems.push(
                        `${item.productName}: Dipesan ${item.orderedQty}, ` +
                        `Diterima ${item.receivedQty}` +
                        (item.damagedQty > 0 ? `, Rusak ${item.damagedQty}` : '')
                    );
                }
            }

            const hasDiscrepancy = totalReceived < totalOrdered || totalDamaged > 0;

            const { error: receiptError } = await supabase
                .from('po_receipts')
                .insert([{
                    purchase_order_id: input.poId,
                    received_by: input.receivedBy,
                    received_by_name: input.receivedByName,
                    photo_url: input.photoUrl || null,
                    signature_url: input.signatureUrl || null,
                    notes: input.notes || null,
                    has_discrepancy: hasDiscrepancy,
                    total_ordered: totalOrdered,
                    total_received: totalReceived,
                    total_damaged: totalDamaged,
                }]);

            if (receiptError) throw receiptError;

            const destination = po.destination as 'gudang' | 'toko';
            for (const item of input.receivedItems) {
                if (!item.productId || item.receivedQty <= 0) continue;

                const { data: product, error: prodError } = await supabase
                    .from('products')
                    .select('stock_gudang, stock_toko')
                    .eq('id', item.productId)
                    .single();

                if (prodError) continue;

                const stockField = destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                const currentStock = destination === 'gudang' ? (product.stock_gudang || 0) : (product.stock_toko || 0);
                const newStock = currentStock + item.receivedQty;

                await supabase
                    .from('products')
                    .update({ [stockField]: newStock })
                    .eq('id', item.productId);

                const noteDetails = item.receivedQty < item.orderedQty
                    ? `Penerimaan PO: ${po.po_number} (Selisih: ${item.orderedQty - item.receivedQty})`
                    : `Penerimaan PO: ${po.po_number}`;

                await supabase.from('stock_logs').insert([{
                    product_id: item.productId,
                    type: 'in',
                    quantity: item.receivedQty,
                    location: destination,
                    user_id: input.receivedBy,
                    note: noteDetails,
                }]);
            }

            const { error: updateError } = await supabase
                .from('purchase_orders')
                .update({
                    status: hasDiscrepancy ? 'completed_with_discrepancy' : 'completed',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.poId);

            if (updateError) throw updateError;

            if (hasDiscrepancy) {
                const discrepancyMessage =
                    `PO ${po.po_number}: Dipesan ${totalOrdered} unit, Diterima ${totalReceived} unit` +
                    (totalDamaged > 0 ? `, Rusak ${totalDamaged} unit` : '') +
                    `. Perlu follow-up dengan supplier.`;

                await sendNotificationToRole(['main_office', 'auditor'], {
                    title: `⚠️ Selisih Penerimaan PO`,
                    message: discrepancyMessage,
                    type: 'warning',
                    link: '/purchase-orders',
                });
            }

            return { po, hasDiscrepancy, discrepancyItems };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });

            if (result.hasDiscrepancy) {
                toast({
                    title: '⚠️ Penerimaan dengan Selisih',
                    description: 'Stok diperbarui. Main Office dan Auditor telah dinotifikasi.',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Berhasil',
                    description: 'Penerimaan barang berhasil dikonfirmasi dan stok telah diperbarui',
                });
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Cancel Purchase Order
interface CancelPOInput {
    poId: string;
    cancelledBy: string;
    cancelledByName: string;
    reason?: string;
}

export function useCancelPurchaseOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: CancelPOInput) => {
            // Get PO details first
            const { data: po, error: fetchError } = await supabase
                .from('purchase_orders')
                .select('po_number, status, created_by')
                .eq('id', input.poId)
                .single();

            if (fetchError) throw fetchError;

            // Only allow cancellation for pending_receipt or pending_auditor status
            if (!['pending_receipt', 'pending_auditor', 'approved'].includes(po.status)) {
                throw new Error('PO yang sudah selesai atau dibatalkan tidak dapat dibatalkan lagi');
            }

            const { error } = await supabase
                .from('purchase_orders')
                .update({
                    status: 'cancelled',
                    cancelled_by: input.cancelledBy,
                    cancelled_by_name: input.cancelledByName,
                    cancelled_at: new Date().toISOString(),
                    cancelled_reason: input.reason || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.poId);

            if (error) throw error;
            return po;
        },
        onSuccess: (po) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'PO Dibatalkan',
                description: `Purchase Order ${po?.po_number} berhasil dibatalkan`,
            });

            // Notify relevant parties
            if (po?.created_by) {
                sendNotificationToUser(po.created_by, {
                    title: 'PO Dibatalkan',
                    message: `Purchase Order ${po?.po_number} telah dibatalkan`,
                    type: 'warning',
                    link: '/purchase-orders',
                });
            }

            sendNotificationToRole('warehouse', {
                title: 'PO Dibatalkan',
                message: `Purchase Order ${po?.po_number} telah dibatalkan`,
                type: 'warning',
                link: '/purchase-orders',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

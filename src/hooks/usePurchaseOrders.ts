import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PurchaseOrder, PurchaseOrderItem, POStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';

// Fetch all purchase orders with supplier info
export function usePurchaseOrders(statusFilter?: POStatus | POStatus[]) {
    return useQuery({
        queryKey: ['purchase_orders', statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('purchase_orders')
                .select(`
          *,
          supplier:suppliers(*)
        `)
                .order('created_at', { ascending: false });

            if (statusFilter) {
                if (Array.isArray(statusFilter)) {
                    query = query.in('status', statusFilter);
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as PurchaseOrder[];
        },
    });
}

// Fetch single PO with items
export function usePurchaseOrder(id: string) {
    return useQuery({
        queryKey: ['purchase_order', id],
        queryFn: async () => {
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .select(`
          *,
          supplier:suppliers(*)
        `)
                .eq('id', id)
                .single();

            if (poError) throw poError;

            const { data: items, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('*')
                .eq('purchase_order_id', id);

            if (itemsError) throw itemsError;

            return { ...po, items } as PurchaseOrder;
        },
        enabled: !!id,
    });
}

// Fetch POs pending receipt for specific destination
export function usePendingReceiptPOs(destination: 'gudang' | 'toko') {
    return useQuery({
        queryKey: ['purchase_orders', 'pending_receipt', destination],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
          *,
          supplier:suppliers(*)
        `)
                .eq('status', 'pending_receipt')
                .eq('destination', destination)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch items for each PO
            const posWithItems = await Promise.all(
                (data || []).map(async (po) => {
                    const { data: items } = await supabase
                        .from('purchase_order_items')
                        .select('*')
                        .eq('purchase_order_id', po.id);
                    return { ...po, items: items || [] };
                })
            );

            return posWithItems as PurchaseOrder[];
        },
    });
}

interface CreatePOInput {
    supplierId: string;
    destination: 'gudang' | 'toko';
    notes?: string;
    createdBy: string;
    createdByName: string;
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
    }>;
}

export function useCreatePurchaseOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: CreatePOInput) => {
            // Generate PO number
            const { data: poNumberData, error: poNumError } = await supabase
                .rpc('generate_po_number');

            if (poNumError) {
                // Fallback: generate simple PO number
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
                var poNumber = `PO-${dateStr}-${randomNum}`;
            } else {
                var poNumber = poNumberData;
            }

            // Calculate total
            const totalAmount = input.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

            // Create PO
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .insert([{
                    po_number: poNumber,
                    supplier_id: input.supplierId,
                    destination: input.destination,
                    status: 'pending_auditor',
                    total_amount: totalAmount,
                    notes: input.notes || null,
                    created_by: input.createdBy,
                    created_by_name: input.createdByName,
                }])
                .select()
                .single();

            if (poError) throw poError;

            // Create items
            const itemsToInsert = input.items.map(item => ({
                purchase_order_id: po.id,
                product_id: item.productId,
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

            // Notify auditors about new PO
            sendNotificationToRole('auditor', {
                title: 'PO Baru Menunggu Approval',
                message: `Purchase Order ${po.po_number} membutuhkan persetujuan Anda`,
                type: 'info',
                link: '/purchase-orders/auditor',
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
            // Get PO details first for notification
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

            // Notify main_office about approval
            sendNotificationToRole('main_office', {
                title: 'PO Disetujui',
                message: `Purchase Order ${po?.po_number} telah disetujui, menunggu penerimaan barang`,
                type: 'success',
                link: '/purchase-orders',
            });

            // Also notify the creator if exists
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
            // Get PO details first for notification
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

            // Notify main_office about rejection
            sendNotificationToRole('main_office', {
                title: 'PO Ditolak',
                message: `Purchase Order ${po?.po_number} ditolak oleh Auditor`,
                type: 'error',
                link: '/purchase-orders',
            });

            // Also notify the creator if exists
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
            // Get PO details
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .select('*, items:purchase_order_items(*)')
                .eq('id', input.poId)
                .single();

            if (poError) throw poError;

            // Calculate discrepancy
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

            // Create receipt record with discrepancy info
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

            // Update stock for each item (only received qty, not ordered)
            const destination = po.destination as 'gudang' | 'toko';
            for (const item of input.receivedItems) {
                if (!item.productId || item.receivedQty <= 0) continue;

                // Get current stock
                const { data: product, error: prodError } = await supabase
                    .from('products')
                    .select('stock_gudang, stock_toko')
                    .eq('id', item.productId)
                    .single();

                if (prodError) continue;

                // Only add RECEIVED quantity (not ordered)
                const stockField = destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                const currentStock = destination === 'gudang' ? (product.stock_gudang || 0) : (product.stock_toko || 0);
                const newStock = currentStock + item.receivedQty;

                await supabase
                    .from('products')
                    .update({ [stockField]: newStock })
                    .eq('id', item.productId);

                // Log stock change
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

            // Update PO status
            const { error: updateError } = await supabase
                .from('purchase_orders')
                .update({
                    status: hasDiscrepancy ? 'completed_with_discrepancy' : 'completed',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.poId);

            if (updateError) throw updateError;

            // If discrepancy, notify main_office and auditor
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


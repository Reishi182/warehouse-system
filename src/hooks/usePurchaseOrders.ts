import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PurchaseOrder, PurchaseOrderItem, POStatus, POReceiptWithDetails } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';

/**
 * Hook to subscribe to real-time changes on purchase_orders table.
 * This will automatically invalidate and refetch PO data when changes occur.
 */
export function usePurchaseOrdersRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel('purchase_orders_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'purchase_orders',
                },
                (payload) => {
                    console.log('PO Realtime change detected:', payload.eventType);
                    // Invalidate all purchase_orders queries to refetch data
                    queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
                    queryClient.invalidateQueries({ queryKey: ['purchase_order'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
}

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
    poDate: string; // PO date in YYYY-MM-DD format
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
            // Generate PO number based on selected date
            const poDate = input.poDate; // YYYY-MM-DD format
            let poNumber: string;

            const { data: poNumberData, error: poNumError } = await supabase
                .rpc('generate_po_number', { p_date: poDate });

            if (poNumError) {
                // Fallback: generate PO number client-side with DDMMYYYY format
                const [year, month, day] = poDate.split('-');
                const dateStr = `${day}${month}${year}`;
                const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
                poNumber = `PO-${dateStr}-${randomNum}`;
            } else {
                poNumber = poNumberData;
            }

            // Calculate total
            const totalAmount = input.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

            // Create PO
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .insert([{
                    po_number: poNumber,
                    po_date: poDate,
                    supplier_id: input.supplierId || null,
                    destination: input.destination,
                    status: 'pending_receipt',
                    total_amount: totalAmount,
                    notes: input.notes || null,
                    created_by: input.createdBy || null,
                    created_by_name: input.createdByName,
                }])
                .select()
                .single();

            if (poError) throw poError;

            // Create items
            const itemsToInsert = input.items.map(item => ({
                purchase_order_id: po.id,
                product_id: item.productId || null, // Send null for new products (empty string is invalid UUID)
                product_name: item.productName,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                total_price: item.quantity * item.unitPrice,
                barcode: item.barcode || null,
                unit: item.unit || 'pcs',
                is_new_product: item.isNewProduct || false,
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

            // Notify cashier & warehouse that a new PO has been created
            sendNotificationToRole(['cashier', 'warehouse'], {
                title: '📦 PO Baru Dibuat',
                message: `Purchase Order ${po.po_number} telah dibuat, menunggu penerimaan barang`,
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
        onSuccess: (po, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil diapprove',
            });

            // Notify warehouse that PO is approved and ready for receipt
            sendNotificationToRole('warehouse', {
                title: 'PO Disetujui',
                message: `Purchase Order ${po?.po_number} telah disetujui, siap untuk penerimaan barang`,
                type: 'success',
                link: '/purchase-orders/receipt',
            });

            // Also notify the creator if they are NOT the approver (avoid double toast)
            if (po?.created_by && po.created_by !== variables.auditorId) {
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
        onSuccess: (po, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil ditolak',
            });

            // Only notify the creator if they are NOT the rejector (avoid double toast)
            // No need to broadcast to all main_office - only the relevant person needs to know
            if (po?.created_by && po.created_by !== variables.auditorId) {
                sendNotificationToUser(po.created_by, {
                    title: 'PO Ditolak',
                    message: `Purchase Order ${po?.po_number} telah ditolak: ${variables.reason}`,
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
        barcode?: string;
        unit?: string;
        unitPrice?: number;
        isNewProduct?: boolean;
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
                if (item.receivedQty <= 0) continue;

                let productId = item.productId;

                // If productId is empty, create a new product
                if (!productId && item.productName) {
                    // Generate barcode if not provided
                    const barcode = item.barcode || `NEW-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

                    const newProductData: Record<string, any> = {
                        name: item.productName,
                        barcode: barcode,
                        price: item.unitPrice || 0,
                        stock_gudang: 0,
                        stock_toko: 0,
                    };

                    const { data: newProduct, error: createError } = await supabase
                        .from('products')
                        .insert([newProductData])
                        .select()
                        .single();

                    if (createError) {
                        console.error('Error creating new product:', createError);
                        continue; // Skip this item if product creation fails
                    }

                    productId = newProduct.id;

                    // Update PO item with the new product_id
                    await supabase
                        .from('purchase_order_items')
                        .update({ product_id: productId })
                        .eq('id', item.itemId);
                }

                if (!productId) continue;

                // Get current stock
                const { data: product, error: prodError } = await supabase
                    .from('products')
                    .select('stock_gudang, stock_toko')
                    .eq('id', productId)
                    .single();

                if (prodError) continue;

                // Only add RECEIVED quantity (not ordered)
                const stockField = destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                const currentStock = destination === 'gudang' ? (product.stock_gudang || 0) : (product.stock_toko || 0);
                const newStock = currentStock + item.receivedQty;

                await supabase
                    .from('products')
                    .update({ [stockField]: newStock })
                    .eq('id', productId);

                // Log stock change
                const noteDetails = item.receivedQty < item.orderedQty
                    ? `Penerimaan PO: ${po.po_number} (Selisih: ${item.orderedQty - item.receivedQty})`
                    : `Penerimaan PO: ${po.po_number}`;

                await supabase.from('stock_logs').insert([{
                    product_id: productId,
                    type: 'in',
                    quantity: item.receivedQty,
                    location: destination,
                    user_id: input.receivedBy,
                    note: noteDetails,
                    stock_before: currentStock,
                    stock_after: newStock,
                    reference_type: 'purchase_order',
                    reference_id: input.poId,
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
        onSuccess: async (result) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['po_receipt'] });

            // Notify main_office about PO receipt completion
            sendNotificationToRole('main_office', {
                title: result.hasDiscrepancy ? '⚠️ PO Diterima dengan Selisih' : '✅ PO Diterima Lengkap',
                message: `PO ${result.po.po_number} telah diterima${result.hasDiscrepancy ? ' dengan selisih, perlu follow-up' : ' dengan lengkap'}`,
                type: result.hasDiscrepancy ? 'warning' : 'success',
                link: '/purchase-orders',
            });

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
        onSuccess: (po, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'PO Dibatalkan',
                description: `Purchase Order ${po?.po_number} berhasil dibatalkan`,
            });

            // Notify the creator only if they are NOT the one who cancelled
            // (to avoid double toast for the same user)
            if (po?.created_by && po.created_by !== variables.cancelledBy) {
                sendNotificationToUser(po.created_by, {
                    title: 'PO Dibatalkan',
                    message: `Purchase Order ${po?.po_number} telah dibatalkan`,
                    type: 'warning',
                    link: '/purchase-orders',
                });
            }

            // Note: Removed warehouse broadcast - they don't need to be notified about cancellations
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

// Fetch PO receipt data (receiver info, photo, signature, discrepancy)
export function usePOReceipt(purchaseOrderId: string) {
    return useQuery({
        queryKey: ['po_receipt', purchaseOrderId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('po_receipts')
                .select('*')
                .eq('purchase_order_id', purchaseOrderId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data as POReceiptWithDetails | null;
        },
        enabled: !!purchaseOrderId,
    });
}

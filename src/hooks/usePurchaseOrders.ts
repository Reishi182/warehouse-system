import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PurchaseOrder, POStatus, POReceiptWithDetails } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

/**
 * Hook to subscribe to real-time changes on purchase_orders table.
 * This will automatically invalidate and refetch PO data when changes occur.
 */
export function usePurchaseOrdersRealtime() {
    // Deprecated: Realtime is now handled centrally in DataContext to avoid channel explosion
}

export interface POFilters {
    status?: POStatus | POStatus[];
    startDate?: string;
    endDate?: string;
}

// Fetch all purchase orders with supplier info
export function usePurchaseOrders(filtersOrStatus?: POFilters | POStatus | POStatus[]) {
    let statusFilter: POStatus | POStatus[] | undefined;
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (filtersOrStatus) {
        if (typeof filtersOrStatus === 'string' || Array.isArray(filtersOrStatus)) {
            statusFilter = filtersOrStatus;
        } else {
            statusFilter = filtersOrStatus.status;
            startDate = filtersOrStatus.startDate;
            endDate = filtersOrStatus.endDate;
        }
    }

    return useQuery({
        queryKey: ['purchase_orders', statusFilter, startDate, endDate],
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
            
            if (startDate) {
                query = query.gte('created_at', `${startDate}T00:00:00`);
            }
            if (endDate) {
                query = query.lte('created_at', `${endDate}T23:59:59`);
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
        isBonus?: boolean;
    }>;
    discount1Percent?: number;
    discount2Percent?: number;
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

            // Calculate total (item bonus tidak dihitung ke total)
            let totalAmount = input.items.reduce((acc, item) => acc + (item.isBonus ? 0 : (item.quantity * item.unitPrice)), 0);

            // Apply discounts sequentially
            if (input.discount1Percent) {
                totalAmount = totalAmount - (totalAmount * (input.discount1Percent / 100));
            }
            if (input.discount2Percent) {
                totalAmount = totalAmount - (totalAmount * (input.discount2Percent / 100));
            }

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
                    discount_1_percent: input.discount1Percent || 0,
                    discount_2_percent: input.discount2Percent || 0,
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
                unit_price: item.isBonus ? 0 : item.unitPrice,
                total_price: item.isBonus ? 0 : (item.quantity * item.unitPrice),
                barcode: item.barcode || null,
                unit: item.unit || 'pcs',
                is_new_product: item.isNewProduct || false,
                is_bonus: item.isBonus || false,
            }));

            const { error: itemsError } = await supabase
                .from('purchase_order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return po;
        },
        onSuccess: (po) => {
            invalidateAndBroadcast(queryClient, ['purchase_orders']);
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

export interface UpdatePOInput extends CreatePOInput {
    poId: string;
}

export function useUpdatePurchaseOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: UpdatePOInput) => {
            // Check if PO exists and is editable
            const { data: existingPo, error: fetchError } = await supabase
                .from('purchase_orders')
                .select('status, po_number')
                .eq('id', input.poId)
                .single();

            if (fetchError) throw fetchError;

            // Only allow edit if in allowed statuses
            const allowedStatuses = ['pending_auditor', 'pending_receipt', 'rejected'];
            if (!allowedStatuses.includes(existingPo.status)) {
                throw new Error('PO dengan status ini tidak dapat diedit');
            }

            // Check if we need to regenerate PO number because date changed
            // We can just regenerate anyway to match the new date, or only if date is different
            let poNumber = existingPo.po_number;
            const poDate = input.poDate;
            
            // Re-generate PO number
            const { data: poNumberData, error: poNumError } = await supabase
                .rpc('generate_po_number', { p_date: poDate });

            if (poNumError) {
                const [year, month, day] = poDate.split('-');
                const dateStr = `${day}${month}${year}`;
                const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
                poNumber = `PO-${dateStr}-${randomNum}`;
            } else {
                poNumber = poNumberData;
            }

            // Calculate total (item bonus tidak dihitung ke total)
            let totalAmount = input.items.reduce((acc, item) => acc + (item.isBonus ? 0 : (item.quantity * item.unitPrice)), 0);

            // Apply discounts sequentially
            if (input.discount1Percent) {
                totalAmount = totalAmount - (totalAmount * (input.discount1Percent / 100));
            }
            if (input.discount2Percent) {
                totalAmount = totalAmount - (totalAmount * (input.discount2Percent / 100));
            }

            // Update PO
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .update({
                    po_number: poNumber,
                    po_date: poDate,
                    supplier_id: input.supplierId || null,
                    destination: input.destination,
                    total_amount: totalAmount,
                    discount_1_percent: input.discount1Percent || 0,
                    discount_2_percent: input.discount2Percent || 0,
                    notes: input.notes || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', input.poId)
                .select()
                .single();

            if (poError) throw poError;

            // Delete old items
            const { error: deleteError } = await supabase
                .from('purchase_order_items')
                .delete()
                .eq('purchase_order_id', input.poId);

            if (deleteError) throw deleteError;

            // Insert new items
            const itemsToInsert = input.items.map(item => ({
                purchase_order_id: input.poId,
                product_id: item.productId || null,
                product_name: item.productName,
                quantity: item.quantity,
                unit_price: item.isBonus ? 0 : item.unitPrice,
                total_price: item.isBonus ? 0 : (item.quantity * item.unitPrice),
                barcode: item.barcode || null,
                unit: item.unit || 'pcs',
                is_new_product: item.isNewProduct || false,
                is_bonus: item.isBonus || false,
            }));

            const { error: itemsError } = await supabase
                .from('purchase_order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return po;
        },
        onSuccess: (po) => {
            invalidateAndBroadcast(queryClient, ['purchase_orders']);
            queryClient.invalidateQueries({ queryKey: ['purchase_order', po.id] });
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil diperbarui',
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
            invalidateAndBroadcast(queryClient, ['purchase_orders']);
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
            invalidateAndBroadcast(queryClient, ['purchase_orders']);
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
                        price: 0, // Harga jual default 0, harga modal/PO tidak mempengaruhi harga jual
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
                    .select('stock_gudang, stock_toko, main_unit, sell_unit, has_multi_unit, pcs_per_box')
                    .eq('id', productId)
                    .single();

                if (prodError) continue;

                // Calculate multiplier for multi-unit
                let multiplier = 1;
                if (product.has_multi_unit && product.pcs_per_box) {
                    const mainUnitLower = (product.main_unit || 'box').toLowerCase();
                    const itemUnitLower = (item.unit || '').toLowerCase();
                    if (itemUnitLower === mainUnitLower) {
                        multiplier = product.pcs_per_box;
                    }
                }
                
                // Only add RECEIVED quantity (converted to base unit)
                const stockField = destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                const currentStock = destination === 'gudang' ? (product.stock_gudang || 0) : (product.stock_toko || 0);
                const actualReceivedQty = item.receivedQty * multiplier;
                const newStock = currentStock + actualReceivedQty;

                // Bug fix #8: Use atomic RPC instead of read-then-write
                const { error: incrementError } = await supabase.rpc('atomic_increment_stock', {
                    p_product_id: productId,
                    p_quantity: actualReceivedQty,
                    p_location: destination,
                });
                if (incrementError) throw incrementError;

                // Log stock change
                const noteDetails = item.receivedQty < item.orderedQty
                    ? `Penerimaan PO: ${po.po_number} (Selisih: ${item.orderedQty - item.receivedQty})`
                    : `Penerimaan PO: ${po.po_number}`;

                await supabase.from('stock_logs').insert([{
                    product_id: productId,
                    type: 'in',
                    quantity: actualReceivedQty,
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
            invalidateAndBroadcast(queryClient, ['purchase_orders', 'products', 'po_receipt']);

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
            invalidateAndBroadcast(queryClient, ['purchase_orders']);
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

// ── Batalkan PO yang sudah Completed (dengan rollback stok) ──────────────────
// Membatalkan PO yang sudah selesai. Stok di-rollback berdasarkan stock_logs
// untuk memastikan akurasi (memperhitungkan selisih penerimaan, koreksi qty,
// dan perpindahan lokasi).

interface CancelCompletedPOInput {
    poId: string;
    cancelledBy: string;
    cancelledByName: string;
    reason: string; // wajib karena ini operasi destruktif
}

export function useCancelCompletedPurchaseOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: CancelCompletedPOInput) => {
            // 1. Validasi: PO harus berstatus completed / completed_with_discrepancy
            const { data: po, error: fetchError } = await supabase
                .from('purchase_orders')
                .select('po_number, status, destination, created_by')
                .eq('id', input.poId)
                .single();

            if (fetchError) throw fetchError;

            const completedStatuses = ['completed', 'completed_with_discrepancy'];
            if (!completedStatuses.includes(po.status)) {
                throw new Error('Fitur ini hanya untuk PO yang sudah selesai.');
            }

            // 2. Ambil semua stock_logs terkait PO ini untuk menghitung net impact per produk per lokasi
            const { data: logs, error: logsError } = await supabase
                .from('stock_logs')
                .select('product_id, type, quantity, location')
                .eq('reference_type', 'purchase_order')
                .eq('reference_id', input.poId);

            if (logsError) throw logsError;

            // Hitung net impact per produk per lokasi
            const netImpact: Record<string, { gudang: number; toko: number }> = {};
            for (const log of (logs || [])) {
                if (!log.product_id) continue;
                if (!netImpact[log.product_id]) {
                    netImpact[log.product_id] = { gudang: 0, toko: 0 };
                }
                const delta = log.type === 'in' ? log.quantity : -log.quantity;
                const loc = log.location as 'gudang' | 'toko';
                if (loc === 'gudang' || loc === 'toko') {
                    netImpact[log.product_id][loc] += delta;
                }
            }

            // 3. Reverse stok untuk setiap produk yang terdampak
            const reversedProducts: string[] = [];
            for (const [productId, impact] of Object.entries(netImpact)) {
                // Ambil stok terkini
                const { data: product, error: prodError } = await supabase
                    .from('products')
                    .select('stock_gudang, stock_toko, name')
                    .eq('id', productId)
                    .single();

                if (prodError) {
                    console.error(`Gagal ambil produk ${productId}:`, prodError);
                    continue;
                }

                const updates: Record<string, number> = {};
                const logEntries: any[] = [];

                // Reverse gudang impact
                if (impact.gudang !== 0) {
                    const currentGudang = product.stock_gudang || 0;
                    const newGudang = Math.max(0, currentGudang - impact.gudang);
                    updates.stock_gudang = newGudang;

                    logEntries.push({
                        product_id: productId,
                        type: impact.gudang > 0 ? 'out' : 'in',
                        quantity: Math.abs(impact.gudang),
                        location: 'gudang',
                        user_id: input.cancelledBy,
                        note: `Pembatalan PO Selesai: ${po.po_number} — Rollback stok gudang`,
                        reference_type: 'purchase_order',
                        reference_id: input.poId,
                        stock_before: currentGudang,
                        stock_after: newGudang,
                    });
                }

                // Reverse toko impact
                if (impact.toko !== 0) {
                    const currentToko = product.stock_toko || 0;
                    const newToko = Math.max(0, currentToko - impact.toko);
                    updates.stock_toko = newToko;

                    logEntries.push({
                        product_id: productId,
                        type: impact.toko > 0 ? 'out' : 'in',
                        quantity: Math.abs(impact.toko),
                        location: 'toko',
                        user_id: input.cancelledBy,
                        note: `Pembatalan PO Selesai: ${po.po_number} — Rollback stok toko`,
                        reference_type: 'purchase_order',
                        reference_id: input.poId,
                        stock_before: currentToko,
                        stock_after: newToko,
                    });
                }

                // Update stok produk
                if (Object.keys(updates).length > 0) {
                    const { error: updateErr } = await supabase
                        .from('products')
                        .update(updates)
                        .eq('id', productId);

                    if (updateErr) {
                        console.error(`Gagal update stok produk ${productId}:`, updateErr);
                        continue;
                    }

                    // Insert stock_log entries
                    if (logEntries.length > 0) {
                        await supabase.from('stock_logs').insert(logEntries);
                    }

                    reversedProducts.push(product.name || productId);
                }
            }

            // 4. Update status PO ke cancelled
            const { error: cancelErr } = await supabase
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

            if (cancelErr) throw cancelErr;

            return {
                poNumber: po.po_number,
                reversedCount: reversedProducts.length,
                reversedProducts,
                createdBy: po.created_by,
            };
        },
        onSuccess: (result, variables) => {
            invalidateAndBroadcast(queryClient, ['purchase_orders', 'products', 'stock_logs']);
            toast({
                title: '🚫 PO Selesai Dibatalkan',
                description: `PO ${result.poNumber} dibatalkan. ${result.reversedCount} produk stoknya telah di-rollback.`,
            });

            // Notifikasi ke seluruh main_office & warehouse
            sendNotificationToRole(['main_office', 'warehouse'], {
                title: '🚫 PO Selesai Dibatalkan',
                message: `PO ${result.poNumber} yang sudah selesai telah dibatalkan oleh ${variables.cancelledByName}. Stok ${result.reversedCount} produk telah di-rollback.`,
                type: 'warning',
                link: '/purchase-orders',
            });

            // Notify the creator if different from canceller
            if (result.createdBy && result.createdBy !== variables.cancelledBy) {
                sendNotificationToUser(result.createdBy, {
                    title: '🚫 PO Dibatalkan',
                    message: `PO ${result.poNumber} yang sudah selesai telah dibatalkan. Stok telah di-rollback.`,
                    type: 'warning',
                    link: '/purchase-orders',
                });
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal Membatalkan PO',
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


// ── Edit harga & stok PO yang sudah completed ────────────────────────────────
// Mengupdate unit_price, total_price, dan (opsional) quantity per item.
// Jika quantity berubah, stok produk di-adjust sesuai selisih dan stock_log baru dibuat.
// Aman untuk PO berstatus completed / completed_with_discrepancy.

export interface UpdatePOPricesInput {
    poId: string;
    discount1Percent?: number;
    discount2Percent?: number;
    updatedBy: string;       // user_id untuk stock_log
    updatedByName: string;  // nama untuk catatan
    items: Array<{
        itemId: string;
        unitPrice: number;
        quantity: number;       // qty baru
        originalQuantity: number; // qty asli (untuk hitung selisih stok)
        isBonus: boolean;
        productId?: string;     // dibutuhkan jika qty berubah
        unit?: string;          // satuan item (untuk multiplier multi-unit)
    }>;
}

export function useUpdatePOPrices() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: UpdatePOPricesInput) => {
            // 1. Pastikan PO boleh diedit (hanya completed / completed_with_discrepancy)
            const { data: po, error: fetchErr } = await supabase
                .from('purchase_orders')
                .select('status, po_number, destination, discount_1_percent, discount_2_percent')
                .eq('id', input.poId)
                .single();

            if (fetchErr) throw fetchErr;

            const editableStatuses = ['completed', 'completed_with_discrepancy'];
            if (!editableStatuses.includes(po.status)) {
                throw new Error('Hanya PO yang sudah selesai yang dapat diedit harganya.');
            }

            const destination = po.destination as 'gudang' | 'toko';
            const stockField = destination === 'gudang' ? 'stock_gudang' : 'stock_toko';

            // 2. Update tiap item — harga + (jika berubah) qty & stok
            for (const item of input.items) {
                const qtyChanged = item.quantity !== item.originalQuantity;
                const qtyDelta = item.quantity - item.originalQuantity; // positif = tambah, negatif = kurangi

                // Update purchase_order_items
                const itemUpdatePayload: Record<string, any> = {
                    quantity: item.quantity,
                    total_price: item.isBonus ? 0 : item.unitPrice * item.quantity,
                };
                if (!item.isBonus) {
                    itemUpdatePayload.unit_price = item.unitPrice;
                }

                const { error: itemErr } = await supabase
                    .from('purchase_order_items')
                    .update(itemUpdatePayload)
                    .eq('id', item.itemId);
                if (itemErr) throw itemErr;

                // Jika qty berubah dan ada productId → adjust stok produk
                if (qtyChanged && item.productId && qtyDelta !== 0) {
                    // Ambil data produk (stok saat ini + multi-unit info)
                    const { data: product, error: prodErr } = await supabase
                        .from('products')
                        .select('stock_gudang, stock_toko, has_multi_unit, main_unit, pcs_per_box')
                        .eq('id', item.productId)
                        .single();

                    if (prodErr) {
                        console.error('Gagal mengambil data produk untuk koreksi stok:', prodErr);
                        continue;
                    }

                    // Hitung multiplier untuk produk multi-unit
                    let multiplier = 1;
                    if (product.has_multi_unit && product.pcs_per_box) {
                        const mainUnitLower = (product.main_unit || 'box').toLowerCase();
                        const itemUnitLower = (item.unit || '').toLowerCase();
                        if (itemUnitLower === mainUnitLower) {
                            multiplier = product.pcs_per_box;
                        }
                    }

                    const actualDelta = qtyDelta * multiplier;
                    const currentStock = destination === 'gudang'
                        ? (product.stock_gudang || 0)
                        : (product.stock_toko || 0);
                    const newStock = Math.max(0, currentStock + actualDelta);

                    // Update stok produk
                    const { error: stockErr } = await supabase
                        .from('products')
                        .update({ [stockField]: newStock })
                        .eq('id', item.productId);

                    if (stockErr) {
                        console.error('Gagal update stok produk:', stockErr);
                        continue;
                    }

                    // Catat ke stock_logs sebagai koreksi
                    await supabase.from('stock_logs').insert([{
                        product_id: item.productId,
                        type: actualDelta > 0 ? 'in' : 'out',
                        quantity: Math.abs(actualDelta),
                        location: destination,
                        user_id: input.updatedBy,
                        note: `Koreksi qty PO: ${po.po_number} (${item.originalQuantity} → ${item.quantity} ${item.unit || 'pcs'})`,
                        reference_type: 'purchase_order',
                        reference_id: input.poId,
                        stock_before: currentStock,
                        stock_after: newStock,
                    }]);
                }
            }

            // 3. Hitung ulang total_amount PO
            const d1 = input.discount1Percent ?? po.discount_1_percent ?? 0;
            const d2 = input.discount2Percent ?? po.discount_2_percent ?? 0;

            let newTotal = input.items.reduce(
                (sum, it) => sum + (it.isBonus ? 0 : it.unitPrice * it.quantity),
                0
            );
            if (d1) newTotal = newTotal - newTotal * (d1 / 100);
            if (d2) newTotal = newTotal - newTotal * (d2 / 100);

            const { error: poErr } = await supabase
                .from('purchase_orders')
                .update({
                    total_amount: newTotal,
                    discount_1_percent: d1,
                    discount_2_percent: d2,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.poId);

            if (poErr) throw poErr;

            const stockChanged = input.items.some(it => it.quantity !== it.originalQuantity && it.productId);
            return { poNumber: po.po_number, newTotal, stockChanged };
        },
        onSuccess: (result, variables) => {
            const keys: string[] = ['purchase_orders'];
            if (result.stockChanged) keys.push('products', 'stock_logs');
            invalidateAndBroadcast(queryClient, keys);
            queryClient.invalidateQueries({ queryKey: ['purchase_order', variables.poId] });
            toast({
                title: 'PO Diperbarui',
                description: `PO ${result.poNumber} berhasil dikoreksi. Total baru: Rp ${result.newTotal.toLocaleString('id-ID')}${
                    result.stockChanged ? '. Stok telah disesuaikan.' : ''
                }`,
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

// ── Pindah lokasi tujuan PO yang sudah completed ─────────────────────────────
// Memindahkan stok dari lokasi lama ke lokasi baru untuk semua item PO.
// Setiap item menghasilkan 2 stock_log: 'out' dari lama + 'in' ke baru.
// Aman: stok tidak bisa minus (di-clamp ke 0).

export interface UpdatePODestinationInput {
    poId: string;
    newDestination: 'gudang' | 'toko';
    updatedBy: string;
    updatedByName: string;
}

export function useUpdatePODestination() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: UpdatePODestinationInput) => {
            // 1. Ambil data PO (status + destination lama)
            const { data: po, error: poFetchErr } = await supabase
                .from('purchase_orders')
                .select('status, po_number, destination')
                .eq('id', input.poId)
                .single();

            if (poFetchErr) throw poFetchErr;

            // 2. Hanya boleh untuk PO completed / completed_with_discrepancy
            const editableStatuses = ['completed', 'completed_with_discrepancy'];
            if (!editableStatuses.includes(po.status)) {
                throw new Error('Hanya PO yang sudah selesai yang dapat diubah lokasinya.');
            }

            const oldDest = po.destination as 'gudang' | 'toko';
            const newDest = input.newDestination;

            if (oldDest === newDest) {
                throw new Error('Lokasi tujuan baru sama dengan yang lama.');
            }

            const oldStockField = oldDest === 'gudang' ? 'stock_gudang' : 'stock_toko';
            const newStockField = newDest === 'gudang' ? 'stock_gudang' : 'stock_toko';

            // 3. Ambil semua item PO
            const { data: items, error: itemsErr } = await supabase
                .from('purchase_order_items')
                .select('id, product_id, product_name, quantity, unit, is_bonus')
                .eq('purchase_order_id', input.poId);

            if (itemsErr) throw itemsErr;

            // 4. Untuk tiap item yang punya product_id — pindah stok
            for (const item of (items || [])) {
                if (!item.product_id) continue; // produk baru tanpa id, lewati

                const { data: product, error: prodErr } = await supabase
                    .from('products')
                    .select('stock_gudang, stock_toko, has_multi_unit, main_unit, pcs_per_box')
                    .eq('id', item.product_id)
                    .single();

                if (prodErr) {
                    console.error('Gagal ambil produk:', prodErr);
                    continue;
                }

                // Hitung multiplier multi-unit
                let multiplier = 1;
                if (product.has_multi_unit && product.pcs_per_box) {
                    const mainUnitLower = (product.main_unit || 'box').toLowerCase();
                    const itemUnitLower = (item.unit || '').toLowerCase();
                    if (itemUnitLower === mainUnitLower) {
                        multiplier = product.pcs_per_box;
                    }
                }

                const actualQty = item.quantity * multiplier;

                const oldStock = oldDest === 'gudang'
                    ? (product.stock_gudang || 0)
                    : (product.stock_toko || 0);
                const newStockOld = Math.max(0, oldStock - actualQty); // kurangi dari lama

                const newStockCurrent = newDest === 'gudang'
                    ? (product.stock_gudang || 0)
                    : (product.stock_toko || 0);
                const newStockNew = newStockCurrent + actualQty; // tambah ke baru

                const unitText = multiplier > 1
                    ? ` (${item.quantity} ${item.unit} × ${multiplier})`
                    : ` ${item.unit}`;

                // Update kedua kolom stok sekaligus
                const { error: stockUpdateErr } = await supabase
                    .from('products')
                    .update({
                        [oldStockField]: newStockOld,
                        [newStockField]: newStockNew,
                    })
                    .eq('id', item.product_id);

                if (stockUpdateErr) {
                    console.error('Gagal update stok:', stockUpdateErr);
                    continue;
                }

                const logNote = `Pindah lokasi PO: ${po.po_number} (${oldDest} → ${newDest})${unitText}`;

                // Log OUT dari lokasi lama
                await supabase.from('stock_logs').insert([{
                    product_id: item.product_id,
                    type: 'out',
                    quantity: actualQty,
                    location: oldDest,
                    user_id: input.updatedBy,
                    note: logNote,
                    reference_type: 'purchase_order',
                    reference_id: input.poId,
                    stock_before: oldStock,
                    stock_after: newStockOld,
                }]);

                // Log IN ke lokasi baru
                await supabase.from('stock_logs').insert([{
                    product_id: item.product_id,
                    type: 'in',
                    quantity: actualQty,
                    location: newDest,
                    user_id: input.updatedBy,
                    note: logNote,
                    reference_type: 'purchase_order',
                    reference_id: input.poId,
                    stock_before: newStockCurrent,
                    stock_after: newStockNew,
                }]);
            }

            // 5. Update destination di PO
            const { error: poUpdateErr } = await supabase
                .from('purchase_orders')
                .update({
                    destination: newDest,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.poId);

            if (poUpdateErr) throw poUpdateErr;

            return { poNumber: po.po_number, oldDest, newDest };
        },
        onSuccess: (result, variables) => {
            invalidateAndBroadcast(queryClient, ['purchase_orders', 'products', 'stock_logs']);
            queryClient.invalidateQueries({ queryKey: ['purchase_order', variables.poId] });
            toast({
                title: 'Lokasi Diperbarui',
                description: `PO ${result.poNumber}: lokasi dipindah dari ${result.oldDest} → ${result.newDest}. Stok telah disesuaikan.`,
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

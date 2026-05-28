import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

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

            const totalAmount = input.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .insert([{
                    po_number: poNumber,
                    po_date: poDate,
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
            invalidateAndBroadcast(queryClient, ['purchase_orders']);
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil dibuat',
            });

            // Note: Warehouse will be notified after PO is approved
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

            // Only notify creator if they are not the approver
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

            // Only notify creator if they are not the rejector
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
            let destination: 'gudang' | 'toko' = 'toko';
            const createdProductIds: string[] = [];
            const updatedPOItemIds: Array<{ itemId: string; originalProductId: string | null }> = [];
            let insertedReceipt = false;
            const updatedProducts: Array<{ productId: string; originalStock: number; originalSellUnit: string | null; updatePayload: any }> = [];

            try {
                // Get PO details
                const { data: po, error: poError } = await supabase
                    .from('purchase_orders')
                    .select('*, items:purchase_order_items(*)')
                    .eq('id', input.poId)
                    .single();

                if (poError) throw poError;

                destination = po.destination as 'gudang' | 'toko';

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

                // ── PHASE 1: Prepare data and new products BEFORE any stock writes ──
                interface PreparedStockOp {
                    productId: string;
                    actualAddedQty: number;
                    currentStock: number;
                    newStock: number;
                    noteDetails: string;
                    updatePayload: any;
                    originalStock: number;
                    originalSellUnit: string | null;
                }
                const preparedStockOps: PreparedStockOp[] = [];

                for (const item of input.receivedItems) {
                    if (item.receivedQty <= 0) continue;

                    let productId = item.productId;

                    // If productId is empty, create a new product
                    if (!productId && item.productName) {
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
                            throw new Error(`Gagal membuat produk baru "${item.productName}": ${createError.message}`);
                        }

                        productId = newProduct.id;
                        createdProductIds.push(productId);

                        // Update PO item with the new product_id
                        const { error: poItemUpdateError } = await supabase
                            .from('purchase_order_items')
                            .update({ product_id: productId })
                            .eq('id', item.itemId);

                        if (poItemUpdateError) {
                            throw new Error(`Gagal memperbarui item PO "${item.productName}" dengan produk baru: ${poItemUpdateError.message}`);
                        }

                        updatedPOItemIds.push({ itemId: item.itemId, originalProductId: null });
                    }

                    if (!productId) continue;

                    // Get current stock
                    const { data: product, error: prodError } = await supabase
                        .from('products')
                        .select('stock_gudang, stock_toko, has_multi_unit, main_unit, sell_unit, pcs_per_box')
                        .eq('id', productId)
                        .single();

                    if (prodError) {
                        throw new Error(`Gagal mengambil data produk "${item.productName}": ${prodError.message}`);
                    }

                    // Calculate multiplier for multi-unit
                    let multiplier = 1;
                    if (product.has_multi_unit && product.main_unit && product.pcs_per_box) {
                        const receivedUnitStr = (item.unit || 'pcs').toLowerCase().trim();
                        const mainUnitStr = product.main_unit.toLowerCase().trim();
                        if (receivedUnitStr === mainUnitStr) {
                            multiplier = product.pcs_per_box;
                        }
                    }

                    const stockField = destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                    const currentStock = destination === 'gudang' ? (product.stock_gudang || 0) : (product.stock_toko || 0);
                    const actualAddedQty = item.receivedQty * multiplier;
                    const newStock = currentStock + actualAddedQty;

                    const updatePayload: any = { [stockField]: newStock };

                    // Auto-update sell_unit for standard products if it was changed in PO
                    if (!product.has_multi_unit && item.unit && item.unit !== (product.sell_unit || 'pcs')) {
                        updatePayload.sell_unit = item.unit;
                    }

                    const unitText = multiplier > 1 ? ` (${item.receivedQty} ${item.unit} x ${multiplier})` : '';
                    const noteDetails = item.receivedQty < item.orderedQty
                        ? `Penerimaan PO: ${po.po_number} (Selisih: ${item.orderedQty - item.receivedQty})${unitText}`
                        : `Penerimaan PO: ${po.po_number}${unitText}`;

                    preparedStockOps.push({
                        productId,
                        actualAddedQty,
                        currentStock,
                        newStock,
                        noteDetails,
                        updatePayload,
                        originalStock: currentStock,
                        originalSellUnit: product.sell_unit,
                    });
                }

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
                insertedReceipt = true;

                // ── PHASE 2: Execute all stock operations and logs ──
                for (const op of preparedStockOps) {
                    const { error: updateError } = await supabase
                        .from('products')
                        .update(op.updatePayload)
                        .eq('id', op.productId);

                    if (updateError) throw updateError;
                    updatedProducts.push({
                        productId: op.productId,
                        originalStock: op.originalStock,
                        originalSellUnit: op.originalSellUnit,
                        updatePayload: op.updatePayload
                    });

                    const { error: logError } = await supabase.from('stock_logs').insert([{
                        product_id: op.productId,
                        type: 'in',
                        quantity: op.actualAddedQty,
                        location: destination,
                        user_id: input.receivedBy,
                        note: op.noteDetails,
                        stock_before: op.currentStock,
                        stock_after: op.newStock,
                        reference_type: 'purchase_order',
                        reference_id: input.poId,
                    }]);

                    if (logError) throw logError;
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

            } catch (err) {
                console.error("Error confirming PO receipt. Rolling back changes...", err);

                // 1. Rollback stock updates
                const stockField = destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                for (const prod of updatedProducts) {
                    try {
                        const rollbackPayload: any = { [stockField]: prod.originalStock };
                        if (prod.originalSellUnit !== undefined) {
                            rollbackPayload.sell_unit = prod.originalSellUnit;
                        }
                        await supabase
                            .from('products')
                            .update(rollbackPayload)
                            .eq('id', prod.productId);
                    } catch (rollbackErr) {
                        console.error(`Failed to rollback product ${prod.productId}:`, rollbackErr);
                    }
                }

                // 2. Delete inserted stock logs
                try {
                    await supabase
                        .from('stock_logs')
                        .delete()
                        .eq('reference_type', 'purchase_order')
                        .eq('reference_id', input.poId);
                } catch (rollbackErr) {
                    console.error("Failed to delete stock logs during rollback:", rollbackErr);
                }

                // 3. Delete inserted receipt record
                if (insertedReceipt) {
                    try {
                        await supabase
                            .from('po_receipts')
                            .delete()
                            .eq('purchase_order_id', input.poId);
                    } catch (rollbackErr) {
                        console.error("Failed to delete po_receipt during rollback:", rollbackErr);
                    }
                }

                // 4. Restore PO status
                try {
                    await supabase
                        .from('purchase_orders')
                        .update({
                            status: 'pending_receipt',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', input.poId);
                } catch (rollbackErr) {
                    console.error("Failed to restore PO status during rollback:", rollbackErr);
                }

                // 5. Restore purchase_order_items product_ids
                for (const item of updatedPOItemIds) {
                    try {
                        await supabase
                            .from('purchase_order_items')
                            .update({ product_id: item.originalProductId })
                            .eq('id', item.itemId);
                    } catch (rollbackErr) {
                        console.error(`Failed to restore PO item ${item.itemId} product_id:`, rollbackErr);
                    }
                }

                // 6. Delete created products
                for (const prodId of createdProductIds) {
                    try {
                        await supabase
                            .from('products')
                            .delete()
                            .eq('id', prodId);
                    } catch (rollbackErr) {
                        console.error(`Failed to delete created product ${prodId}:`, rollbackErr);
                    }
                }

                throw err;
            }
        },
        onSuccess: (result) => {
            invalidateAndBroadcast(queryClient, ['purchase_orders', 'products']);

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
            if (po?.created_by && po.created_by !== variables.cancelledBy) {
                sendNotificationToUser(po.created_by, {
                    title: 'PO Dibatalkan',
                    message: `Purchase Order ${po?.po_number} telah dibatalkan`,
                    type: 'warning',
                    link: '/purchase-orders',
                });
            }

            // Note: Removed warehouse broadcast - they don't need to be notified
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PurchaseOrder, PurchaseOrderItem, POStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil dibuat',
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
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil diapprove',
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
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({
                title: 'Berhasil',
                description: 'Purchase Order berhasil ditolak',
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

interface ConfirmReceiptInput {
    poId: string;
    receivedBy: string;
    receivedByName: string;
    photoUrl?: string;
    notes?: string;
}

export function useConfirmPOReceipt() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: ConfirmReceiptInput) => {
            // Get PO and items
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .select('*, items:purchase_order_items(*)')
                .eq('id', input.poId)
                .single();

            if (poError) throw poError;

            // Create receipt record
            const { error: receiptError } = await supabase
                .from('po_receipts')
                .insert([{
                    purchase_order_id: input.poId,
                    received_by: input.receivedBy,
                    received_by_name: input.receivedByName,
                    photo_url: input.photoUrl || null,
                    notes: input.notes || null,
                }]);

            if (receiptError) throw receiptError;

            // Update stock for each item
            const destination = po.destination as 'gudang' | 'toko';
            for (const item of (po.items || [])) {
                if (!item.product_id) continue;

                // Get current stock
                const { data: product, error: prodError } = await supabase
                    .from('products')
                    .select('stock_gudang, stock_toko')
                    .eq('id', item.product_id)
                    .single();

                if (prodError) continue;

                // Update the appropriate stock location
                const stockField = destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                const currentStock = destination === 'gudang' ? (product.stock_gudang || 0) : (product.stock_toko || 0);
                const newStock = currentStock + item.quantity;

                await supabase
                    .from('products')
                    .update({ [stockField]: newStock })
                    .eq('id', item.product_id);

                // Log stock change
                await supabase.from('stock_logs').insert([{
                    product_id: item.product_id,
                    type: 'in',
                    quantity: item.quantity,
                    location: destination,
                    user_id: input.receivedBy,
                    note: `Penerimaan PO: ${po.po_number}`,
                }]);
            }

            // Update PO status to completed
            const { error: updateError } = await supabase
                .from('purchase_orders')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.poId);

            if (updateError) throw updateError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({
                title: 'Berhasil',
                description: 'Penerimaan barang berhasil dikonfirmasi dan stok telah diperbarui',
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

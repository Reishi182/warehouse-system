import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceOrder, MarketplaceReturn, MarketplaceType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole } from '@/hooks/useRealtimeNotifications';

// Generate order number
async function generateOrderNumber(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `MP-${dateStr}-${randomNum}`;
}

// Fetch all marketplace orders
export function useMarketplaceOrders(status?: string | string[]) {
    return useQuery({
        queryKey: ['marketplace-orders', status],
        queryFn: async () => {
            let query = supabase
                .from('marketplace_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (status) {
                if (Array.isArray(status)) {
                    query = query.in('status', status);
                } else {
                    query = query.eq('status', status);
                }
            }

            const { data, error } = await query;
            if (error) throw error;

            // Fetch items for each order
            const ordersWithItems = await Promise.all(
                (data || []).map(async (order) => {
                    const { data: items } = await supabase
                        .from('marketplace_order_items')
                        .select('*')
                        .eq('order_id', order.id);

                    const { data: returns } = await supabase
                        .from('marketplace_returns')
                        .select('*')
                        .eq('order_id', order.id);

                    return { ...order, items: items || [], returns: returns || [] };
                })
            );

            return ordersWithItems as MarketplaceOrder[];
        },
    });
}

// Fetch single order
export function useMarketplaceOrder(id: string) {
    return useQuery({
        queryKey: ['marketplace-order', id],
        queryFn: async () => {
            const { data: order, error } = await supabase
                .from('marketplace_orders')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            const { data: items } = await supabase
                .from('marketplace_order_items')
                .select('*')
                .eq('order_id', id);

            const { data: returns } = await supabase
                .from('marketplace_returns')
                .select('*')
                .eq('order_id', id);

            return { ...order, items: items || [], returns: returns || [] } as MarketplaceOrder;
        },
        enabled: !!id,
    });
}

// Fetch pending orders for receipt (gudang/toko)
export function usePendingMarketplaceOrders(destination: 'gudang' | 'toko') {
    return useQuery({
        queryKey: ['marketplace-orders', 'pending', destination],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('marketplace_orders')
                .select('*')
                .eq('status', 'pending_arrival')
                .eq('destination', destination)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const ordersWithItems = await Promise.all(
                (data || []).map(async (order) => {
                    const { data: items } = await supabase
                        .from('marketplace_order_items')
                        .select('*')
                        .eq('order_id', order.id);
                    return { ...order, items: items || [] };
                })
            );

            return ordersWithItems as MarketplaceOrder[];
        },
    });
}

// Create marketplace order (Main Office)
export function useCreateMarketplaceOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: {
            marketplace: MarketplaceType;
            marketplaceOrderId?: string;
            destination: 'gudang' | 'toko';
            invoiceUrl?: string;
            notes?: string;
            createdBy: string;
            createdByName: string;
            customNumber?: string;
            items: Array<{
                productId?: string;
                productName: string;
                barcode?: string;
                unit?: string;
                quantity: number;
                unitPrice: number;
            }>;
        }) => {
            // Generate order number
            const orderNumber = input.customNumber?.trim() || await generateOrderNumber();

            // Calculate total
            const totalAmount = input.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

            // Create order
            const { data: order, error: orderError } = await supabase
                .from('marketplace_orders')
                .insert({
                    order_number: orderNumber,
                    marketplace: input.marketplace,
                    marketplace_order_id: input.marketplaceOrderId || null,
                    destination: input.destination,
                    status: 'pending_arrival',
                    total_amount: totalAmount,
                    invoice_url: input.invoiceUrl || null,
                    notes: input.notes || null,
                    created_by: input.createdBy,
                    created_by_name: input.createdByName,
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Create items
            const itemsToInsert = input.items.map(item => ({
                order_id: order.id,
                product_id: item.productId || null,
                product_name: item.productName,
                barcode: item.barcode || null,
                unit: item.unit || 'pcs',
                quantity_ordered: item.quantity,
                quantity_received: 0,
                quantity_damaged: 0,
                unit_price: item.unitPrice,
                total_price: item.quantity * item.unitPrice,
            }));

            const { error: itemsError } = await supabase
                .from('marketplace_order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // Notify warehouse/cashier
            const targetRole = input.destination === 'gudang' ? 'warehouse' : 'cashier';
            await sendNotificationToRole(
                targetRole,
                'Pesanan Marketplace Baru',
                `Pesanan ${orderNumber} dari ${input.marketplace.toUpperCase()} siap diterima`,
                `/marketplace/receipt`
            );

            return order;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
            toast({ title: 'Pesanan Dibuat', description: 'Menunggu barang sampai' });
        },
        onError: (error: Error) => {
            toast({ title: 'Gagal membuat pesanan', description: error.message, variant: 'destructive' });
        },
    });
}

// Receive marketplace order (Gudang/Cashier)
export function useReceiveMarketplaceOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: {
            orderId: string;
            receivedBy: string;
            receivedByName: string;
            signatureUrl?: string;
            items: Array<{
                id: string;
                quantityReceived: number;
                quantityDamaged: number;
                damageNotes?: string;
            }>;
        }) => {
            // Update each item
            for (const item of input.items) {
                const { error: itemError } = await supabase
                    .from('marketplace_order_items')
                    .update({
                        quantity_received: item.quantityReceived,
                        quantity_damaged: item.quantityDamaged,
                        damage_notes: item.damageNotes || null,
                    })
                    .eq('id', item.id);

                if (itemError) throw itemError;
            }

            // Check for discrepancy
            const hasDiscrepancy = input.items.some(item => item.quantityDamaged > 0);
            const newStatus = hasDiscrepancy ? 'received_with_issue' : 'completed';

            // Update order
            const { data: order, error: orderError } = await supabase
                .from('marketplace_orders')
                .update({
                    status: newStatus,
                    received_by: input.receivedBy,
                    received_by_name: input.receivedByName,
                    received_at: new Date().toISOString(),
                    has_discrepancy: hasDiscrepancy,
                    signature_url: input.signatureUrl || null,
                })
                .eq('id', input.orderId)
                .select()
                .single();

            if (orderError) throw orderError;

            // Update stock for received items (not damaged)
            const { data: items } = await supabase
                .from('marketplace_order_items')
                .select('*')
                .eq('order_id', input.orderId);

            for (const item of items || []) {
                if (item.product_id && item.quantity_received > 0) {
                    const actualReceived = item.quantity_received - (item.quantity_damaged || 0);
                    if (actualReceived > 0) {
                        // Get current stock
                        const { data: product } = await supabase
                            .from('products')
                            .select('stock_gudang, stock_toko, name')
                            .eq('id', item.product_id)
                            .single();

                        if (product) {
                            const stockField = order.destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                            const currentStock = order.destination === 'gudang' ? product.stock_gudang : product.stock_toko;
                            const newStock = (currentStock || 0) + actualReceived;

                            await supabase
                                .from('products')
                                .update({ [stockField]: newStock })
                                .eq('id', item.product_id);

                            // Create stock log entry for history
                            await supabase
                                .from('stock_logs')
                                .insert({
                                    product_id: item.product_id,
                                    product_name: product.name || item.product_name,
                                    type: 'in',
                                    quantity: actualReceived,
                                    location: order.destination,
                                    reference_type: 'marketplace_order',
                                    reference_id: order.id,
                                    notes: `Penerimaan dari Marketplace ${order.marketplace.toUpperCase()} - ${order.order_number}`,
                                    created_by: input.receivedBy,
                                    created_by_name: input.receivedByName,
                                    stock_before: currentStock || 0,
                                    stock_after: newStock,
                                });
                        }
                    }
                }
            }

            // Notify main_office
            await sendNotificationToRole(
                'main_office',
                hasDiscrepancy ? 'Pesanan Diterima Bermasalah' : 'Pesanan Diterima',
                `Pesanan ${order.order_number} ${hasDiscrepancy ? 'ada item rusak/kurang' : 'lengkap'}`,
                `/marketplace`
            );

            return order;
        },
        onSuccess: (order) => {
            queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
            toast({
                title: order.has_discrepancy ? 'Diterima dengan Masalah' : 'Penerimaan Berhasil',
                description: order.has_discrepancy ? 'Stok yang OK sudah masuk. Silakan buat return untuk item rusak.' : 'Stok sudah ditambahkan'
            });
        },
        onError: (error: Error) => {
            toast({ title: 'Gagal menerima pesanan', description: error.message, variant: 'destructive' });
        },
    });
}

// Create return request
export function useCreateMarketplaceReturn() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: {
            orderId: string;
            reason: string;
            itemsJson: unknown;
            createdBy: string;
            createdByName: string;
        }) => {
            const { data, error } = await supabase
                .from('marketplace_returns')
                .insert({
                    order_id: input.orderId,
                    reason: input.reason,
                    status: 'pending',
                    items_json: input.itemsJson,
                    created_by: input.createdBy,
                    created_by_name: input.createdByName,
                })
                .select()
                .single();

            if (error) throw error;

            // Update order status
            await supabase
                .from('marketplace_orders')
                .update({ status: 'return_pending' })
                .eq('id', input.orderId);

            // Notify main_office
            await sendNotificationToRole(
                'main_office',
                'Return Request Dibuat',
                `Return untuk pesanan akan diproses`,
                `/marketplace/returns`
            );

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
            queryClient.invalidateQueries({ queryKey: ['marketplace-returns'] });
            toast({ title: 'Return Dibuat', description: 'Menunggu pickup ekspedisi' });
        },
        onError: (error: Error) => {
            toast({ title: 'Gagal membuat return', description: error.message, variant: 'destructive' });
        },
    });
}

// Update return with proof
export function useUpdateMarketplaceReturn() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: {
            returnId: string;
            orderId: string;
            status: 'picked_up' | 'completed';
            pickupProofUrl?: string;
            returnProofUrl?: string;
            completedBy?: string;
        }) => {
            const updateData: Record<string, unknown> = { status: input.status };

            if (input.pickupProofUrl) {
                updateData.pickup_proof_url = input.pickupProofUrl;
            }
            if (input.returnProofUrl) {
                updateData.return_proof_url = input.returnProofUrl;
            }
            if (input.status === 'completed') {
                updateData.completed_by = input.completedBy;
                updateData.completed_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('marketplace_returns')
                .update(updateData)
                .eq('id', input.returnId)
                .select()
                .single();

            if (error) throw error;

            // If completed, update order status
            if (input.status === 'completed') {
                await supabase
                    .from('marketplace_orders')
                    .update({ status: 'return_complete' })
                    .eq('id', input.orderId);
            }

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
            queryClient.invalidateQueries({ queryKey: ['marketplace-returns'] });
            toast({
                title: data.status === 'completed' ? 'Return Selesai' : 'Bukti Pickup Disimpan',
                description: data.status === 'completed' ? 'Proses return telah selesai' : 'Menunggu refund/penggantian'
            });
        },
        onError: (error: Error) => {
            toast({ title: 'Gagal update return', description: error.message, variant: 'destructive' });
        },
    });
}

// Fetch returns
export function useMarketplaceReturns(status?: string) {
    return useQuery({
        queryKey: ['marketplace-returns', status],
        queryFn: async () => {
            let query = supabase
                .from('marketplace_returns')
                .select('*, marketplace_orders(*)')
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as (MarketplaceReturn & { marketplace_orders: MarketplaceOrder })[];
        },
    });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TokopediaCourier, Location } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole } from '@/hooks/useRealtimeNotifications';

// Generate order number
async function generateOrderNumber(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `TKP-${dateStr}-${randomNum}`;
}

// Helper to insert a log entry
async function insertLog(
    orderId: string,
    status: string,
    note: string,
    userId: string | null,
    userName: string
) {
    await supabase.from('tokopedia_order_logs').insert({
        order_id: orderId,
        status,
        note,
        created_by: userId,
        created_by_name: userName,
    });
}

// ===== CREATE ORDER (Kasir) =====
export function useCreateTokopediaOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: {
            tokopediaOrderId?: string;
            tokopediaInvoice?: string;
            buyerName: string;
            buyerPhone?: string;
            buyerAddress?: string;
            stockLocation: Location;
            shippingCost?: number;
            notes?: string;
            createdBy: string;
            createdByName: string;
            items: Array<{
                productId?: string;
                productName: string;
                barcode?: string;
                quantity: number;
                unitPrice: number;
            }>;
        }) => {
            const orderNumber = await generateOrderNumber();
            const totalAmount = input.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

            const { data: order, error: orderError } = await supabase
                .from('tokopedia_orders')
                .insert({
                    order_number: orderNumber,
                    tokopedia_order_id: input.tokopediaOrderId || null,
                    tokopedia_invoice: input.tokopediaInvoice || null,
                    buyer_name: input.buyerName,
                    buyer_phone: input.buyerPhone || null,
                    buyer_address: input.buyerAddress || null,
                    stock_location: input.stockLocation,
                    status: 'order_received',
                    total_amount: totalAmount,
                    shipping_cost: input.shippingCost || 0,
                    notes: input.notes || null,
                    received_by: input.createdBy,
                    received_by_name: input.createdByName,
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Insert items
            const itemsToInsert = input.items.map(item => ({
                order_id: order.id,
                product_id: item.productId || null,
                product_name: item.productName,
                barcode: item.barcode || null,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                total_price: item.quantity * item.unitPrice,
            }));

            const { error: itemsError } = await supabase
                .from('tokopedia_order_items')
                .insert(itemsToInsert);
            if (itemsError) throw itemsError;

            // Insert log
            await insertLog(order.id, 'order_received', `Order dibuat oleh ${input.createdByName}`, input.createdBy, input.createdByName);

            // Notify warehouse
            await sendNotificationToRole(
                'warehouse',
                {
                    title: 'Order Tokopedia Baru',
                    message: `${orderNumber} — ${input.buyerName} (${input.items.length} item)`,
                    type: 'info',
                    link: '/tokopedia/shipping',
                }
            );

            return order;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tokopedia-orders'] });
            queryClient.invalidateQueries({ queryKey: ['tokopedia-stats'] });
            toast({ title: 'Order Dibuat', description: 'Menunggu gudang mengemas' });
        },
        onError: (error: Error) => {
            toast({ title: 'Gagal membuat order', description: error.message, variant: 'destructive' });
        },
    });
}

// ===== START PACKING (Gudang) =====
export function useStartPacking() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: { orderId: string; userId: string; userName: string }) => {
            const { data, error } = await supabase
                .from('tokopedia_orders')
                .update({
                    status: 'packing',
                    packed_by: input.userId,
                    packed_by_name: input.userName,
                    packed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.orderId)
                .eq('status', 'order_received') // Guard: only from order_received
                .select()
                .single();

            if (error) throw error;
            await insertLog(input.orderId, 'packing', `Dikemas oleh ${input.userName}`, input.userId, input.userName);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tokopedia-orders'] });
            queryClient.invalidateQueries({ queryKey: ['tokopedia-stats'] });
            toast({ title: 'Mulai Kemas', description: 'Status diubah ke "Sedang Dikemas"' });
        },
        onError: (error: Error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });
}

// ===== SHIP ORDER (Gudang) =====
export function useShipOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: {
            orderId: string;
            courier: TokopediaCourier;
            trackingNumber: string;
            userId: string;
            userName: string;
        }) => {
            const { data, error } = await supabase
                .from('tokopedia_orders')
                .update({
                    status: 'shipped',
                    courier: input.courier,
                    tracking_number: input.trackingNumber,
                    shipped_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.orderId)
                .eq('status', 'packing') // Guard: only from packing
                .select()
                .single();

            if (error) throw error;

            await insertLog(
                input.orderId,
                'shipped',
                `Dikirim via ${input.courier.toUpperCase()} - Resi: ${input.trackingNumber}`,
                input.userId,
                input.userName
            );

            // Notify cashier
            await sendNotificationToRole(
                'cashier',
                {
                    title: 'Order Tokopedia Dikirim',
                    message: `Order ${data.order_number} telah dikirim (Resi: ${input.trackingNumber})`,
                    type: 'info',
                    link: `/tokopedia/${input.orderId}`,
                }
            );

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tokopedia-orders'] });
            queryClient.invalidateQueries({ queryKey: ['tokopedia-stats'] });
            toast({ title: 'Dikirim!', description: 'Nomor resi tersimpan' });
        },
        onError: (error: Error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });
}

// ===== MARK DELIVERED → Auto reduce stock (Kasir) =====
export function useMarkDelivered() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: { orderId: string; userId: string; userName: string }) => {
            // Get order with items
            const { data: order, error: orderFetchError } = await supabase
                .from('tokopedia_orders')
                .select('*')
                .eq('id', input.orderId)
                .eq('status', 'shipped')
                .single();

            if (orderFetchError) throw orderFetchError;

            const { data: items } = await supabase
                .from('tokopedia_order_items')
                .select('*')
                .eq('order_id', input.orderId);

            // Reduce stock for each item
            for (const item of items || []) {
                if (item.product_id && item.quantity > 0) {
                    const stockField = order.stock_location === 'gudang' ? 'stock_gudang' : 'stock_toko';

                    // Get current stock
                    const { data: product } = await supabase
                        .from('products')
                        .select('stock_gudang, stock_toko')
                        .eq('id', item.product_id)
                        .single();

                    if (product) {
                        const currentStock = order.stock_location === 'gudang'
                            ? product.stock_gudang
                            : product.stock_toko;

                        const newStock = Math.max(0, (currentStock || 0) - item.quantity);

                        await supabase
                            .from('products')
                            .update({ [stockField]: newStock })
                            .eq('id', item.product_id);

                        // Log stock out
                        await supabase.from('stock_logs').insert({
                            product_id: item.product_id,
                            type: 'out',
                            quantity: item.quantity,
                            location: order.stock_location,
                            user_id: input.userId,
                            note: `Penjualan Tokopedia - ${order.order_number} (${order.buyer_name})`,
                            reference_type: 'tokopedia_order',
                            reference_id: order.id,
                            stock_before: currentStock || 0,
                            stock_after: newStock,
                        });
                    }
                }
            }

            // Update order status to completed (delivered + completed in one step)
            const { data: updatedOrder, error: updateError } = await supabase
                .from('tokopedia_orders')
                .update({
                    status: 'completed',
                    delivered_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.orderId)
                .select()
                .single();

            if (updateError) throw updateError;

            await insertLog(input.orderId, 'delivered', 'Barang diterima customer, stok dikurangi', input.userId, input.userName);
            await insertLog(input.orderId, 'completed', 'Order selesai', input.userId, input.userName);

            return updatedOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tokopedia-orders'] });
            queryClient.invalidateQueries({ queryKey: ['tokopedia-stats'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Order Selesai!', description: 'Stok sudah dikurangi otomatis' });
        },
        onError: (error: Error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });
}

// ===== CANCEL ORDER =====
export function useCancelTokopediaOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: { orderId: string; reason: string; userId: string; userName: string }) => {
            const { data, error } = await supabase
                .from('tokopedia_orders')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    cancel_reason: input.reason,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.orderId)
                .in('status', ['order_received', 'packing']) // Can only cancel before shipping
                .select()
                .single();

            if (error) throw error;
            await insertLog(input.orderId, 'cancelled', `Dibatalkan: ${input.reason}`, input.userId, input.userName);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tokopedia-orders'] });
            queryClient.invalidateQueries({ queryKey: ['tokopedia-stats'] });
            toast({ title: 'Dibatalkan', description: 'Order telah dibatalkan' });
        },
        onError: (error: Error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });
}

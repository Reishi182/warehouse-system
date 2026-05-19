import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole } from '@/hooks/useRealtimeNotifications';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

// Generate order number
async function generateOrderNumber(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `MP-${dateStr}-${randomNum}`;
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
            const orderNumber = input.customNumber?.trim() || await generateOrderNumber();
            const totalAmount = input.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

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

            const targetRole = input.destination === 'gudang' ? 'warehouse' : 'cashier';
            await sendNotificationToRole(
                targetRole,
                {
                    title: 'Pesanan Marketplace Baru',
                    message: `Pesanan ${orderNumber} dari ${input.marketplace.toUpperCase()} siap diterima`,
                    type: 'info',
                    link: '/marketplace/receipt',
                }
            );

            return order;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['marketplace-orders']);
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

            const hasDiscrepancy = input.items.some(item => item.quantityDamaged > 0);
            const newStatus = hasDiscrepancy ? 'received_with_issue' : 'completed';

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

            // Update stock for received items
            const { data: items } = await supabase
                .from('marketplace_order_items')
                .select('*')
                .eq('order_id', input.orderId);

            for (const item of items || []) {
                if (item.product_id && item.quantity_received > 0) {
                    const actualReceived = item.quantity_received - (item.quantity_damaged || 0);
                    if (actualReceived > 0) {
                        const { data: product } = await supabase
                            .from('products')
                            .select('stock_gudang, stock_toko')
                            .eq('id', item.product_id)
                            .single();

                        if (product) {
                            const stockField = order.destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                            const currentStock = order.destination === 'gudang' ? product.stock_gudang : product.stock_toko;

                            await supabase
                                .from('products')
                                .update({ [stockField]: (currentStock || 0) + actualReceived })
                                .eq('id', item.product_id);

                            // Log stock-in to stock_logs for stock history tracking
                            await supabase.from('stock_logs').insert({
                                product_id: item.product_id,
                                type: 'in',
                                quantity: actualReceived,
                                location: order.destination,
                                user_id: input.receivedBy,
                                note: `Terima pesanan marketplace - ${order.order_number}`,
                                stock_before: currentStock || 0,
                                stock_after: (currentStock || 0) + actualReceived,
                            });
                        }
                    }
                }
            }

            await sendNotificationToRole(
                'main_office',
                {
                    title: hasDiscrepancy ? 'Pesanan Diterima Bermasalah' : 'Pesanan Diterima',
                    message: `Pesanan ${order.order_number} ${hasDiscrepancy ? 'ada item rusak/kurang' : 'lengkap'}`,
                    type: hasDiscrepancy ? 'warning' : 'success',
                    link: '/marketplace',
                }
            );

            return order;
        },
        onSuccess: (order) => {
            invalidateAndBroadcast(queryClient, ['marketplace-orders']);
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

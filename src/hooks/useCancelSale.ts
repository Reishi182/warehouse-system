import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast'; // Bug fix #22: Use consistent toast
import { Location } from '@/types';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

interface CancelSaleInput {
    saleId: string;
    saleNumber: string;
    items: Array<{
        product_id: string;
        product_name: string;
        quantity: number;
    }>;
    stockLocation: Location;
    reason: string;
    cancelledBy: string;
    cancelledByName: string;
}

export function useCancelSale() {
    const queryClient = useQueryClient();
    const { toast } = useToast(); // Bug fix #22: Use consistent toast

    return useMutation({
        mutationFn: async (input: CancelSaleInput) => {
            // Bug fix #4: Cancel the sale FIRST, then return stock
            // This way if stock return fails, the sale is already cancelled
            // and we can retry stock return later

            // 1. Mark the sale as cancelled first
            const { error: saleError } = await supabase
                .from('sales')
                .update({
                    is_cancelled: true,
                    cancelled_at: new Date().toISOString(),
                    cancelled_reason: input.reason,
                } as any)
                .eq('id', input.saleId);

            if (saleError) throw saleError;

            // 2. Return stock for each item (if this fails, sale is already cancelled)
            const failedItems: string[] = [];
            for (const item of input.items) {
                try {
                    const stockField = input.stockLocation === 'toko' ? 'stock_toko' : 'stock_gudang';

                    // Read fresh stock from DB
                    const { data: product, error: fetchError } = await supabase
                        .from('products')
                        .select(`id, ${stockField}`)
                        .eq('id', item.product_id)
                        .single();

                    if (fetchError) {
                        failedItems.push(item.product_name);
                        continue;
                    }

                    const currentStock = (product as any)?.[stockField] || 0;
                    const newStock = currentStock + item.quantity;

                    // Update stock
                    const { error: updateError } = await supabase
                        .from('products')
                        .update({ [stockField]: newStock })
                        .eq('id', item.product_id);

                    if (updateError) {
                        failedItems.push(item.product_name);
                        continue;
                    }

                    // Log stock change
                    await supabase.from('stock_logs').insert({
                        product_id: item.product_id,
                        type: 'in',
                        quantity: item.quantity,
                        location: input.stockLocation,
                        user_id: input.cancelledBy,
                        note: `Cancel penjualan ${input.saleNumber} - ${input.reason}`,
                    });
                } catch {
                    failedItems.push(item.product_name);
                }
            }

            // 3. Add notification
            await supabase.from('notifications').insert({
                title: 'Penjualan Dibatalkan',
                message: `Penjualan ${input.saleNumber} dibatalkan oleh ${input.cancelledByName}. Alasan: ${input.reason}`,
                type: 'warning',
                link: '/pos',
            });

            return { saleNumber: input.saleNumber, failedItems };
        },
        onSuccess: (data) => {
            invalidateAndBroadcast(queryClient, ['sales', 'products', 'stock-logs', 'notifications']);

            if (data.failedItems.length > 0) {
                toast({
                    title: `Penjualan ${data.saleNumber} dibatalkan`,
                    description: `Gagal mengembalikan stok untuk: ${data.failedItems.join(', ')}. Sesuaikan stok secara manual.`,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Berhasil',
                    description: `Penjualan ${data.saleNumber} berhasil dibatalkan`,
                });
            }
        },
        onError: (error) => {
            console.error('Cancel sale error:', error);
            toast({
                title: 'Gagal membatalkan penjualan',
                description: (error as Error).message,
                variant: 'destructive',
            });
        },
    });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Location } from '@/types';

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

    return useMutation({
        mutationFn: async (input: CancelSaleInput) => {
            // 1. Return stock for each item
            for (const item of input.items) {
                const stockField = input.stockLocation === 'toko' ? 'stock_toko' : 'stock_gudang';

                // Get current stock
                const { data: product, error: fetchError } = await supabase
                    .from('products')
                    .select(`id, ${stockField}`)
                    .eq('id', item.product_id)
                    .single();

                if (fetchError) throw fetchError;

                const currentStock = (product as any)?.[stockField] || 0;
                const newStock = currentStock + item.quantity;

                // Update stock
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ [stockField]: newStock })
                    .eq('id', item.product_id);

                if (updateError) throw updateError;

                // Log stock change
                await supabase.from('stock_logs').insert({
                    product_id: item.product_id,
                    type: 'in',
                    quantity: item.quantity,
                    location: input.stockLocation,
                    user_id: input.cancelledBy,
                    note: `Cancel penjualan ${input.saleNumber} - ${input.reason}`,
                });
            }

            // 2. Mark the sale as cancelled (instead of deleting)
            const { error: saleError } = await supabase
                .from('sales')
                .update({
                    is_cancelled: true,
                    cancelled_at: new Date().toISOString(),
                    cancelled_reason: input.reason,
                } as any)
                .eq('id', input.saleId);

            if (saleError) throw saleError;

            // 3. Add notification
            await supabase.from('notifications').insert({
                title: 'Penjualan Dibatalkan',
                message: `Penjualan ${input.saleNumber} dibatalkan oleh ${input.cancelledByName}. Alasan: ${input.reason}`,
                type: 'warning',
                link: '/pos',
            });

            return { saleNumber: input.saleNumber };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success(`Penjualan ${data.saleNumber} berhasil dibatalkan`);
        },
        onError: (error) => {
            console.error('Cancel sale error:', error);
            toast.error('Gagal membatalkan penjualan');
        },
    });
}

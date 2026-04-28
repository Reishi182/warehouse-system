import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

interface CancelSaleInput {
    saleId: string;
    saleNumber: string;
    reason: string;
    cancelledBy: string;
    cancelledByName: string;
}

/**
 * Cancels a sale atomically via the cancel_sale RPC.
 * The RPC (SECURITY DEFINER):
 *  1. Locks the sale row
 *  2. Restores stock for every sale_item
 *  3. Writes stock_logs
 *  4. Marks sales.is_cancelled = true
 *  5. Inserts a notification
 * All in one DB transaction — rolls back on any error.
 */
export function useCancelSale() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: CancelSaleInput) => {
            const { data, error } = await supabase.rpc('cancel_sale', {
                p_sale_id: input.saleId,
                p_cancel_reason: input.reason,
                p_user_id: input.cancelledBy,
                p_user_name: input.cancelledByName,
            });

            if (error) throw error;

            const result = data as { success: boolean; sale_number: string };
            if (!result?.success) {
                throw new Error('RPC returned unsuccessful result');
            }

            return { saleNumber: input.saleNumber };
        },

        onSuccess: (data) => {
            invalidateAndBroadcast(queryClient, [
                'sales',
                'sales-history',
                'products',
                'stock-logs',
                'notifications',
            ]);
            toast({
                title: 'Penjualan Dibatalkan',
                description: `Transaksi ${data.saleNumber} berhasil dibatalkan. Stok telah dikembalikan.`,
            });
        },

        onError: (error: Error) => {
            console.error('Cancel sale error:', error);
            toast({
                title: 'Gagal Membatalkan Penjualan',
                description: error.message || 'Terjadi kesalahan. Coba lagi.',
                variant: 'destructive',
            });
        },
    });
}

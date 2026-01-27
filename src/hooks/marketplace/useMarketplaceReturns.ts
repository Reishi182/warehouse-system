import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceReturn, MarketplaceOrder } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole } from '@/hooks/useRealtimeNotifications';

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

            await supabase
                .from('marketplace_orders')
                .update({ status: 'return_pending' })
                .eq('id', input.orderId);

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

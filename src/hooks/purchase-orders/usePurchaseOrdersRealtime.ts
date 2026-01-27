import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to subscribe to real-time changes on purchase_orders table.
 * This will automatically invalidate and refetch PO data when changes occur.
 */
export function usePurchaseOrdersRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel('purchase_orders_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'purchase_orders',
                },
                (payload) => {
                    console.log('PO Realtime change detected:', payload.eventType);
                    queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
                    queryClient.invalidateQueries({ queryKey: ['purchase_order'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
}

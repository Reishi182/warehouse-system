import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceOrder } from '@/types';

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

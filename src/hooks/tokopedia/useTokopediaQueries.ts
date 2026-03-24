import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TokopediaOrder, TokopediaOrderStatus } from '@/types';

export function useTokopediaOrders(status?: TokopediaOrderStatus | TokopediaOrderStatus[]) {
    return useQuery({
        queryKey: ['tokopedia-orders', status],
        queryFn: async () => {
            let query = supabase
                .from('tokopedia_orders')
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

            // Fetch items and logs for each order
            const ordersWithDetails = await Promise.all(
                (data || []).map(async (order) => {
                    const [{ data: items }, { data: logs }] = await Promise.all([
                        supabase
                            .from('tokopedia_order_items')
                            .select('*')
                            .eq('order_id', order.id),
                        supabase
                            .from('tokopedia_order_logs')
                            .select('*')
                            .eq('order_id', order.id)
                            .order('created_at', { ascending: true }),
                    ]);

                    return { ...order, items: items || [], logs: logs || [] };
                })
            );

            return ordersWithDetails as TokopediaOrder[];
        },
    });
}

export function useTokopediaOrder(id: string) {
    return useQuery({
        queryKey: ['tokopedia-order', id],
        queryFn: async () => {
            const { data: order, error } = await supabase
                .from('tokopedia_orders')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            const [{ data: items }, { data: logs }] = await Promise.all([
                supabase
                    .from('tokopedia_order_items')
                    .select('*')
                    .eq('order_id', id),
                supabase
                    .from('tokopedia_order_logs')
                    .select('*')
                    .eq('order_id', id)
                    .order('created_at', { ascending: true }),
            ]);

            return { ...order, items: items || [], logs: logs || [] } as TokopediaOrder;
        },
        enabled: !!id,
    });
}

// Orders that need warehouse attention (packing/shipping)
export function useTokopediaWarehouseOrders() {
    return useTokopediaOrders(['order_received', 'packing']);
}

// Stats for dashboard
export function useTokopediaStats() {
    return useQuery({
        queryKey: ['tokopedia-stats'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tokopedia_orders')
                .select('status');

            if (error) throw error;

            const orders = data || [];
            return {
                orderReceived: orders.filter(o => o.status === 'order_received').length,
                packing: orders.filter(o => o.status === 'packing').length,
                shipped: orders.filter(o => o.status === 'shipped').length,
                delivered: orders.filter(o => o.status === 'delivered').length,
                completed: orders.filter(o => o.status === 'completed').length,
                cancelled: orders.filter(o => o.status === 'cancelled').length,
                total: orders.length,
            };
        },
    });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PurchaseOrder, POStatus } from '@/types';

// Fetch all purchase orders with supplier info
export function usePurchaseOrders(statusFilter?: POStatus | POStatus[]) {
    return useQuery({
        queryKey: ['purchase_orders', statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('purchase_orders')
                .select(`
                    *,
                    supplier:suppliers(*)
                `)
                .order('created_at', { ascending: false });

            if (statusFilter) {
                if (Array.isArray(statusFilter)) {
                    query = query.in('status', statusFilter);
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as PurchaseOrder[];
        },
    });
}

// Fetch single PO with items
export function usePurchaseOrder(id: string) {
    return useQuery({
        queryKey: ['purchase_order', id],
        queryFn: async () => {
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .select(`
                    *,
                    supplier:suppliers(*)
                `)
                .eq('id', id)
                .single();

            if (poError) throw poError;

            const { data: items, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('*')
                .eq('purchase_order_id', id);

            if (itemsError) throw itemsError;

            return { ...po, items } as PurchaseOrder;
        },
        enabled: !!id,
    });
}

// Fetch POs pending receipt for specific destination
export function usePendingReceiptPOs(destination: 'gudang' | 'toko') {
    return useQuery({
        queryKey: ['purchase_orders', 'pending_receipt', destination],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                    *,
                    supplier:suppliers(*)
                `)
                .eq('status', 'pending_receipt')
                .eq('destination', destination)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch items for each PO
            const posWithItems = await Promise.all(
                (data || []).map(async (po) => {
                    const { data: items } = await supabase
                        .from('purchase_order_items')
                        .select('*')
                        .eq('purchase_order_id', po.id);
                    return { ...po, items: items || [] };
                })
            );

            return posWithItems as PurchaseOrder[];
        },
    });
}

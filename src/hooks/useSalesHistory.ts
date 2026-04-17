import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleItem, PaymentMethod, Location } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTableRealtimeUpdates } from '@/hooks/useGlobalRealtimeUpdates';

interface UseSalesHistoryResult {
    sales: Sale[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    refresh: () => Promise<void>;
}

/**
 * Dedicated hook for SalesHistory page.
 * Fetches ALL sales directly from Supabase (no limit) using React Query for caching.
 * Data persists in cache between page navigations — no reload when returning to the page.
 */
export function useSalesHistory(): UseSalesHistoryResult {
    const { user, profile, isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const isCashier = profile?.role === 'cashier';

    const fetchAllSales = useCallback(async (): Promise<Sale[]> => {
        // First get total count
        let countQuery = supabase
            .from('sales')
            .select('id', { count: 'exact', head: true });

        if (isCashier && user?.id) {
            countQuery = countQuery.eq('cashier_id', user.id);
        }

        const { count } = await countQuery;
        const totalToFetch = count || 0;

        // Fetch in batches of 500
        const BATCH_SIZE = 500;
        const allSales: Sale[] = [];

        for (let offset = 0; offset < totalToFetch; offset += BATCH_SIZE) {
            let query = supabase
                .from('sales')
                .select('id, sale_number, cashier_id, cashier_name, payment_method, stock_location, total_amount, order_discount, amount_paid, change_amount, created_at, is_exchanged, exchanged_to_sale_id, exchanged_to_sale_number, exchange_from_sale_id, exchange_from_sale_number, is_cancelled, cancelled_at, cancelled_reason, is_credit, credit_customer_name, credit_settled_at, credit_payment_method')
                .order('created_at', { ascending: false })
                .range(offset, offset + BATCH_SIZE - 1);

            if (isCashier && user?.id) {
                query = query.eq('cashier_id', user.id);
            }

            const { data, error } = await query;

            if (error) throw new Error(error.message);

            if (data && data.length > 0) {
                const saleIds = data.map((s: any) => s.id);
                
                // Fetch items separately to avoid expensive lateral JOIN in PostgreSQL
                const { data: itemsData, error: itemsError } = await supabase
                    .from('sale_items')
                    .select('id, sale_id, product_id, product_name, barcode, quantity, price, subtotal, discount')
                    .in('sale_id', saleIds);
                
                if (itemsError) throw new Error(itemsError.message);

                const itemsMap = new Map();
                (itemsData || []).forEach((item: any) => {
                    if (!itemsMap.has(item.sale_id)) {
                        itemsMap.set(item.sale_id, []);
                    }
                    itemsMap.get(item.sale_id).push(item);
                });

                const mapped = data.map((s: any): Sale => ({
                    id: s.id,
                    sale_number: s.sale_number,
                    cashier_id: s.cashier_id,
                    cashier_name: s.cashier_name,
                    payment_method: s.payment_method as PaymentMethod,
                    stock_location: s.stock_location as Location,
                    total_amount: s.total_amount,
                    order_discount: s.order_discount || 0,
                    amount_paid: s.amount_paid || 0,
                    change_amount: s.change_amount || 0,
                    is_exchanged: s.is_exchanged || false,
                    exchanged_to_sale_id: s.exchanged_to_sale_id,
                    exchanged_to_sale_number: s.exchanged_to_sale_number,
                    exchange_from_sale_id: s.exchange_from_sale_id,
                    exchange_from_sale_number: s.exchange_from_sale_number,
                    is_cancelled: s.is_cancelled || false,
                    cancelled_at: s.cancelled_at,
                    cancelled_reason: s.cancelled_reason,
                    is_credit: s.is_credit || false,
                    credit_customer_name: s.credit_customer_name,
                    credit_settled_at: s.credit_settled_at,
                    credit_payment_method: s.credit_payment_method as PaymentMethod | null,
                    created_at: s.created_at,
                    items: (itemsMap.get(s.id) || []).map((it: any): SaleItem => ({
                        id: it.id,
                        sale_id: it.sale_id,
                        product_id: it.product_id,
                        product_name: it.product_name,
                        barcode: it.barcode,
                        quantity: it.quantity,
                        price: it.price,
                        subtotal: it.subtotal,
                        discount: it.discount || 0,
                    })),
                }));
                allSales.push(...mapped);
            }
        }

        return allSales;
    }, [isCashier, user?.id]);

    const { data: sales = [], isLoading, error } = useQuery({
        queryKey: ['sales-history', user?.id, isCashier],
        queryFn: fetchAllSales,
        enabled: isAuthenticated,
        // Uses global defaults: staleTime 5min, gcTime 30min
        // → Data stays cached when navigating away and back
    });

    // Subscribe to realtime updates for sales table → auto-invalidate cache
    useTableRealtimeUpdates('sales', ['sales-history']);

    const refresh = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['sales-history'] });
    }, [queryClient]);

    return {
        sales,
        loading: isLoading,
        error: error?.message || null,
        totalCount: sales.length,
        refresh,
    };
}

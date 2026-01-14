import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockLog, Product, Location } from '@/types';

// Transform database row to StockLog type
function transformStockLog(row: any, products: Product[]): StockLog {
    const product = products.find(p => p.id === row.product_id);
    return {
        id: row.id,
        product_id: row.product_id,
        product,
        type: row.type as 'in' | 'out' | 'adjustment',
        quantity: row.quantity,
        location: row.location as Location,
        user_id: row.user_id,
        timestamp: row.timestamp,
        note: row.note,
    };
}

// Fetch all stock logs
async function fetchStockLogs(products: Product[]): Promise<StockLog[]> {
    const { data, error } = await supabase
        .from('stock_logs')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => transformStockLog(row, products));
}

// Hook to get all stock logs
export function useStockLogs(products: Product[]) {
    return useQuery({
        queryKey: ['stock-logs', products.length],
        queryFn: () => fetchStockLogs(products),
        enabled: products.length > 0,
    });
}

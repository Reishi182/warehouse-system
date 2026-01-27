import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockLog, Product, Location } from '@/types';

// Transform database row to StockLog type
function transformStockLog(row: any, products: Product[]): StockLog {
    const product = products.find(p => p.id === row.product_id);

    // Extract user profile if joined
    const userProfile = row.profiles;

    return {
        id: row.id,
        product_id: row.product_id,
        product,
        type: row.type as 'in' | 'out' | 'adjustment',
        quantity: row.quantity,
        location: row.location as Location,
        user_id: row.user_id,
        user: userProfile ? {
            id: userProfile.user_id || row.user_id,
            name: userProfile.name || 'Unknown',
            email: userProfile.email || '',
            avatar: userProfile.avatar,
        } : null,
        timestamp: row.timestamp,
        note: row.note,
        reference_type: row.reference_type,
        reference_id: row.reference_id,
        stock_before: row.stock_before,
        stock_after: row.stock_after,
    };
}

// Fetch all stock logs with user profile
async function fetchStockLogs(products: Product[]): Promise<StockLog[]> {
    const { data, error } = await supabase
        .from('stock_logs')
        .select(`
            *,
            profiles:user_id (
                user_id,
                name,
                email,
                avatar
            )
        `)
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

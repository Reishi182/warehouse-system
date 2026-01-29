import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockLog, Product, Location } from '@/types';

interface UserProfile {
    id: string;
    user_id: string;
    name: string;
    email: string;
    avatar: string | null;
}

// Transform database row to StockLog type
function transformStockLog(row: any, products: Product[], profiles: Map<string, UserProfile>): StockLog {
    const product = products.find(p => p.id === row.product_id);
    const userProfile = row.user_id ? profiles.get(row.user_id) : null;

    return {
        id: row.id,
        product_id: row.product_id,
        product,
        type: row.type as 'in' | 'out' | 'adjustment',
        quantity: row.quantity,
        location: row.location as Location,
        user_id: row.user_id,
        user: userProfile ? {
            id: userProfile.user_id,
            name: userProfile.name || 'Unknown',
            email: userProfile.email || '',
            avatar: userProfile.avatar,
        } : null,
        timestamp: row.timestamp || row.created_at,
        note: row.note,
        reference_type: row.reference_type,
        reference_id: row.reference_id,
        stock_before: row.stock_before,
        stock_after: row.stock_after,
    };
}

// Fetch all stock logs with user profiles
async function fetchStockLogs(products: Product[]): Promise<StockLog[]> {
    // Try fetching with timestamp first, then created_at as fallback
    let { data: logs, error: logsError } = await supabase
        .from('stock_logs')
        .select('*')
        .order('timestamp', { ascending: false, nullsFirst: false })
        .limit(500);

    // If error or empty, try without order (in case timestamp column doesn't exist properly)
    if (logsError || !logs || logs.length === 0) {
        console.log('[StockLogs] First fetch attempt:', { logsError, count: logs?.length || 0 });

        const fallbackResult = await supabase
            .from('stock_logs')
            .select('*')
            .limit(500);

        logsError = fallbackResult.error;
        logs = fallbackResult.data;

        console.log('[StockLogs] Fallback fetch:', { logsError, count: logs?.length || 0 });
    }

    if (logsError) {
        console.error('Error fetching stock logs:', logsError);
        throw logsError;
    }

    if (!logs || logs.length === 0) {
        console.log('[StockLogs] No stock logs found in database');
        return [];
    }

    console.log('[StockLogs] Found', logs.length, 'stock logs');

    // Get unique user IDs
    const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];

    // Fetch profiles separately
    let profiles = new Map<string, UserProfile>();
    if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, user_id, name, email, avatar')
            .in('user_id', userIds);

        if (!profilesError && profilesData) {
            profilesData.forEach(p => {
                profiles.set(p.user_id, p as UserProfile);
            });
        }
    }

    return logs.map(row => transformStockLog(row, products, profiles));
}

// Hook to get all stock logs
export function useStockLogs(products: Product[]) {
    return useQuery({
        queryKey: ['stock-logs', products.length],
        queryFn: () => fetchStockLogs(products),
        enabled: products.length > 0,
    });
}

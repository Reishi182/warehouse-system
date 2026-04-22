import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductAuditLog } from '@/types';

async function fetchProductAuditLogs(): Promise<ProductAuditLog[]> {
    const { data, error } = await supabase
        .from('product_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error('[ProductAuditLogs] Fetch error:', error);
        throw error;
    }

    return (data || []).map((row: any): ProductAuditLog => ({
        id: row.id,
        product_id: row.product_id,
        product_name: row.product_name,
        action: row.action,
        field_name: row.field_name,
        old_value: row.old_value,
        new_value: row.new_value,
        user_id: row.user_id,
        user_name: row.user_name,
        user_role: row.user_role,
        created_at: row.created_at,
    }));
}

export function useProductAuditLogs() {
    return useQuery({
        queryKey: ['product-audit-logs'],
        queryFn: fetchProductAuditLogs,
        staleTime: 30_000, // 30 seconds
    });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ActivityLog, UserRole } from '@/types';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

// Transform database row to ActivityLog type
function transformActivityLog(row: any): ActivityLog {
    return {
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name,
        user_role: row.user_role as UserRole,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        description: row.description,
        created_at: row.created_at,
    };
}

// Fetch all activity logs
async function fetchActivityLogs(): Promise<ActivityLog[]> {
    const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw error;
    return (data || []).map(transformActivityLog);
}

// Hook to get activity logs
export function useActivityLogs() {
    return useQuery({
        queryKey: ['activity-logs'],
        queryFn: fetchActivityLogs,
    });
}

// Hook to add activity log
export function useAddActivityLog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            userId?: string;
            userName: string;
            userRole: UserRole;
            action: string;
            entityType: string;
            entityId?: string | null;
            description: string;
        }) => {
            const { error } = await supabase.from('activity_logs').insert({
                user_id: data.userId,
                user_name: data.userName,
                user_role: data.userRole,
                action: data.action,
                entity_type: data.entityType,
                entity_id: data.entityId,
                description: data.description,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['activity-logs']);
        },
    });
}

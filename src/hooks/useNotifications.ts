import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

// Transform database row to Notification type
function transformNotification(row: any): Notification {
    return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type as 'info' | 'success' | 'warning' | 'error',
        read: row.read,
        created_at: row.created_at,
        link: row.link,
    };
}

// Fetch notifications for a user (user-specific + global with no user_id)
async function fetchNotifications(userId: string): Promise<Notification[]> {
    // ✅ Single query with OR filter — was previously 2 separate DB round-trips
    const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, type, read, created_at, link')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw error;
    return (data || []).map(transformNotification);
}


// Hook to get user notifications
export function useNotifications(userId?: string) {
    return useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => fetchNotifications(userId!),
        enabled: !!userId,
        staleTime: 30 * 1000, // 30 seconds
        refetchOnWindowFocus: false, // Handled by realtime channel
    });
}

// Hook to get unread count
export function useUnreadCount(notifications: Notification[]) {
    return notifications.filter(n => !n.read).length;
}

// Hook to mark notification as read
export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['notifications']);
        },
    });
}

// Hook to mark all notifications as read
export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['notifications']);
        },
    });
}

// Hook to add notification
export function useAddNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notification: {
            userId?: string;
            title: string;
            message: string;
            type: string;
            link?: string;
        }) => {
            const { error } = await supabase.from('notifications').insert({
                user_id: notification.userId,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                link: notification.link,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['notifications']);
        },
    });
}

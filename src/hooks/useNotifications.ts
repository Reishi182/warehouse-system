import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types';

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

// Fetch notifications for a user (including global notifications without user_id)
async function fetchNotifications(userId: string): Promise<Notification[]> {
    // Fetch user-specific notifications
    const { data: userNotifs, error: userError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (userError) throw userError;

    // Fetch global notifications (no user_id = visible to all)
    const { data: globalNotifs, error: globalError } = await supabase
        .from('notifications')
        .select('*')
        .is('user_id', null)
        .order('created_at', { ascending: false });

    if (globalError) throw globalError;

    // Combine and sort by created_at
    const allNotifs = [...(userNotifs || []), ...(globalNotifs || [])];
    allNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allNotifs.map(transformNotification);
}

// Hook to get user notifications
export function useNotifications(userId?: string) {
    return useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => fetchNotifications(userId!),
        enabled: !!userId,
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
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

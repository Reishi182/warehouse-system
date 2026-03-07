import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Notification, UserRole } from '@/types';
import {
    connectionManager,
    notificationQueue,
    sendNotificationWithRetry,
    sendNotificationToRoleWithRetry,
    sendNotificationToUserWithRetry,
    ConnectionStatus,
    NotificationPayload,
} from '@/lib/notificationManager';

/**
 * Hook to subscribe to real-time notifications for the current user.
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping for connection monitoring
 * - Failed notification queue with retry
 */
export function useRealtimeNotifications(userId?: string) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Subscribe to connection status changes
    useEffect(() => {
        const unsubscribe = connectionManager.onStatusChange(setConnectionStatus);
        return unsubscribe;
    }, []);

    // Main subscription effect
    useEffect(() => {
        if (!userId) return;

        const channelName = `notifications:${userId}`;

        // Create channel for notifications
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const notification = payload.new as Notification;

                    // Skip toast for 'success' notifications created by the current user
                    // These already have a toast shown by the calling code (e.g. "Produk ditambahkan")
                    // Only show realtime toast for warnings, errors, info (typically from other users/system)
                    if (notification.type !== 'success') {
                        toast({
                            title: notification.title,
                            description: notification.message,
                            variant: (notification.type as 'warning' | 'destructive' | 'info') || 'default',
                            link: notification.link || undefined,
                        });
                    }

                    // Play notification sound (optional)
                    try {
                        const audio = new Audio('/notification.mp3');
                        audio.volume = 0.3;
                        audio.play().catch(() => {/* ignore if can't play */ });
                    } catch {
                        // Ignore audio errors
                    }

                    // Invalidate notifications query to update badge count
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }
            )
            .subscribe((status) => {
                console.log(`[useRealtimeNotifications] Channel ${channelName} status:`, status);
                if (status === 'SUBSCRIBED') {
                    connectionManager.startHeartbeat();
                }
            });

        channelRef.current = channel;
        connectionManager.registerChannel(channelName, channel);

        // Process any queued failed notifications
        notificationQueue.processQueue();

        return () => {
            if (channelRef.current) {
                connectionManager.unregisterChannel(channelName);
            }
        };
    }, [userId, toast, queryClient]);

    return { connectionStatus };
}

/**
 * Send notification to all users with a specific role.
 * This queries the profiles table to find all users with the given role,
 * then creates a notification for each of them.
 */
export async function sendNotificationToRole(
    role: UserRole | UserRole[],
    notification: {
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'error';
        link?: string;
    }
) {
    try {
        // Get all users with the specified role(s)
        // Use user_id since notifications.user_id references auth.users.id
        let query = supabase.from('profiles').select('user_id');

        if (Array.isArray(role)) {
            query = query.in('role', role);
        } else {
            query = query.eq('role', role);
        }

        const { data: users, error: usersError } = await query;

        if (usersError) {
            console.error('Error fetching users for notification:', usersError);
            return;
        }

        if (!users || users.length === 0) {
            console.warn(`No users found with role: ${role}`);
            return;
        }

        console.log(`Sending notification to ${users.length} user(s) with role: ${role}`);

        // Create notifications for all users
        const notifications = users.map(user => ({
            user_id: user.user_id, // Use user_id, not id
            title: notification.title,
            message: notification.message,
            type: notification.type,
            link: notification.link,
            read: false,
        }));

        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notifications);

        if (insertError) {
            console.error('Error inserting notifications:', insertError);
        }
    } catch (error) {
        console.error('Error sending notification to role:', error);
    }
}

/**
 * Send notification to a specific user by their ID.
 * Uses retry mechanism - failed notifications are queued for later retry.
 */
export async function sendNotificationToUser(
    userId: string,
    notification: {
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'error';
        link?: string;
    }
) {
    // Use the retry-enabled version
    return sendNotificationToUserWithRetry(userId, notification);
}

// Re-export for convenience
export { sendNotificationToRoleWithRetry, sendNotificationToUserWithRetry };


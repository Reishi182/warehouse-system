import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Notification, UserRole } from '@/types';

/**
 * Hook to subscribe to real-time notifications for the current user.
 * Shows a toast when a new notification arrives and invalidates queries.
 */
export function useRealtimeNotifications(userId?: string) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!userId) return;

        // Create channel for notifications
        const channel = supabase
            .channel(`notifications:${userId}`)
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

                    // Show toast notification
                    toast({
                        title: notification.title,
                        description: notification.message,
                        action: notification.link ? (
                            <button
                                onClick={() => navigate(notification.link!)}
                                className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                Lihat
                            </button>
                        ) : undefined,
                    });

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
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [userId, toast, queryClient, navigate]);
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
        let query = supabase.from('profiles').select('id');

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

        // Create notifications for all users
        const notifications = users.map(user => ({
            user_id: user.id,
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
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                link: notification.link,
                read: false,
            });

        if (error) {
            console.error('Error sending notification to user:', error);
        }
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

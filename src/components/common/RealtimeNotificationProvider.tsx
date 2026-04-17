;
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

/**
 * Component that subscribes to real-time notifications for the current user.
 * Should be placed inside the Router context so navigation works.
 */
export function RealtimeNotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // Subscribe to real-time notifications
    useRealtimeNotifications(user?.id);

    return <>{children}</>;
}

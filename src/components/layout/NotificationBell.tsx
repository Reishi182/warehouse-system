import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useUnreadCount } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '@/types';
import { Bell, BellOff, Check, CheckCheck, Clock, Info, AlertTriangle, XCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function NotificationBell() {
    const { user } = useAuth();
    const { data: notifications = [], isLoading } = useNotifications(user?.id);
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();
    const unreadCount = useUnreadCount(notifications);
    const [open, setOpen] = useState(false);

    const recentNotifications = notifications.slice(0, 10);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markRead.mutate(notification.id);
        }
        if (notification.link) {
            setOpen(false);
            window.location.hash = notification.link;
        }
    };

    const handleMarkAllRead = () => {
        if (user?.id) {
            markAllRead.mutate(user.id);
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 max-w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Notifikasi
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {unreadCount} baru
                            </Badge>
                        )}
                    </span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={handleMarkAllRead}
                        >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Baca Semua
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isLoading ? (
                    <div className="py-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </div>
                ) : recentNotifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        <BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Tidak ada notifikasi</p>
                    </div>
                ) : (
                    <ScrollArea className="h-64">
                        {recentNotifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 cursor-pointer",
                                    !notification.read && "bg-primary/5"
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm line-clamp-1",
                                        !notification.read ? "font-medium" : "text-muted-foreground"
                                    )}>
                                        {notification.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                        {notification.message}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.created_at), {
                                                addSuffix: true,
                                                locale: id
                                            })}
                                        </span>
                                        {notification.link && (
                                            <ExternalLink className="w-3 h-3 text-primary" />
                                        )}
                                    </div>
                                </div>
                                {!notification.read && (
                                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </ScrollArea>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="justify-center text-primary font-medium">
                    <Link to="/notifications" onClick={() => setOpen(false)}>
                        Lihat Semua Notifikasi
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

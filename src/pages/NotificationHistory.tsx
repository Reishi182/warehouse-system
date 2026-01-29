import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useUnreadCount } from '@/hooks/useNotifications';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '@/types';
import {
    Bell,
    BellOff,
    Check,
    CheckCheck,
    Clock,
    Info,
    AlertTriangle,
    XCircle,
    CheckCircle,
    ExternalLink,
    Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function NotificationHistory() {
    const { user } = useAuth();
    const { data: notifications = [], isLoading } = useNotifications(user?.id);
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();
    const unreadCount = useUnreadCount(notifications);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.read;
        if (filter === 'read') return n.read;
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const handleMarkRead = (id: string) => {
        markRead.mutate(id);
    };

    const handleMarkAllRead = () => {
        if (user?.id) {
            markAllRead.mutate(user.id);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast({ title: 'Notifikasi dihapus', variant: 'success' });
        } catch (error) {
            toast({ title: 'Gagal menghapus', variant: 'destructive' });
        }
    };

    const handleClearAll = async () => {
        if (!user?.id) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id)
                .eq('read', true);

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast({ title: 'Notifikasi yang sudah dibaca dihapus', variant: 'success' });
        } catch (error) {
            toast({ title: 'Gagal menghapus', variant: 'destructive' });
        }
    };

    const navigateToLink = (notification: Notification) => {
        if (notification.link) {
            if (!notification.read) {
                markRead.mutate(notification.id);
            }
            window.location.hash = notification.link;
        }
    };

    if (isLoading) {
        return (
            <MainLayout title="Riwayat Notifikasi">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Riwayat Notifikasi">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                {/* Header - Mobile Responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">Riwayat Notifikasi</h1>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                                {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                                <CheckCheck className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Tandai Semua Dibaca</span>
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={handleClearAll} className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                            <Trash2 className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Hapus Dibaca</span>
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as any)}>
                    <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap">
                        <TabsTrigger value="all" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                            <Bell className="w-4 h-4" />
                            <span className="hidden sm:inline">Semua</span>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5">{notifications.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="unread" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                            <BellOff className="w-4 h-4" />
                            <span className="hidden sm:inline">Belum Dibaca</span>
                            {unreadCount > 0 && <Badge variant="destructive" className="text-[10px] sm:text-xs px-1.5">{unreadCount}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="read" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Sudah Dibaca</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={filter} className="mt-4">
                        {filteredNotifications.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <BellOff className="w-12 h-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Tidak ada notifikasi</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <ScrollArea className="h-[calc(100vh-320px)] sm:h-[calc(100vh-280px)]">
                                <div className="space-y-2">
                                    {filteredNotifications.map((notification) => (
                                        <Card
                                            key={notification.id}
                                            className={`transition-all hover:shadow-md cursor-pointer ${!notification.read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                                                }`}
                                        >
                                            <CardContent className="p-3 sm:p-4">
                                                <div className="flex items-start gap-2 sm:gap-4">
                                                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                                                        {getIcon(notification.type)}
                                                    </div>
                                                    <div
                                                        className="flex-1 min-w-0"
                                                        onClick={() => navigateToLink(notification)}
                                                    >
                                                        {/* Mobile: stack title and time vertically */}
                                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5 sm:gap-2">
                                                            <h4 className={`font-medium text-sm sm:text-base line-clamp-2 sm:line-clamp-1 ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                                {notification.title}
                                                            </h4>
                                                            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                                                                <Clock className="w-3 h-3" />
                                                                {formatDistanceToNow(new Date(notification.created_at), {
                                                                    addSuffix: true,
                                                                    locale: id
                                                                })}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        {notification.link && (
                                                            <div className="flex items-center gap-1 text-xs text-primary mt-1.5 sm:mt-2">
                                                                <ExternalLink className="w-3 h-3" />
                                                                Lihat Detail
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Action buttons - stacked on mobile */}
                                                    <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 flex-shrink-0">
                                                        {!notification.read && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 sm:h-8 sm:w-8"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkRead(notification.id);
                                                                }}
                                                                title="Tandai sudah dibaca"
                                                            >
                                                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(notification.id);
                                                            }}
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useUnreadCount } from '@/hooks/useNotifications';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
    ArrowRight,
    Trash2,
    Search,
    ShoppingCart,
    Package,
    FileText,
    CreditCard,
    Inbox,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Smart icon picker based on notification content
function getSmartIcon(notification: Notification) {
    const title = notification.title.toLowerCase();
    const msg = notification.message.toLowerCase();

    if (title.includes('penjualan') || title.includes('transaksi') || msg.includes('inv/'))
        return { icon: ShoppingCart, bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' };
    if (title.includes('stok') || title.includes('produk') || title.includes('permintaan'))
        return { icon: Package, bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-800' };
    if (title.includes('surat jalan') || title.includes('laporan'))
        return { icon: FileText, bg: 'bg-violet-100 dark:bg-violet-900/40', color: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800' };
    if (title.includes('piutang') || title.includes('pembayaran') || title.includes('transfer'))
        return { icon: CreditCard, bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800' };

    switch (notification.type) {
        case 'success': return { icon: CheckCircle, bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' };
        case 'warning': return { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800' };
        case 'error': return { icon: XCircle, bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-600 dark:text-red-400', ring: 'ring-red-200 dark:ring-red-800' };
        default: return { icon: Info, bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-800' };
    }
}

// Group notifications by date
function groupByDate(notifications: Notification[]) {
    const groups: { label: string; notifications: Notification[] }[] = [];
    const map = new Map<string, Notification[]>();

    for (const n of notifications) {
        const d = new Date(n.created_at);
        let label: string;

        if (isToday(d)) {
            label = 'Hari Ini';
        } else if (isYesterday(d)) {
            label = 'Kemarin';
        } else if (isThisWeek(d, { weekStartsOn: 1 })) {
            label = 'Minggu Ini';
        } else {
            label = format(d, 'MMMM yyyy', { locale: localeId });
        }

        if (!map.has(label)) {
            map.set(label, []);
        }
        map.get(label)!.push(n);
    }

    for (const [label, notifs] of map) {
        groups.push({ label, notifications: notifs });
    }

    return groups;
}

export default function NotificationHistory() {
    const { user } = useAuth();
    const { data: notifications = [], isLoading } = useNotifications(user?.id);
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();
    const unreadCount = useUnreadCount(notifications);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredNotifications = useMemo(() => {
        let list = notifications;

        if (filter === 'unread') list = list.filter(n => !n.read);
        if (filter === 'read') list = list.filter(n => n.read);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(n =>
                n.title.toLowerCase().includes(q) ||
                n.message.toLowerCase().includes(q)
            );
        }

        return list;
    }, [notifications, filter, searchQuery]);

    const groupedNotifications = useMemo(() => groupByDate(filteredNotifications), [filteredNotifications]);

    const handleMarkRead = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        markRead.mutate(id);
    };

    const handleMarkAllRead = () => {
        if (user?.id) {
            markAllRead.mutate(user.id);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast({ title: 'Notifikasi dihapus', variant: 'success' });
        } catch {
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
        } catch {
            toast({ title: 'Gagal menghapus', variant: 'destructive' });
        }
    };

    const navigateToLink = (notification: Notification) => {
        if (!notification.read) {
            markRead.mutate(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    if (isLoading) {
        return (
            <MainLayout title="Riwayat Notifikasi">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Riwayat Notifikasi">
            <div className="max-w-3xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">Notifikasi</h1>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                                {unreadCount > 0
                                    ? <span className="text-primary font-medium">{unreadCount} belum dibaca</span>
                                    : 'Semua sudah dibaca ✓'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                        {unreadCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="text-xs sm:text-sm h-8 sm:h-9 px-3 rounded-full"
                            >
                                <CheckCheck className="w-4 h-4 mr-1.5" />
                                <span className="hidden sm:inline">Tandai</span> Semua Dibaca
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearAll}
                            className="text-xs sm:text-sm h-8 sm:h-9 px-3 rounded-full text-destructive hover:text-destructive"
                        >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            <span className="hidden sm:inline">Hapus Dibaca</span>
                        </Button>
                    </div>
                </div>

                {/* Search + Tabs */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari notifikasi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-background"
                        />
                    </div>

                    <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as typeof filter)}>
                        <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap rounded-xl bg-muted/50">
                            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm px-3 rounded-lg data-[state=active]:shadow-sm">
                                <Inbox className="w-4 h-4" />
                                Semua
                                <Badge variant="secondary" className="text-[10px] px-1.5 rounded-full">{notifications.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="unread" className="gap-1.5 text-xs sm:text-sm px-3 rounded-lg data-[state=active]:shadow-sm">
                                <Bell className="w-4 h-4" />
                                Belum Dibaca
                                {unreadCount > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 rounded-full">{unreadCount}</Badge>}
                            </TabsTrigger>
                            <TabsTrigger value="read" className="gap-1.5 text-xs sm:text-sm px-3 rounded-lg data-[state=active]:shadow-sm">
                                <Check className="w-4 h-4" />
                                Sudah Dibaca
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={filter} className="mt-4">
                            {filteredNotifications.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-16">
                                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                            <BellOff className="w-8 h-8 text-muted-foreground/50" />
                                        </div>
                                        <p className="font-medium text-muted-foreground">
                                            {searchQuery ? 'Tidak ditemukan' : 'Tidak ada notifikasi'}
                                        </p>
                                        <p className="text-sm text-muted-foreground/60 mt-1">
                                            {searchQuery
                                                ? `Tidak ada hasil untuk "${searchQuery}"`
                                                : 'Notifikasi akan muncul ketika ada aktivitas baru'}
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <ScrollArea className="h-[calc(100vh-360px)] sm:h-[calc(100vh-320px)]">
                                    <div className="space-y-6">
                                        {groupedNotifications.map((group) => (
                                            <div key={group.label}>
                                                {/* Date Group Header */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                        {group.label}
                                                    </span>
                                                    <div className="flex-1 h-px bg-border" />
                                                    <Badge variant="secondary" className="text-[10px] rounded-full px-2">
                                                        {group.notifications.length}
                                                    </Badge>
                                                </div>

                                                {/* Notification Cards */}
                                                <div className="space-y-2">
                                                    {group.notifications.map((notification) => {
                                                        const smartIcon = getSmartIcon(notification);
                                                        const IconComponent = smartIcon.icon;

                                                        return (
                                                            <Card
                                                                key={notification.id}
                                                                className={cn(
                                                                    "group cursor-pointer transition-all duration-200 hover:shadow-md border rounded-xl overflow-hidden",
                                                                    !notification.read
                                                                        ? 'bg-primary/[0.03] border-l-[3px] border-l-primary hover:bg-primary/[0.06]'
                                                                        : 'hover:bg-muted/40'
                                                                )}
                                                                onClick={() => navigateToLink(notification)}
                                                            >
                                                                <CardContent className="p-3 sm:p-4">
                                                                    <div className="flex items-start gap-3">
                                                                        {/* Icon */}
                                                                        <div className={cn(
                                                                            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ring-1",
                                                                            smartIcon.bg,
                                                                            smartIcon.ring
                                                                        )}>
                                                                            <IconComponent className={cn("w-5 h-5", smartIcon.color)} />
                                                                        </div>

                                                                        {/* Content */}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <div className="min-w-0">
                                                                                    <h4 className={cn(
                                                                                        "text-sm line-clamp-1",
                                                                                        !notification.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                                                                                    )}>
                                                                                        {notification.title}
                                                                                    </h4>
                                                                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                                                        {notification.message}
                                                                                    </p>
                                                                                </div>

                                                                                {/* Unread dot */}
                                                                                {!notification.read && (
                                                                                    <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary mt-1 ring-2 ring-primary/20" />
                                                                                )}
                                                                            </div>

                                                                            {/* Footer */}
                                                                            <div className="flex items-center justify-between mt-2">
                                                                                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                                                                                    <Clock className="w-3 h-3" />
                                                                                    <span className="text-[11px]">
                                                                                        {formatDistanceToNow(new Date(notification.created_at), {
                                                                                            addSuffix: true,
                                                                                            locale: localeId
                                                                                        })}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="flex items-center gap-1">
                                                                                    {notification.link && (
                                                                                        <span className="text-xs text-primary font-medium flex items-center gap-1 mr-1">
                                                                                            Lihat Detail <ArrowRight className="w-3 h-3" />
                                                                                        </span>
                                                                                    )}

                                                                                    {/* Action buttons - appear on hover */}
                                                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                        {!notification.read && (
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-7 w-7 rounded-lg hover:bg-emerald-100 hover:text-emerald-600"
                                                                                                onClick={(e) => handleMarkRead(notification.id, e)}
                                                                                                title="Tandai sudah dibaca"
                                                                                            >
                                                                                                <Check className="w-3.5 h-3.5" />
                                                                                            </Button>
                                                                                        )}
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-7 w-7 rounded-lg hover:bg-red-100 hover:text-red-600"
                                                                                            onClick={(e) => handleDelete(notification.id, e)}
                                                                                            title="Hapus"
                                                                                        >
                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </MainLayout>
    );
}

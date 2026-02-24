import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useUnreadCount } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '@/types';
import {
    Bell,
    BellOff,
    CheckCheck,
    Clock,
    Info,
    AlertTriangle,
    XCircle,
    CheckCircle,
    ArrowRight,
    ShoppingCart,
    Package,
    FileText,
    CreditCard,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Smart icon picker based on notification content
function getSmartIcon(notification: Notification) {
    const title = notification.title.toLowerCase();
    const msg = notification.message.toLowerCase();

    if (title.includes('penjualan') || title.includes('transaksi') || msg.includes('inv/'))
        return { icon: ShoppingCart, bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400' };
    if (title.includes('stok') || title.includes('produk') || title.includes('permintaan'))
        return { icon: Package, bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400' };
    if (title.includes('surat jalan') || title.includes('laporan'))
        return { icon: FileText, bg: 'bg-violet-100 dark:bg-violet-900/40', color: 'text-violet-600 dark:text-violet-400' };
    if (title.includes('piutang') || title.includes('pembayaran') || title.includes('transfer'))
        return { icon: CreditCard, bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-600 dark:text-amber-400' };

    // Fallback to type-based
    switch (notification.type) {
        case 'success': return { icon: CheckCircle, bg: 'bg-emerald-100 dark:bg-emerald-900/40', color: 'text-emerald-600 dark:text-emerald-400' };
        case 'warning': return { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-600 dark:text-amber-400' };
        case 'error': return { icon: XCircle, bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-600 dark:text-red-400' };
        default: return { icon: Info, bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400' };
    }
}

function formatShortTime(dateStr: string) {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: id });
}

export function NotificationBell() {
    const { user } = useAuth();
    const { data: notifications = [], isLoading } = useNotifications(user?.id);
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();
    const unreadCount = useUnreadCount(notifications);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const recentNotifications = notifications.slice(0, 8);

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markRead.mutate(notification.id);
        }
        if (notification.link) {
            setOpen(false);
            navigate(notification.link);
        }
    };

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (user?.id) {
            markAllRead.mutate(user.id);
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group">
                    <Bell className="w-5 h-5 transition-transform group-hover:scale-110" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <Badge
                                variant="destructive"
                                className="relative h-5 min-w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full"
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Badge>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-[calc(100vw-2rem)] sm:w-96 max-w-96 p-0 rounded-2xl shadow-2xl border-0 overflow-hidden"
            >
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Notifikasi</span>
                        {unreadCount > 0 && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 rounded-full">
                                {unreadCount}
                            </Badge>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-full px-3"
                            onClick={handleMarkAllRead}
                        >
                            <CheckCheck className="w-3.5 h-3.5 mr-1" />
                            Baca Semua
                        </Button>
                    )}
                </div>

                {/* Notification List */}
                {isLoading ? (
                    <div className="py-12 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto" />
                        <p className="text-xs text-muted-foreground mt-2">Memuat...</p>
                    </div>
                ) : recentNotifications.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                            <BellOff className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Tidak ada notifikasi</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Aktivitas terbaru akan muncul di sini</p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[400px]">
                        <div className="py-1">
                            {recentNotifications.map((notification) => {
                                const smartIcon = getSmartIcon(notification);
                                const IconComponent = smartIcon.icon;

                                return (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-200",
                                            "hover:bg-muted/60",
                                            !notification.read && "bg-primary/5 hover:bg-primary/10"
                                        )}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5",
                                            smartIcon.bg
                                        )}>
                                            <IconComponent className={cn("w-4.5 h-4.5", smartIcon.color)} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm line-clamp-1",
                                                    !notification.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5 ring-2 ring-primary/20" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <Clock className="w-3 h-3 text-muted-foreground/60" />
                                                <span className="text-[11px] text-muted-foreground/60">
                                                    {formatShortTime(notification.created_at)}
                                                </span>
                                                {notification.link && (
                                                    <span className="text-[11px] text-primary font-medium flex items-center gap-0.5">
                                                        Lihat <ArrowRight className="w-3 h-3" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}

                {/* Footer */}
                {recentNotifications.length > 0 && (
                    <div className="border-t">
                        <Link
                            to="/notifications"
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                        >
                            Lihat Semua Notifikasi
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRole } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/useDataStore';
import { Activity } from 'lucide-react';

type ActivityItem = {
    id: string;
    title: string;
    subtitle?: string;
    time: string;
    iconBgClass?: string;
};

export default function ActivityFeed() {
    const role = useRole();
    const notifications = useDataStore(s => s.notifications);
    const sales = useDataStore(s => s.sales);
    const cashTransfers = useDataStore(s => s.cashTransfers);
    const stockLogs = useDataStore(s => s.stockLogs);
    const suratJalans = useDataStore(s => s.suratJalans);
    const requests = useDataStore(s => s.requests);
    const activityLogs = useDataStore(s => s.activityLogs);

    const activities: ActivityItem[] = useMemo(() => {
        const global = (activityLogs || []).slice(0, 6).map((l) => ({
            id: l.id,
            title: l.user_name,
            subtitle: l.description,
            time: l.created_at,
            iconBgClass: l.action === 'product_delete'
                ? 'bg-destructive/10 text-destructive'
                : l.action === 'product_update'
                    ? 'bg-info/10 text-info'
                    : 'bg-muted text-muted-foreground',
        }));

        const items: ActivityItem[] = [];

        if (role === 'cashier') {
            sales.slice(0, 4).forEach((s) => {
                items.push({
                    id: s.id,
                    title: s.sale_number,
                    subtitle: `${s.payment_method === 'cash' ? 'Cash' : 'Transfer'} • Rp ${s.total_amount.toLocaleString('id-ID')}`,
                    time: s.created_at,
                    iconBgClass: s.payment_method === 'cash' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info',
                });
            });
            cashTransfers.slice(0, 2).forEach((t) => {
                items.push({
                    id: t.id,
                    title: 'Setoran Cash',
                    subtitle: `Rp ${t.amount.toLocaleString('id-ID')}`,
                    time: t.created_at,
                    iconBgClass: 'bg-success/10 text-success',
                });
            });
            return [...global, ...items].slice(0, 8);
        }

        if (role === 'auditor') {
            suratJalans
                .filter((s) => s.status === 'pending')
                .slice(0, 3)
                .forEach((s) => {
                    items.push({
                        id: s.id,
                        title: 'Surat Jalan Pending',
                        subtitle: s.number,
                        time: s.created_at,
                        iconBgClass: 'bg-info/10 text-info',
                    });
                });

            cashTransfers.slice(0, 3).forEach((t) => {
                items.push({
                    id: t.id,
                    title: 'Setoran Cash',
                    subtitle: `${t.cashier_name} • Rp ${t.amount.toLocaleString('id-ID')}`,
                    time: t.created_at,
                    iconBgClass: 'bg-success/10 text-success',
                });
            });

            return [...global, ...items].slice(0, 8);
        }

        if (role === 'warehouse') {
            stockLogs.slice(0, 6).forEach((l) => {
                items.push({
                    id: l.id,
                    title: l.product?.name || 'Produk',
                    subtitle: `${l.type === 'in' ? '+' : '-'}${l.quantity} • ${l.location}`,
                    time: l.timestamp,
                    iconBgClass: l.type === 'in' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
                });
            });
            return [...global, ...items].slice(0, 8);
        }

        // admin (mixed)
        notifications.slice(0, 6).forEach((n) => {
            items.push({
                id: n.id,
                title: n.title,
                subtitle: n.message,
                time: n.created_at,
                iconBgClass: n.type === 'success'
                    ? 'bg-success/10 text-success'
                    : n.type === 'warning'
                        ? 'bg-warning/10 text-warning'
                        : n.type === 'error'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-info/10 text-info',
            });
        });

        requests
            .filter((r) => r.status === 'pending')
            .slice(0, 2)
            .forEach((r) => {
                items.push({
                    id: r.id,
                    title: 'Permintaan Stok',
                    subtitle: `${r.product?.name || 'Produk'} • ${r.quantity} unit`,
                    time: r.requested_at,
                    iconBgClass: 'bg-warning/10 text-warning',
                });
            });

        return [...global, ...items].slice(0, 8);
    }, [activityLogs, cashTransfers, notifications, requests, role, sales, stockLogs, suratJalans]);

    return (
        <div className="glass-card rounded-3xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Aktivitas Terbaru</h3>
                </div>
                <span className="text-xs text-muted-foreground">Sesuai role</span>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {activities.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center">Belum ada aktivitas.</div>
                ) : (
                    activities.map((a) => (
                        <div key={a.id} className="p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-semibold', a.iconBgClass || 'bg-muted text-muted-foreground')}>
                                    {(a.title?.charAt(0) || '•').toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{a.title}</p>
                                    {a.subtitle && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.subtitle}</p>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    {formatDistanceToNow(new Date(a.time), { addSuffix: true, locale: id })}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

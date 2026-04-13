import { useMemo } from 'react';
import { Phone, Video, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/useDataStore';

type ActivityItem = {
  id: string;
  title: string;
  subtitle?: string;
  time: string;
  iconBgClass?: string;
};

function RoleLabel({ role }: { role?: string }) {
  if (!role) return null;
  const label = role === 'admin' ? 'Admin' : role === 'auditor' ? 'Auditor' : role === 'cashier' ? 'Kasir' : 'Gudang';
  const color = role === 'admin'
    ? 'bg-primary/10 text-primary'
    : role === 'auditor'
      ? 'bg-info/10 text-info'
      : role === 'cashier'
        ? 'bg-warning/10 text-warning'
        : 'bg-success/10 text-success';

  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', color)}>{label}</span>;
}

export default function RightPanel() {
  const role = useRole();
  const { profile } = useAuth();
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

    // add a bit of ops activity
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
    <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-80 flex-col border-l border-border bg-background/70 backdrop-blur-sm">
      <div className="p-6 space-y-4">
        <div className="rounded-3xl border bg-card shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl border bg-muted overflow-hidden flex items-center justify-center">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt={profile.name || 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {(profile?.name?.charAt(0) || 'U').toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{profile?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email || ''}</p>
              </div>
            </div>

          </div>

          <div className="mt-4 flex gap-2">
            <button className="h-10 w-10 rounded-xl border bg-background hover:bg-muted/60 transition-colors inline-flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </button>
            <button className="h-10 w-10 rounded-xl border bg-background hover:bg-muted/60 transition-colors inline-flex items-center justify-center">
              <Video className="w-4 h-4" />
            </button>
            <button className="h-10 w-10 rounded-xl border bg-background hover:bg-muted/60 transition-colors inline-flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border">
            <p className="font-semibold">Activity</p>
            <p className="text-xs text-muted-foreground">Ringkasan aktivitas terbaru sesuai role</p>
          </div>
          <div className="divide-y divide-border">
            {activities.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">Belum ada aktivitas.</div>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="p-5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-xs font-semibold', a.iconBgClass || 'bg-muted text-muted-foreground')}>
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
      </div>
    </aside>
  );
}

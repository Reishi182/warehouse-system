import { useMemo } from 'react';
import {
    Clock,
    Package,
    Activity,
    FileText,
    Receipt,
    ArrowUpFromLine,
    Truck,
    ClipboardList,
    Banknote,
    CreditCard,
    Ban,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StockRequest, StockLog, Sale, SuratJalan, UserRole } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DashboardActivityHubProps {
    role: UserRole | null;
    requests: StockRequest[];
    stockLogs: StockLog[];
    sales: Sale[];
    suratJalans: SuratJalan[];
}

export default function DashboardActivityHub({
    role,
    requests,
    stockLogs,
    sales,
    suratJalans,
}: DashboardActivityHubProps) {
    // Get recent items
    const recentRequests = useMemo(() => {
        return [...requests]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);
    }, [requests]);

    const recentLogs = useMemo(() => {
        return [...stockLogs]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);
    }, [stockLogs]);

    const recentSales = useMemo(() => {
        return [...sales]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);
    }, [sales]);

    const pendingSuratJalans = useMemo(() => {
        return suratJalans.filter(s => s.status === 'pending' || s.status === 'shipped');
    }, [suratJalans]);

    const formatTime = (dateString: string) => {
        try {
            return format(new Date(dateString), 'HH:mm', { locale: localeId });
        } catch {
            return '--:--';
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'dd MMM', { locale: localeId });
        } catch {
            return '--';
        }
    };

    // Determine which tabs to show based on role
    const tabs = useMemo(() => {
        const allTabs = [];

        if (role === 'warehouse' || role === 'main_office' || role === 'admin') {
            allTabs.push({
                id: 'requests',
                label: 'Permintaan',
                icon: ArrowUpFromLine,
                count: requests.filter(r => r.status === 'pending').length,
            });
        }

        if (role === 'warehouse' || role === 'admin') {
            allTabs.push({
                id: 'stockLogs',
                label: 'Aktivitas Stok',
                icon: Package,
                count: 0,
            });
        }

        if (role === 'cashier' || role === 'main_office' || role === 'admin') {
            allTabs.push({
                id: 'transactions',
                label: 'Transaksi',
                icon: Receipt,
                count: 0,
            });
        }

        if (role === 'auditor' || role === 'main_office' || role === 'admin') {
            allTabs.push({
                id: 'suratJalan',
                label: 'Surat Jalan',
                icon: Truck,
                count: pendingSuratJalans.length,
            });
        }

        allTabs.push({
            id: 'activity',
            label: 'Aktivitas',
            icon: Activity,
            count: 0,
        });

        return allTabs;
    }, [role, requests, pendingSuratJalans]);

    const defaultTab = tabs[0]?.id || 'activity';

    // Chronologically sorted combined activity feed
    const combinedActivity = useMemo(() => {
        type ActivityItem = {
            id: string;
            type: 'sale' | 'request' | 'stock';
            title: string;
            subtitle: string;
            time: string;
            date: string;
            timestamp: number;
            icon: typeof Receipt;
            iconColor: string;
            iconBg: string;
            badge?: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string };
            amount?: string;
            amountColor?: string;
        };

        const items: ActivityItem[] = [];

        recentSales.slice(0, 5).forEach(sale => {
            const ts = new Date(sale.created_at).getTime();
            items.push({
                id: `sale-${sale.id}`,
                type: 'sale',
                title: sale.sale_number,
                subtitle: `${sale.cashier_name} • ${sale.items?.length || 0} item`,
                time: formatTime(sale.created_at),
                date: formatDate(sale.created_at),
                timestamp: ts,
                icon: sale.payment_method === 'cash' ? Banknote : CreditCard,
                iconColor: sale.is_cancelled ? 'text-red-500' : sale.payment_method === 'cash' ? 'text-emerald-600' : 'text-blue-600',
                iconBg: sale.is_cancelled ? 'bg-red-50 dark:bg-red-900/20' : sale.payment_method === 'cash' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20',
                badge: sale.is_cancelled
                    ? { label: 'Dibatalkan', variant: 'destructive' }
                    : sale.is_exchanged
                        ? { label: 'Ditukar', variant: 'secondary', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' }
                        : sale.is_credit && !sale.credit_settled_at
                            ? { label: 'Piutang', variant: 'secondary', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
                            : undefined,
                amount: `+Rp ${sale.total_amount.toLocaleString('id-ID')}`,
                amountColor: sale.is_cancelled ? 'text-muted-foreground line-through' : 'text-emerald-600',
            });
        });

        recentRequests.slice(0, 5).forEach(req => {
            const ts = new Date(req.created_at).getTime();
            items.push({
                id: `req-${req.id}`,
                type: 'request',
                title: req.product_name || 'Produk',
                subtitle: `${req.requester_name} • ${req.quantity} unit`,
                time: formatTime(req.created_at),
                date: formatDate(req.created_at),
                timestamp: ts,
                icon: ArrowUpFromLine,
                iconColor: 'text-primary',
                iconBg: 'bg-primary/10',
                badge: {
                    label: req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Disetujui' : req.status === 'rejected' ? 'Ditolak' : req.status,
                    variant: req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary',
                },
            });
        });

        recentLogs.slice(0, 5).forEach(log => {
            const ts = new Date(log.created_at).getTime();
            items.push({
                id: `log-${log.id}`,
                type: 'stock',
                title: log.product_name || 'Produk',
                subtitle: `${log.location} • ${log.note || 'Tidak ada catatan'}`,
                time: formatTime(log.created_at),
                date: formatDate(log.created_at),
                timestamp: ts,
                icon: Package,
                iconColor: log.type === 'in' ? 'text-emerald-600' : 'text-amber-600',
                iconBg: log.type === 'in' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20',
                amount: `${log.type === 'in' ? '+' : '-'}${log.quantity}`,
                amountColor: log.type === 'in' ? 'text-emerald-600' : 'text-amber-600',
            });
        });

        return items.sort((a, b) => b.timestamp - a.timestamp);
    }, [recentSales, recentRequests, recentLogs]);

    // --- Render helpers ---

    const StatusBadge = ({ status }: { status: string }) => {
        const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className?: string }> = {
            pending: { variant: 'secondary', label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0' },
            approved: { variant: 'default', label: 'Disetujui' },
            rejected: { variant: 'destructive', label: 'Ditolak' },
            completed: { variant: 'outline', label: 'Selesai' },
            shipped: { variant: 'default', label: 'Dikirim', className: 'bg-blue-600 hover:bg-blue-700' },
        };
        const c = config[status] || { variant: 'secondary' as const, label: status };
        return <Badge variant={c.variant} className={cn("rounded-full text-[10px] px-2 py-0.5 font-medium", c.className)}>{c.label}</Badge>;
    };

    const TransactionItem = ({ sale }: { sale: Sale }) => {
        const isCash = sale.payment_method === 'cash';
        return (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors group">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    sale.is_cancelled ? "bg-red-50 dark:bg-red-900/20" :
                        isCash ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-blue-50 dark:bg-blue-900/20"
                )}>
                    {isCash ? (
                        <Banknote className={cn("w-5 h-5", sale.is_cancelled ? "text-red-500" : "text-emerald-600")} />
                    ) : (
                        <CreditCard className={cn("w-5 h-5", sale.is_cancelled ? "text-red-500" : "text-blue-600")} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{sale.sale_number}</p>
                        {sale.is_cancelled && (
                            <Badge variant="destructive" className="rounded-full text-[10px] px-1.5 py-0 shrink-0">
                                <Ban className="w-3 h-3 mr-0.5" />Batal
                            </Badge>
                        )}
                        {sale.is_exchanged && (
                            <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 shrink-0">
                                <RefreshCw className="w-3 h-3 mr-0.5" />Tukar
                            </Badge>
                        )}
                        {sale.is_credit && !sale.credit_settled_at && (
                            <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                                <AlertCircle className="w-3 h-3 mr-0.5" />Piutang
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {sale.items?.length || 0} item • {isCash ? 'Tunai' : 'Transfer'}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className={cn(
                        "font-bold text-sm tabular-nums",
                        sale.is_cancelled ? "text-muted-foreground line-through" : "text-emerald-600"
                    )}>
                        +Rp {sale.total_amount.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatTime(sale.created_at)}</p>
                </div>
            </div>
        );
    };

    const RequestItem = ({ req }: { req: StockRequest }) => (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ArrowUpFromLine className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{req.product_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {req.quantity} unit • {req.requester_name}
                </p>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <StatusBadge status={req.status} />
                <p className="text-[11px] text-muted-foreground">{formatTime(req.created_at)}</p>
            </div>
        </div>
    );

    const StockLogItem = ({ log }: { log: StockLog }) => (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors group">
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                log.type === 'in' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
            )}>
                <Package className={cn("w-5 h-5", log.type === 'in' ? 'text-emerald-600' : 'text-amber-600')} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{log.product_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {log.location} • {log.note || 'Tidak ada catatan'}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className={cn("font-bold text-sm tabular-nums", log.type === 'in' ? 'text-emerald-600' : 'text-amber-600')}>
                    {log.type === 'in' ? '+' : '-'}{log.quantity}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(log.created_at)}</p>
            </div>
        </div>
    );

    const SuratJalanItem = ({ sj }: { sj: SuratJalan }) => (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{sj.surat_jalan_number}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {sj.items?.length || 0} item
                </p>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <StatusBadge status={sj.status} />
                <p className="text-[11px] text-muted-foreground">{formatDate(sj.created_at)}</p>
            </div>
        </div>
    );

    const ActivityItem = ({ item }: { item: (typeof combinedActivity)[0] }) => (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.iconBg)}>
                <item.icon className={cn("w-5 h-5", item.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{item.title}</p>
                    {item.badge && (
                        <Badge variant={item.badge.variant} className={cn("rounded-full text-[10px] px-1.5 py-0 shrink-0", item.badge.className)}>
                            {item.badge.label}
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
            </div>
            <div className="text-right shrink-0">
                {item.amount ? (
                    <p className={cn("font-bold text-sm tabular-nums", item.amountColor)}>{item.amount}</p>
                ) : null}
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.time} • {item.date}</p>
            </div>
        </div>
    );

    return (
        <Card className="rounded-2xl">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                        <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Pusat Aktivitas</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Ringkasan aktivitas terbaru</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-xl flex-wrap gap-0.5">
                        {tabs.map(tab => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="rounded-lg px-3 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1.5"
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                {tab.count > 0 && (
                                    <Badge variant="destructive" className="rounded-full h-4.5 min-w-5 px-1.5 text-[10px] font-bold">
                                        {tab.count}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Permintaan Stok Tab */}
                    <TabsContent value="requests" className="mt-3">
                        <ScrollArea className="h-[340px]">
                            {recentRequests.length === 0 ? (
                                <EmptyState message="Belum ada permintaan stok" />
                            ) : (
                                <div className="space-y-1">
                                    {recentRequests.map(req => (
                                        <RequestItem key={req.id} req={req} />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Aktivitas Stok Tab */}
                    <TabsContent value="stockLogs" className="mt-3">
                        <ScrollArea className="h-[340px]">
                            {recentLogs.length === 0 ? (
                                <EmptyState message="Belum ada aktivitas stok" />
                            ) : (
                                <div className="space-y-1">
                                    {recentLogs.map(log => (
                                        <StockLogItem key={log.id} log={log} />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Transaksi Tab */}
                    <TabsContent value="transactions" className="mt-3">
                        <ScrollArea className="h-[340px]">
                            {recentSales.length === 0 ? (
                                <EmptyState message="Belum ada transaksi" />
                            ) : (
                                <div className="space-y-1">
                                    {recentSales.map(sale => (
                                        <TransactionItem key={sale.id} sale={sale} />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Surat Jalan Tab */}
                    <TabsContent value="suratJalan" className="mt-3">
                        <ScrollArea className="h-[340px]">
                            {pendingSuratJalans.length === 0 ? (
                                <EmptyState message="Tidak ada surat jalan pending" />
                            ) : (
                                <div className="space-y-1">
                                    {pendingSuratJalans.map(sj => (
                                        <SuratJalanItem key={sj.id} sj={sj} />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Aktivitas Tab — sorted chronologically */}
                    <TabsContent value="activity" className="mt-3">
                        <ScrollArea className="h-[340px]">
                            {combinedActivity.length === 0 ? (
                                <EmptyState message="Belum ada aktivitas" />
                            ) : (
                                <div className="space-y-1">
                                    {combinedActivity.map(item => (
                                        <ActivityItem key={item.id} item={item} />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                <FileText className="w-8 h-8 opacity-30" />
            </div>
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs mt-1 opacity-60">Silakan cek kembali nanti</p>
        </div>
    );
}

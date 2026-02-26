import { useMemo } from 'react';
import {
    Clock,
    Package,
    Activity,
    FileText,
    Receipt,
    ArrowUpFromLine,
    Truck,
    ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StockRequest, StockLog, Sale, SuratJalan, UserRole } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
            pending: { variant: 'secondary', label: 'Pending' },
            approved: { variant: 'default', label: 'Disetujui' },
            rejected: { variant: 'destructive', label: 'Ditolak' },
            completed: { variant: 'outline', label: 'Selesai' },
            shipped: { variant: 'default', label: 'Dikirim' },
        };
        const config = variants[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant} className="rounded-full text-xs">{config.label}</Badge>;
    };

    // Determine which tabs to show based on role
    const tabs = useMemo(() => {
        const allTabs = [];

        // Permintaan Stok - for warehouse, main_office, admin
        if (role === 'warehouse' || role === 'main_office' || role === 'admin') {
            allTabs.push({
                id: 'requests',
                label: 'Permintaan',
                icon: ArrowUpFromLine,
                count: requests.filter(r => r.status === 'pending').length,
            });
        }

        // Aktivitas Stok - for warehouse, admin
        if (role === 'warehouse' || role === 'admin') {
            allTabs.push({
                id: 'stockLogs',
                label: 'Aktivitas Stok',
                icon: Package,
                count: 0,
            });
        }

        // Transaksi - for cashier, main_office, admin
        if (role === 'cashier' || role === 'main_office' || role === 'admin') {
            allTabs.push({
                id: 'transactions',
                label: 'Transaksi',
                icon: Receipt,
                count: 0,
            });
        }

        // Surat Jalan - for auditor, main_office, admin
        if (role === 'auditor' || role === 'main_office' || role === 'admin') {
            allTabs.push({
                id: 'suratJalan',
                label: 'Surat Jalan',
                icon: Truck,
                count: pendingSuratJalans.length,
            });
        }

        // Activity Feed - for all
        allTabs.push({
            id: 'activity',
            label: 'Aktivitas',
            icon: Activity,
            count: 0,
        });

        return allTabs;
    }, [role, requests, pendingSuratJalans]);

    const defaultTab = tabs[0]?.id || 'activity';

    return (
        <Card className="rounded-2xl border-0 shadow-lg">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Pusat Aktivitas</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-xl flex-wrap gap-1">
                        {tabs.map(tab => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="rounded-lg px-3 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1.5"
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                {tab.count > 0 && (
                                    <Badge variant="secondary" className="rounded-full h-5 min-w-5 px-1.5 text-xs">
                                        {tab.count}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Permintaan Stok Tab */}
                    <TabsContent value="requests" className="mt-4">
                        <ScrollArea className="h-[300px]">
                            {recentRequests.length === 0 ? (
                                <EmptyState message="Belum ada permintaan stok" />
                            ) : (
                                <div className="space-y-2">
                                    {recentRequests.map(req => (
                                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <ArrowUpFromLine className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{req.product_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {req.quantity} unit • {req.requester_name}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {getStatusBadge(req.status)}
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatTime(req.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Aktivitas Stok Tab */}
                    <TabsContent value="stockLogs" className="mt-4">
                        <ScrollArea className="h-[300px]">
                            {recentLogs.length === 0 ? (
                                <EmptyState message="Belum ada aktivitas stok" />
                            ) : (
                                <div className="space-y-2">
                                    {recentLogs.map(log => (
                                        <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className={`p-2 rounded-lg ${log.type === 'in' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                                                <Package className={`w-4 h-4 ${log.type === 'in' ? 'text-green-600' : 'text-amber-600'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{log.product_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {log.location} • {log.note || 'Tidak ada catatan'}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`font-bold text-sm ${log.type === 'in' ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {log.type === 'in' ? '+' : '-'}{log.quantity}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(log.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Transaksi Tab */}
                    <TabsContent value="transactions" className="mt-4">
                        <ScrollArea className="h-[300px]">
                            {recentSales.length === 0 ? (
                                <EmptyState message="Belum ada transaksi" />
                            ) : (
                                <div className="space-y-2">
                                    {recentSales.map(sale => (
                                        <div key={sale.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className={`p-2 rounded-lg ${sale.payment_method === 'cash' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                                                <Receipt className={`w-4 h-4 ${sale.payment_method === 'cash' ? 'text-emerald-600' : 'text-blue-600'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{sale.sale_number}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {sale.items?.length || 0} item • {sale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-bold text-sm text-green-600">
                                                    +Rp {sale.total_amount.toLocaleString('id-ID')}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatTime(sale.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Surat Jalan Tab */}
                    <TabsContent value="suratJalan" className="mt-4">
                        <ScrollArea className="h-[300px]">
                            {pendingSuratJalans.length === 0 ? (
                                <EmptyState message="Tidak ada surat jalan pending" />
                            ) : (
                                <div className="space-y-2">
                                    {pendingSuratJalans.map(sj => (
                                        <div key={sj.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <Truck className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{sj.surat_jalan_number}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {sj.items?.length || 0} item
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {getStatusBadge(sj.status)}
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatDate(sj.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Aktivitas Tab */}
                    <TabsContent value="activity" className="mt-4">
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {/* Combine recent activities from all sources */}
                                {recentRequests.slice(0, 3).map(req => (
                                    <div key={`req-${req.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <ArrowUpFromLine className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm">
                                                <span className="font-medium">{req.requester_name}</span>
                                                <span className="text-muted-foreground"> meminta </span>
                                                <span className="font-medium">{req.product_name}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">{formatTime(req.created_at)} • {formatDate(req.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                                {recentSales.slice(0, 3).map(sale => (
                                    <div key={`sale-${sale.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="p-2 rounded-lg bg-green-500/10">
                                            <Receipt className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm">
                                                <span className="text-muted-foreground">Penjualan </span>
                                                <span className="font-medium text-green-600">Rp {sale.total_amount.toLocaleString('id-ID')}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">{formatTime(sale.created_at)} • {formatDate(sale.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                                {recentLogs.slice(0, 3).map(log => (
                                    <div key={`log-${log.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className={`p-2 rounded-lg ${log.type === 'in' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                                            <Package className={`w-4 h-4 ${log.type === 'in' ? 'text-green-600' : 'text-amber-600'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm">
                                                <span className="text-muted-foreground">{log.type === 'in' ? 'Stok masuk' : 'Stok keluar'} </span>
                                                <span className="font-medium">{log.product_name}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">{formatTime(log.created_at)} • {formatDate(log.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                                {recentRequests.length === 0 && recentSales.length === 0 && recentLogs.length === 0 && (
                                    <EmptyState message="Belum ada aktivitas" />
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">{message}</p>
            <p className="text-xs">Silakan cek kembali nanti</p>
        </div>
    );
}

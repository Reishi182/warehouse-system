import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';
import { useStockLogs } from '@/hooks/useStockLogs';
import { StockLog, Location } from '@/types';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    RefreshCw,
    Search,
    Package,
    Calendar,
    Filter,
    TrendingUp,
    TrendingDown,
    Activity
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';

const locationLabels: Record<Location, string> = {
    gudang: 'Gudang',
    toko: 'Toko',
    lainnya: 'Lainnya',
};

const typeLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    in: { label: 'Masuk', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: ArrowDownToLine },
    out: { label: 'Keluar', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: ArrowUpFromLine },
    adjustment: { label: 'Penyesuaian', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: RefreshCw },
};

export default function StockHistory() {
    const { products } = useData();
    const { data: stockLogs = [], isLoading } = useStockLogs(products);

    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');
    const [locationFilter, setLocationFilter] = useState<'all' | Location>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Stats
    const stats = useMemo(() => {
        const totalIn = stockLogs.filter(l => l.type === 'in').reduce((sum, l) => sum + l.quantity, 0);
        const totalOut = stockLogs.filter(l => l.type === 'out').reduce((sum, l) => sum + l.quantity, 0);
        const totalAdjustment = stockLogs.filter(l => l.type === 'adjustment').length;
        return { totalIn, totalOut, totalAdjustment, total: stockLogs.length };
    }, [stockLogs]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return stockLogs.filter(log => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const productName = log.product?.name?.toLowerCase() || '';
                const barcode = log.product?.barcode?.toLowerCase() || '';
                const note = log.note?.toLowerCase() || '';
                if (!productName.includes(query) && !barcode.includes(query) && !note.includes(query)) {
                    return false;
                }
            }

            // Type filter
            if (typeFilter !== 'all' && log.type !== typeFilter) {
                return false;
            }

            // Location filter
            if (locationFilter !== 'all' && log.location !== locationFilter) {
                return false;
            }

            // Date range filter
            if (dateFrom || dateTo) {
                const logDate = parseISO(log.timestamp);
                const from = dateFrom ? startOfDay(parseISO(dateFrom)) : new Date(0);
                const to = dateTo ? endOfDay(parseISO(dateTo)) : new Date();
                if (!isWithinInterval(logDate, { start: from, end: to })) {
                    return false;
                }
            }

            return true;
        });
    }, [stockLogs, searchQuery, typeFilter, locationFilter, dateFrom, dateTo]);

    const clearFilters = () => {
        setSearchQuery('');
        setTypeFilter('all');
        setLocationFilter('all');
        setDateFrom('');
        setDateTo('');
    };

    return (
        <MainLayout title="History Stok" subtitle="Riwayat pergerakan stok">
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="p-3 rounded-xl bg-primary/10">
                                <Activity className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Masuk</p>
                                <p className="text-2xl font-bold text-green-600">+{stats.totalIn}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                                <TrendingDown className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Keluar</p>
                                <p className="text-2xl font-bold text-red-600">-{stats.totalOut}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <RefreshCw className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Penyesuaian</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.totalAdjustment}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Filter className="w-4 h-4" />
                            Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari produk, barcode, catatan..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Tipe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Tipe</SelectItem>
                                    <SelectItem value="in">Masuk</SelectItem>
                                    <SelectItem value="out">Keluar</SelectItem>
                                    <SelectItem value="adjustment">Penyesuaian</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={locationFilter} onValueChange={(v) => setLocationFilter(v as any)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Lokasi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Lokasi</SelectItem>
                                    <SelectItem value="gudang">Gudang</SelectItem>
                                    <SelectItem value="toko">Toko</SelectItem>
                                    <SelectItem value="lainnya">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                placeholder="Dari tanggal"
                            />
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    placeholder="Sampai tanggal"
                                    className="flex-1"
                                />
                                <Button variant="outline" size="icon" onClick={clearFilters}>
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Riwayat Pergerakan Stok
                            <Badge variant="secondary" className="ml-2">
                                {filteredLogs.length} data
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Package className="w-12 h-12 mb-4 opacity-50" />
                                <p>Tidak ada data pergerakan stok</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[500px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Waktu</TableHead>
                                            <TableHead>Produk</TableHead>
                                            <TableHead>Tipe</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead>Lokasi</TableHead>
                                            <TableHead>Catatan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLogs.map((log) => {
                                            const typeInfo = typeLabels[log.type] || typeLabels.adjustment;
                                            const TypeIcon = typeInfo.icon;
                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                                            <div>
                                                                <p className="font-medium">
                                                                    {format(parseISO(log.timestamp), 'dd MMM yyyy', { locale: id })}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {format(parseISO(log.timestamp), 'HH:mm', { locale: id })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            {log.product?.image_url ? (
                                                                <img
                                                                    src={log.product.image_url}
                                                                    alt={log.product.name}
                                                                    className="w-10 h-10 rounded-lg object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                                    <Package className="w-5 h-5 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-medium">{log.product?.name || 'Unknown'}</p>
                                                                <p className="text-xs text-muted-foreground">{log.product?.barcode}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={typeInfo.color}>
                                                            <TypeIcon className="w-3 h-3 mr-1" />
                                                            {typeInfo.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={`font-bold ${log.type === 'in' ? 'text-green-600' :
                                                                log.type === 'out' ? 'text-red-600' :
                                                                    'text-blue-600'
                                                            }`}>
                                                            {log.type === 'in' ? '+' : log.type === 'out' ? '-' : '±'}
                                                            {log.quantity}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {locationLabels[log.location] || log.location}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate">
                                                        <span className="text-muted-foreground">
                                                            {log.note || '-'}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}

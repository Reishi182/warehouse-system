import { useMemo, useState } from 'react';
import { History, Calendar, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { DateInput } from '@/components/common/DatePicker';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function sameISODate(dateTime: string, isoDate: string) {
    return dateTime.slice(0, 10) === isoDate;
}

function getYearMonth(dateTime: string) {
    return dateTime.slice(0, 7); // "2026-01"
}

export default function CashHistory() {
    const role = useRole();
    const { user } = useAuth();
    const { sales, cashTransfers, loading } = useData();

    const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));
    const [selectedMonth, setSelectedMonth] = useState<string>(toISODate(new Date()).slice(0, 7));
    const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

    const isApproverView = role === 'main_office' || role === 'admin';

    // Get all cash sales (for both views)
    const allCashSales = useMemo(() => {
        return sales.filter(
            (s) =>
                s.payment_method === 'cash' &&
                (isApproverView ? true : (!!user?.id ? s.cashier_id === user.id : true)),
        );
    }, [sales, user?.id, isApproverView]);

    // Get all approved transfers (for both views)
    const allApprovedTransfers = useMemo(() => {
        return cashTransfers.filter(
            (t) => (isApproverView ? true : (!!user?.id ? t.cashier_id === user.id : true)),
        );
    }, [cashTransfers, user?.id, isApproverView]);

    // ===== DAILY VIEW =====
    const dailyCashSales = useMemo(() => {
        return allCashSales.filter((s) => sameISODate(s.created_at, selectedDate));
    }, [allCashSales, selectedDate]);

    const dailyApprovedTransfers = useMemo(() => {
        return allApprovedTransfers.filter((t) => t.transfer_date === selectedDate);
    }, [allApprovedTransfers, selectedDate]);

    const dailyTotalCredit = useMemo(() => dailyCashSales.reduce((acc, s) => acc + s.total_amount, 0), [dailyCashSales]);
    const dailyTotalDebit = useMemo(() => dailyApprovedTransfers.reduce((acc, t) => acc + t.amount, 0), [dailyApprovedTransfers]);
    const dailySaldo = dailyTotalCredit - dailyTotalDebit;

    // Daily history with running balance
    const dailyHistoryData = useMemo(() => {
        const entries: Array<{
            id: string;
            date: string;
            description: string;
            debit: number;
            credit: number;
            type: 'sale' | 'transfer';
        }> = [];

        dailyCashSales.forEach(sale => {
            entries.push({
                id: sale.id,
                date: sale.created_at,
                description: `Penjualan ${sale.sale_number}`,
                debit: 0,
                credit: sale.total_amount,
                type: 'sale',
            });
        });

        dailyApprovedTransfers.forEach(transfer => {
            entries.push({
                id: transfer.id,
                date: transfer.created_at,
                description: `Setoran - ${transfer.note || 'Tanpa catatan'}`,
                debit: transfer.amount,
                credit: 0,
                type: 'transfer',
            });
        });

        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        return entries.map(entry => {
            runningBalance += entry.credit - entry.debit;
            return { ...entry, saldo: runningBalance };
        });
    }, [dailyCashSales, dailyApprovedTransfers]);

    // ===== MONTHLY VIEW =====
    const monthlyData = useMemo(() => {
        // Filter by selected month
        const monthlySales = allCashSales.filter((s) => getYearMonth(s.created_at) === selectedMonth);
        const monthlyTransfers = allApprovedTransfers.filter((t) => getYearMonth(t.transfer_date) === selectedMonth);

        // Group by date
        const dailyTotals: Record<string, { date: string; debit: number; credit: number }> = {};

        monthlySales.forEach(sale => {
            const dateKey = sale.created_at.slice(0, 10);
            if (!dailyTotals[dateKey]) {
                dailyTotals[dateKey] = { date: dateKey, debit: 0, credit: 0 };
            }
            dailyTotals[dateKey].credit += sale.total_amount;
        });

        monthlyTransfers.forEach(transfer => {
            const dateKey = transfer.transfer_date;
            if (!dailyTotals[dateKey]) {
                dailyTotals[dateKey] = { date: dateKey, debit: 0, credit: 0 };
            }
            dailyTotals[dateKey].debit += transfer.amount;
        });

        // Convert to array and sort
        const sortedDays = Object.values(dailyTotals).sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Calculate running balance
        let runningBalance = 0;
        return sortedDays.map(day => {
            runningBalance += day.credit - day.debit;
            return { ...day, id: day.date, saldo: runningBalance };
        });
    }, [allCashSales, allApprovedTransfers, selectedMonth]);

    const monthlyTotalCredit = useMemo(() => monthlyData.reduce((acc, d) => acc + d.credit, 0), [monthlyData]);
    const monthlyTotalDebit = useMemo(() => monthlyData.reduce((acc, d) => acc + d.debit, 0), [monthlyData]);
    const monthlySaldo = monthlyTotalCredit - monthlyTotalDebit;

    // Generate month options (last 12 months)
    const monthOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = format(d, 'MMMM yyyy', { locale: localeId });
            options.push({ value, label });
        }
        return options;
    }, []);

    if (loading) {
        return (
            <MainLayout title="Riwayat Cash" subtitle="Riwayat transaksi cash">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    // Define columns for daily history table
    type DailyHistoryType = { id: string; date: string; description: string; debit: number; credit: number; saldo: number };
    const dailyColumns: Column<DailyHistoryType>[] = [
        {
            header: 'Tanggal',
            accessorKey: 'date',
            cell: (item: DailyHistoryType) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.date), 'dd MMM yyyy HH:mm', { locale: localeId })}
                </span>
            )
        },
        {
            header: 'Keterangan',
            accessorKey: 'description',
            cell: (item: DailyHistoryType) => <span className="font-medium">{item.description}</span>
        },
        {
            header: 'Debit (Keluar)',
            accessorKey: 'debit',
            cell: (item: DailyHistoryType) => (
                <span className="text-red-600">
                    {item.debit > 0 ? `Rp ${item.debit.toLocaleString('id-ID')}` : '-'}
                </span>
            )
        },
        {
            header: 'Kredit (Masuk)',
            accessorKey: 'credit',
            cell: (item: DailyHistoryType) => (
                <span className="text-green-600">
                    {item.credit > 0 ? `Rp ${item.credit.toLocaleString('id-ID')}` : '-'}
                </span>
            )
        },
        {
            header: 'Saldo',
            accessorKey: 'saldo',
            cell: (item: DailyHistoryType) => (
                <span className="font-semibold">Rp {item.saldo.toLocaleString('id-ID')}</span>
            )
        }
    ];

    // Define columns for monthly table
    type MonthlyDataType = { id: string; date: string; debit: number; credit: number; saldo: number };
    const monthlyColumns: Column<MonthlyDataType>[] = [
        {
            header: 'Tanggal',
            accessorKey: 'date',
            cell: (item: MonthlyDataType) => (
                <span className="font-medium">
                    {format(new Date(item.date), 'dd MMMM yyyy', { locale: localeId })}
                </span>
            )
        },
        {
            header: 'Total Debit (Keluar)',
            accessorKey: 'debit',
            cell: (item: MonthlyDataType) => (
                <span className="text-red-600 font-semibold">
                    {item.debit > 0 ? `Rp ${item.debit.toLocaleString('id-ID')}` : '-'}
                </span>
            )
        },
        {
            header: 'Total Kredit (Masuk)',
            accessorKey: 'credit',
            cell: (item: MonthlyDataType) => (
                <span className="text-green-600 font-semibold">
                    {item.credit > 0 ? `Rp ${item.credit.toLocaleString('id-ID')}` : '-'}
                </span>
            )
        },
        {
            header: 'Saldo',
            accessorKey: 'saldo',
            cell: (item: MonthlyDataType) => (
                <span className="font-bold">Rp {item.saldo.toLocaleString('id-ID')}</span>
            )
        }
    ];

    return (
        <MainLayout title="Riwayat Cash" subtitle="Riwayat transaksi cash">
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Total Kredit (Masuk)"
                        value={`Rp ${allCashSales.reduce((acc, s) => acc + s.total_amount, 0).toLocaleString('id-ID')}`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Total Debit (Keluar)"
                        value={`Rp ${allApprovedTransfers.reduce((acc, t) => acc + t.amount, 0).toLocaleString('id-ID')}`}
                        icon={<TrendingDown className="w-5 h-5" />}
                        subtitleType="error"
                    />
                    <StatsCard
                        title="Saldo Bersih"
                        value={`Rp ${(allCashSales.reduce((acc, s) => acc + s.total_amount, 0) - allApprovedTransfers.reduce((acc, t) => acc + t.amount, 0)).toLocaleString('id-ID')}`}
                        icon={<Wallet className="w-5 h-5" />}
                    />
                </StatsGrid>

                <div className="space-y-6">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="daily" className="flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Harian
                            </TabsTrigger>
                            <TabsTrigger value="monthly" className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Bulanan
                            </TabsTrigger>
                        </TabsList>

                        {/* DAILY TAB */}
                        <TabsContent value="daily" className="mt-6">
                            <Card className="animate-slide-up">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <History className="w-5 h-5" />
                                            Riwayat Transaksi Harian
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Filter & Summary */}
                                    <div className="flex flex-wrap gap-4 items-end p-4 rounded-xl bg-muted/30 border">
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground">Pilih Tanggal</p>
                                            <DateInput
                                                value={selectedDate}
                                                onChange={setSelectedDate}
                                                disableFuture
                                                placeholder="Pilih tanggal"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                                <span className="text-sm text-green-600">Kredit: </span>
                                                <span className="font-bold text-sm text-green-700">Rp {dailyTotalCredit.toLocaleString('id-ID')}</span>
                                            </div>
                                            <div className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                                <span className="text-sm text-red-600">Debit: </span>
                                                <span className="font-bold text-sm text-red-700">Rp {dailyTotalDebit.toLocaleString('id-ID')}</span>
                                            </div>
                                            <div className="px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
                                                <span className="text-sm text-muted-foreground">Saldo: </span>
                                                <span className="font-bold text-sm text-primary">Rp {dailySaldo.toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Daily Table */}
                                    <BeautifulTable
                                        data={dailyHistoryData}
                                        columns={dailyColumns}
                                        title={`Transaksi (${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: localeId })})`}
                                        hideSelection
                                        hideExport
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* MONTHLY TAB */}
                        <TabsContent value="monthly" className="mt-6">
                            <Card className="animate-slide-up">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <Calendar className="w-5 h-5" />
                                            Riwayat Transaksi Bulanan
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Filter & Summary */}
                                    <div className="flex flex-wrap gap-4 items-end p-4 rounded-xl bg-muted/30 border">
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground">Pilih Bulan</p>
                                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                                <SelectTrigger className="w-[200px] rounded-xl">
                                                    <SelectValue placeholder="Pilih bulan" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {monthOptions.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                                <span className="text-xs text-green-600">Total Kredit: </span>
                                                <span className="font-bold text-green-700">Rp {monthlyTotalCredit.toLocaleString('id-ID')}</span>
                                            </div>
                                            <div className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                                <span className="text-xs text-red-600">Total Debit: </span>
                                                <span className="font-bold text-red-700">Rp {monthlyTotalDebit.toLocaleString('id-ID')}</span>
                                            </div>
                                            <div className="px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
                                                <span className="text-xs text-muted-foreground">Saldo Akhir: </span>
                                                <span className="font-bold text-primary">Rp {monthlySaldo.toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monthly Table */}
                                    <BeautifulTable
                                        data={monthlyData}
                                        columns={monthlyColumns}
                                        title={`Ringkasan per Hari (${monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth})`}
                                        hideSelection
                                        hideExport
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </MainLayout>
    );
}

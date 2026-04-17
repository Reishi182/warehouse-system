import { useState, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Wallet, ArrowDownToLine, ArrowUpFromLine,
    Receipt, DollarSign, ShoppingCart, BarChart3, Printer, Download,
} from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import MainLayout from '@/components/layout/MainLayout';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/common/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCashFlow, CashFlowDay } from '@/hooks/useCashFlow';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';

type Period = 'today' | 'week' | 'month' | 'custom';

export default function FinancialReport() {
    const now = new Date();
    const [period, setPeriod] = useState<Period>('month');
    const [customStart, setCustomStart] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(now, 'yyyy-MM-dd'));
    const printRef = useRef<HTMLDivElement>(null);

    const { startDate, endDate } = useMemo(() => {
        switch (period) {
            case 'today':
                const today = format(now, 'yyyy-MM-dd');
                return { startDate: today, endDate: today };
            case 'week':
                return {
                    startDate: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                    endDate: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                };
            case 'month':
                return {
                    startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
                    endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
                };
            case 'custom':
                return { startDate: customStart, endDate: customEnd };
            default:
                return { startDate: format(now, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
        }
    }, [period, customStart, customEnd]);

    const { data: cashFlow, isLoading } = useCashFlow(startDate, endDate);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Laporan-Keuangan-${startDate}-${endDate}`,
    });

    const formatRp = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;
    const formatRpShort = (v: number) => {
        if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
        if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
        return `Rp ${v.toLocaleString('id-ID')}`;
    };

    // Cash flow table columns
    const cashFlowColumns: Column<CashFlowDay>[] = [
        {
            header: 'Tanggal',
            accessorKey: 'date',
            cell: (item) => (
                <span className="font-medium text-sm">
                    {format(new Date(item.date), 'dd MMM', { locale: localeId })}
                </span>
            ),
        },
        {
            header: 'Cash Sales',
            accessorKey: 'cashSales',
            cell: (item) => (
                <span className="text-green-600 dark:text-green-400 text-sm">
                    {item.cashSales > 0 ? `+${formatRpShort(item.cashSales)}` : '-'}
                </span>
            ),
        },
        {
            header: 'Transfer',
            accessorKey: 'transferSales',
            cell: (item) => (
                <span className="text-blue-600 dark:text-blue-400 text-sm">
                    {item.transferSales > 0 ? `+${formatRpShort(item.transferSales)}` : '-'}
                </span>
            ),
        },
        {
            header: 'Pengeluaran',
            accessorKey: 'cashExpenses',
            cell: (item) => {
                const total = item.cashExpenses + item.transferExpenses;
                return (
                    <span className="text-red-600 dark:text-red-400 text-sm">
                        {total > 0 ? `-${formatRpShort(total)}` : '-'}
                    </span>
                );
            },
        },
        {
            header: 'Setoran',
            accessorKey: 'cashTransfers',
            cell: (item) => (
                <span className="text-orange-600 dark:text-orange-400 text-sm">
                    {item.cashTransfers > 0 ? `-${formatRpShort(item.cashTransfers)}` : '-'}
                </span>
            ),
        },
        {
            header: 'Net Cash',
            accessorKey: 'netCash',
            cell: (item) => (
                <span className={`font-semibold text-sm ${item.netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {item.netCash >= 0 ? '+' : ''}{formatRpShort(item.netCash)}
                </span>
            ),
        },
    ];

    // Chart data
    const chartData = useMemo(() => {
        if (!cashFlow) return [];
        return cashFlow.days.map(d => ({
            date: format(new Date(d.date), 'dd/MM'),
            'Cash In': d.cashIn,
            'Cash Out': d.cashOut,
            'Net': d.netCash,
            'Omzet': d.cashSales + d.transferSales,
        }));
    }, [cashFlow]);

    const periodLabel = useMemo(() => {
        switch (period) {
            case 'today': return format(now, 'dd MMMM yyyy', { locale: localeId });
            case 'week': return `${format(new Date(startDate), 'dd MMM', { locale: localeId })} - ${format(new Date(endDate), 'dd MMM yyyy', { locale: localeId })}`;
            case 'month': return format(now, 'MMMM yyyy', { locale: localeId });
            case 'custom': return `${format(new Date(startDate), 'dd MMM', { locale: localeId })} - ${format(new Date(endDate), 'dd MMM yyyy', { locale: localeId })}`;
        }
    }, [period, startDate, endDate]);

    return (
        <MainLayout
            title="Laporan Keuangan"
            subtitle="Ringkasan omzet, cash flow, pengeluaran, dan laba kotor"
            actions={
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                        <SelectTrigger className="w-[130px] rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="today">Hari Ini</SelectItem>
                            <SelectItem value="week">Minggu Ini</SelectItem>
                            <SelectItem value="month">Bulan Ini</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                    {period === 'custom' && (
                        <>
                            <DateInput value={customStart} onChange={setCustomStart} className="w-44" />
                            <span className="text-muted-foreground">—</span>
                            <DateInput value={customEnd} onChange={setCustomEnd} className="w-44" />
                        </>
                    )}
                    <Button variant="outline" className="rounded-xl" onClick={() => {
                        if (cashFlow) {
                            exportToExcel(
                                cashFlow.days.map(d => ({ date: d.date, cashSales: d.cashSales, transferSales: d.transferSales, expenses: d.cashExpenses + d.transferExpenses, transfers: d.cashTransfers, netCash: d.netCash })),
                                [
                                    { header: 'Tanggal', key: 'date', format: 'date', width: 14 },
                                    { header: 'Cash Sales', key: 'cashSales', format: 'number', width: 18 },
                                    { header: 'Transfer Sales', key: 'transferSales', format: 'number', width: 18 },
                                    { header: 'Pengeluaran', key: 'expenses', format: 'number', width: 16 },
                                    { header: 'Setoran', key: 'transfers', format: 'number', width: 14 },
                                    { header: 'Net Cash', key: 'netCash', format: 'number', width: 16 },
                                ],
                                `Laporan-Keuangan-${startDate}-${endDate}`,
                                'Cash Flow',
                                { title: 'Laporan Keuangan', period: periodLabel }
                            );
                        }
                    }}>
                        <Download className="w-4 h-4 mr-2" /> Excel
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => handlePrint()}>
                        <Printer className="w-4 h-4 mr-2" /> Cetak
                    </Button>
                </div>
            }
        >
            <div ref={printRef} className="space-y-6 print:space-y-4">
                {/* Print header */}
                <div className="hidden print:block text-center mb-6">
                    <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
                    <p className="text-muted-foreground">{periodLabel}</p>
                </div>

                {/* Summary Stats */}
                <StatsGrid columns={5}>
                    <StatsCard
                        title="Total Omzet"
                        value={formatRpShort(cashFlow?.totalOmzet || 0)}
                        subtitle="Revenue keseluruhan"
                        icon={<ShoppingCart className="w-5 h-5" />}
                        gradient="blue"
                        animationDelay={0}
                    />
                    <StatsCard
                        title="Cash Masuk"
                        value={formatRpShort(cashFlow?.totalCashIn || 0)}
                        subtitle="Sales + modal kasir"
                        icon={<ArrowDownToLine className="w-5 h-5" />}
                        gradient="green"
                        animationDelay={100}
                    />
                    <StatsCard
                        title="Cash Keluar"
                        value={formatRpShort(cashFlow?.totalCashOut || 0)}
                        subtitle="Expenses + setoran"
                        icon={<ArrowUpFromLine className="w-5 h-5" />}
                        gradient="red"
                        animationDelay={200}
                    />
                    <StatsCard
                        title="Total Pengeluaran"
                        value={formatRpShort(cashFlow?.totalExpenses || 0)}
                        subtitle="Semua metode"
                        icon={<Receipt className="w-5 h-5" />}
                        gradient="orange"
                        animationDelay={300}
                    />
                    <StatsCard
                        title="Laba Kotor"
                        value={formatRpShort(cashFlow?.totalProfit || 0)}
                        subtitle="Omzet - Pengeluaran"
                        subtitleType={(cashFlow?.totalProfit || 0) >= 0 ? 'success' : 'danger'}
                        icon={<DollarSign className="w-5 h-5" />}
                        gradient={(cashFlow?.totalProfit || 0) >= 0 ? 'emerald' : 'red'}
                        animationDelay={400}
                    />
                </StatsGrid>

                {/* Charts */}
                {chartData.length > 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
                        {/* Cash Flow Bar Chart */}
                        <Card className="rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-500" />
                                    Cash Flow Harian
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v} />
                                        <Tooltip formatter={(v: number) => formatRp(v)} />
                                        <Legend />
                                        <Bar dataKey="Cash In" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Cash Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Omzet Trend Line Chart */}
                        <Card className="rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                    Trend Omzet
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v} />
                                        <Tooltip formatter={(v: number) => formatRp(v)} />
                                        <Legend />
                                        <Line type="monotone" dataKey="Omzet" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="Net" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Cash Flow Detail Table */}
                <BeautifulTable
                    data={cashFlow?.days || []}
                    columns={cashFlowColumns}
                    title={`Detail Cash Flow — ${periodLabel}`}
                    hideSelection
                    itemsPerPage={31}
                />

                {/* Footer for print */}
                <div className="hidden print:block text-center text-xs text-muted-foreground pt-4 border-t mt-8">
                    Dicetak pada {format(now, 'dd MMMM yyyy HH:mm', { locale: localeId })}
                </div>
            </div>
        </MainLayout>
    );
}

import { useState, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateInput } from '@/components/common/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCashFlow } from '@/hooks/useCashFlow';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import { exportToExcel } from '@/lib/exportExcel';
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Printer, Download,
  ShoppingCart, Receipt, ArrowDownToLine, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type Period = 'today' | 'week' | 'month' | 'custom';

const formatRp = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;
const formatRpShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(v) >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

export default function ProfitLossReport() {
  const now = new Date();
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(now, 'yyyy-MM-dd'));
  const printRef = useRef<HTMLDivElement>(null);

  const { startDate, endDate } = (() => {
    switch (period) {
      case 'today': {
        const today = format(now, 'yyyy-MM-dd');
        return { startDate: today, endDate: today };
      }
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
  })();

  const { data: cashFlow, isLoading } = useCashFlow(startDate, endDate);

  // Fetch expense breakdown per category
  const { data: expenseBreakdown } = useQuery({
    queryKey: ['expense-breakdown', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('category, amount, payment_method')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const e of (data || [])) {
        map[e.category] = (map[e.category] || 0) + e.amount;
      }
      return Object.entries(map).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total);
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Laporan-LabaRugi-${startDate}-${endDate}`,
  });

  const handleExcelExport = () => {
    if (!cashFlow) return;
    exportToExcel(
      cashFlow.days.map(d => ({
        date: d.date,
        cashSales: d.cashSales,
        transferSales: d.transferSales,
        totalOmzet: d.cashSales + d.transferSales,
        expenses: d.cashExpenses + d.transferExpenses,
        profit: (d.cashSales + d.transferSales) - (d.cashExpenses + d.transferExpenses),
      })),
      [
        { header: 'Tanggal', key: 'date', format: 'date', width: 14 },
        { header: 'Sales Cash', key: 'cashSales', format: 'number', width: 18 },
        { header: 'Sales Transfer', key: 'transferSales', format: 'number', width: 18 },
        { header: 'Total Omzet', key: 'totalOmzet', format: 'number', width: 18 },
        { header: 'Pengeluaran', key: 'expenses', format: 'number', width: 18 },
        { header: 'Laba Kotor', key: 'profit', format: 'number', width: 18 },
      ],
      `Laporan-LabaRugi-${startDate}-${endDate}`,
      'Laba Rugi',
      {
        title: 'Laporan Laba Rugi',
        period: `${format(new Date(startDate), 'dd MMM yyyy', { locale: localeId })} - ${format(new Date(endDate), 'dd MMM yyyy', { locale: localeId })}`,
        printedAt: format(now, 'dd MMM yyyy HH:mm', { locale: localeId }),
      }
    );
  };

  const chartData = (cashFlow?.days || []).map(d => ({
    date: format(new Date(d.date), 'dd/MM'),
    Omzet: d.cashSales + d.transferSales,
    Pengeluaran: d.cashExpenses + d.transferExpenses,
    'Laba Kotor': (d.cashSales + d.transferSales) - (d.cashExpenses + d.transferExpenses),
  }));

  const totalOmzet = cashFlow?.totalOmzet || 0;
  const totalExpenses = cashFlow?.totalExpenses || 0;
  const grossProfit = totalOmzet - totalExpenses;
  const profitMargin = totalOmzet > 0 ? (grossProfit / totalOmzet) * 100 : 0;
  const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  const avgDailyRevenue = days > 0 ? totalOmzet / days : 0;

  const periodLabel = period === 'today'
    ? format(now, 'dd MMMM yyyy', { locale: localeId })
    : `${format(new Date(startDate), 'dd MMM', { locale: localeId })} - ${format(new Date(endDate), 'dd MMM yyyy', { locale: localeId })}`;

  if (isLoading) return (
    <MainLayout title="Laporan Laba Rugi" subtitle="Analisis profitabilitas bisnis">
      <PageSkeleton variant="dashboard" />
    </MainLayout>
  );

  return (
    <MainLayout
      title="Laporan Laba Rugi"
      subtitle="Analisis profitabilitas bisnis secara mendalam"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
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
              <DateInput value={customStart} onChange={setCustomStart} className="w-40" />
              <span className="text-muted-foreground">—</span>
              <DateInput value={customEnd} onChange={setCustomEnd} className="w-40" />
            </>
          )}
          <Button variant="outline" className="rounded-xl" onClick={handleExcelExport}>
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
          <h1 className="text-2xl font-bold">Laporan Laba Rugi</h1>
          <p className="text-muted-foreground">{periodLabel}</p>
        </div>

        {/* Summary Stats */}
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Omzet"
            value={formatRpShort(totalOmzet)}
            subtitle={`Rata-rata ${formatRpShort(avgDailyRevenue)}/hari`}
            icon={<ShoppingCart className="w-5 h-5" />}
            gradient="blue"
          />
          <StatsCard
            title="Total Pengeluaran"
            value={formatRpShort(totalExpenses)}
            subtitle="Cash + Transfer"
            icon={<Receipt className="w-5 h-5" />}
            gradient="red"
          />
          <StatsCard
            title="Laba Kotor"
            value={formatRpShort(grossProfit)}
            subtitle={`Margin ${profitMargin.toFixed(1)}%`}
            subtitleType={grossProfit >= 0 ? 'success' : 'danger'}
            icon={grossProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            gradient={grossProfit >= 0 ? 'emerald' : 'red'}
          />
          <StatsCard
            title="Avg Harian"
            value={formatRpShort(avgDailyRevenue)}
            subtitle={`${days} hari periode`}
            icon={<BarChart3 className="w-5 h-5" />}
            gradient="purple"
          />
        </StatsGrid>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Tren Omzet vs Pengeluaran
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="omzetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(0)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} />
                <Tooltip formatter={(v: number) => formatRp(v)} />
                <Legend />
                <Area type="monotone" dataKey="Omzet" stroke="#3b82f6" fill="url(#omzetGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="Pengeluaran" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="5 3" />
                <Area type="monotone" dataKey="Laba Kotor" stroke="#10b981" fill="url(#profitGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expense Breakdown */}
        {(expenseBreakdown || []).length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-destructive" />
              Rincian Pengeluaran per Kategori
            </h3>
            <div className="space-y-3">
              {expenseBreakdown?.map(({ cat, total }) => {
                const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{cat.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{pct.toFixed(1)}%</Badge>
                        <span className="text-muted-foreground">{formatRpShort(total)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-destructive transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* P&L Table */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Detail Harian — {periodLabel}
          </h3>
          <BeautifulTable
            data={(cashFlow?.days || []).map(d => ({
              ...d,
              totalOmzet: d.cashSales + d.transferSales,
              totalExpenses: d.cashExpenses + d.transferExpenses,
              grossProfit: (d.cashSales + d.transferSales) - (d.cashExpenses + d.transferExpenses),
            }))}
            columns={[
              {
                header: 'Tanggal',
                accessorKey: 'date',
                cell: item => <span className="text-sm font-medium">{format(new Date(item.date), 'dd MMM', { locale: localeId })}</span>,
              },
              {
                header: 'Omzet',
                accessorKey: 'totalOmzet',
                cell: item => <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">{item.totalOmzet > 0 ? formatRpShort(item.totalOmzet) : '-'}</span>,
              },
              {
                header: 'Cash',
                accessorKey: 'cashSales',
                cell: item => <span className="text-green-600 dark:text-green-400 text-sm">{item.cashSales > 0 ? formatRpShort(item.cashSales) : '-'}</span>,
              },
              {
                header: 'Transfer',
                accessorKey: 'transferSales',
                cell: item => <span className="text-indigo-600 dark:text-indigo-400 text-sm">{item.transferSales > 0 ? formatRpShort(item.transferSales) : '-'}</span>,
              },
              {
                header: 'Pengeluaran',
                accessorKey: 'totalExpenses',
                cell: item => <span className="text-red-600 dark:text-red-400 text-sm">{item.totalExpenses > 0 ? `-${formatRpShort(item.totalExpenses)}` : '-'}</span>,
              },
              {
                header: 'Laba Kotor',
                accessorKey: 'grossProfit',
                cell: item => (
                  <span className={`font-semibold text-sm ${item.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {item.grossProfit >= 0 ? '+' : ''}{formatRpShort(item.grossProfit)}
                  </span>
                ),
              },
            ] as Column<typeof cashFlow extends { days: infer D } ? D extends any[] ? D[0] & { totalOmzet: number; totalExpenses: number; grossProfit: number } : never : never>[]}
            hideSelection
            hideExport
            itemsPerPage={31}
          />
        </div>

        {/* Summary footer */}
        <div className="glass-card rounded-2xl p-5 border-2 border-primary/20">
          <h3 className="font-semibold mb-3 text-primary">Ringkasan Laba Rugi — {periodLabel}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total Omzet</span><span className="font-semibold text-blue-600">{formatRp(totalOmzet)}</span></div>
            <div className="flex justify-between"><span>Total Pengeluaran</span><span className="font-semibold text-red-600">({formatRp(totalExpenses)})</span></div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Laba Kotor</span>
              <span className={grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatRp(grossProfit)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Margin Laba</span><span>{profitMargin.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="hidden print:block text-center text-xs text-muted-foreground pt-4 border-t">
          Dicetak pada {format(now, 'dd MMMM yyyy HH:mm', { locale: localeId })}
        </div>
      </div>
    </MainLayout>
  );
}

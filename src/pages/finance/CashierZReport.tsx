import { useState, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCashierSessions } from '@/hooks/useCashierSessions';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import {
  Printer, DollarSign, CreditCard, ShoppingBag, XCircle, RefreshCcw,
  CheckCircle2, ArrowRight, Banknote, Wallet, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sale } from '@/types';

const formatRp = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;

export default function CashierZReport() {
  const now = new Date();
  const { profile } = useAuth();
  const today = format(now, 'yyyy-MM-dd');
  const printRef = useRef<HTMLDivElement>(null);
  
  const [selectedDate, setSelectedDate] = useState(today);
  const [actualCash, setActualCash] = useState('');

  const { data: sessions = [] } = useCashierSessions(selectedDate, selectedDate);

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ['z-report-sales', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, items:sale_items(*)')
        .gte('created_at', `${selectedDate}T00:00:00`)
        .lte('created_at', `${selectedDate}T23:59:59`);
      if (error) throw error;
      return (data || []) as Sale[];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['z-report-expenses', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('expense_date', selectedDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['z-report-transfers', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_transfers')
        .select('*')
        .eq('transfer_date', selectedDate);
      if (error) throw error;
      return data || [];
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Z-Report-${selectedDate}`,
  });

  // Calculations
  const validSales = sales.filter(s => !s.is_cancelled && !s.is_exchanged);
  const cancelledSales = sales.filter(s => s.is_cancelled);
  const exchangedSales = sales.filter(s => s.is_exchanged);
  const creditSales = validSales.filter(s => s.is_credit && !s.credit_settled_at);

  const cashSales = validSales.filter(s => !s.is_credit || s.credit_settled_at).reduce((sum, s) => {
    if (s.payment_method === 'cash') return sum + s.total_amount;
    if (s.payment_method === 'split') return sum + (s.amount_cash || 0);
    return sum;
  }, 0);

  const transferSales = validSales.filter(s => !s.is_credit || s.credit_settled_at).reduce((sum, s) => {
    if (s.payment_method === 'transfer') return sum + s.total_amount;
    if (s.payment_method === 'split') return sum + (s.amount_transfer || 0);
    return sum;
  }, 0);

  const splitSales = validSales.filter(s => s.payment_method === 'split');
  const totalOmzet = validSales.reduce((s, r) => s + r.total_amount, 0);
  const openingCash = sessions.reduce((s, r) => s + (r.opening_cash || 0), 0);
  const cashExpenses = expenses.filter((e: any) => e.payment_method === 'cash').reduce((s: number, r: any) => s + r.amount, 0);
  const totalTransfers = transfers.reduce((s: number, r: any) => s + r.amount, 0);

  const expectedCashInDrawer = openingCash + cashSales - cashExpenses - totalTransfers;
  const actualCashNum = actualCash ? parseFloat(actualCash.replace(/[^0-9]/g, '')) : null;
  const cashDifference = actualCashNum !== null ? actualCashNum - expectedCashInDrawer : null;

  if (isLoading) return (
    <MainLayout title="Z-Report Kasir" subtitle="Laporan penutupan kasir">
      <PageSkeleton variant="dashboard" />
    </MainLayout>
  );

  return (
    <MainLayout
      title="Z-Report Kasir"
      subtitle="Laporan penutupan shift & rekonsiliasi kas"
      actions={
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-40 rounded-xl"
          />
          <Button variant="outline" className="rounded-xl" onClick={() => handlePrint()}>
            <Printer className="w-4 h-4 mr-2" /> Cetak Z-Report
          </Button>
        </div>
      }
    >
      <div ref={printRef} className="space-y-6 print:space-y-4">
        {/* Print header */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">Z-REPORT (Laporan Penutupan Kasir)</h1>
          <p className="text-lg font-semibold">Tanggal: {format(new Date(selectedDate), 'EEEE, dd MMMM yyyy', { locale: localeId })}</p>
          <p className="text-sm text-muted-foreground">Dicetak: {format(now, 'dd/MM/yyyy HH:mm')}</p>
        </div>

        {/* Session info */}
        {sessions.length > 0 && (
          <div className="glass-card rounded-2xl p-4">
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">Sesi Kasir</h3>
            <div className="flex flex-wrap gap-3">
              {sessions.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{s.cashier_name}</p>
                    <p className="text-xs text-muted-foreground">Modal: {formatRp(s.opening_cash)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sales Summary Stats */}
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Transaksi"
            value={validSales.length}
            subtitle={`${cancelledSales.length} dibatalkan`}
            icon={<ShoppingBag className="w-5 h-5" />}
            gradient="blue"
          />
          <StatsCard
            title="Total Omzet"
            value={formatRp(totalOmzet)}
            subtitle={`${validSales.length} transaksi valid`}
            icon={<DollarSign className="w-5 h-5" />}
            gradient="emerald"
          />
          <StatsCard
            title="Cash Terkumpul"
            value={formatRp(cashSales)}
            subtitle={`${validSales.filter(s => s.payment_method === 'cash').length} trx tunai`}
            icon={<Banknote className="w-5 h-5" />}
            gradient="green"
          />
          <StatsCard
            title="Transfer"
            value={formatRp(transferSales)}
            subtitle={`${validSales.filter(s => s.payment_method === 'transfer').length} trx transfer`}
            icon={<CreditCard className="w-5 h-5" />}
            gradient="purple"
          />
        </StatsGrid>

        {/* Cash Reconciliation */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Rekonsiliasi Kas
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Modal Awal (Opening Cash)</span>
              <span className="font-semibold">{formatRp(openingCash)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b text-green-600 dark:text-green-400">
              <span>+ Penjualan Tunai</span>
              <span className="font-semibold">+ {formatRp(cashSales)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b text-red-600 dark:text-red-400">
              <span>− Pengeluaran Tunai</span>
              <span className="font-semibold">− {formatRp(cashExpenses)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b text-orange-600 dark:text-orange-400">
              <span>− Setoran ke Kantor</span>
              <span className="font-semibold">− {formatRp(totalTransfers)}</span>
            </div>
            <div className="flex justify-between items-center py-3 rounded-xl bg-primary/10 px-3 font-bold text-lg">
              <span>= Uang di Laci Seharusnya</span>
              <span className="text-primary">{formatRp(expectedCashInDrawer)}</span>
            </div>
          </div>

          {/* Actual Cash Input */}
          <div className="mt-5 p-4 rounded-xl border-2 border-dashed border-primary/30 print:hidden">
            <Label className="text-sm font-medium mb-2 block">
              Uang Fisik di Laci (hitung sekarang):
            </Label>
            <div className="flex gap-3 items-center">
              <Input
                type="text"
                placeholder="Contoh: 500000"
                value={actualCash}
                onChange={e => setActualCash(e.target.value)}
                className="rounded-xl max-w-xs"
              />
              {actualCashNum !== null && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${cashDifference === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : cashDifference !== null && cashDifference > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {cashDifference === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {cashDifference === 0 ? 'Pas!' : cashDifference !== null && cashDifference > 0 ? `Lebih ${formatRp(cashDifference)}` : `Kurang ${formatRp(Math.abs(cashDifference || 0))}`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Rincian Metode Pembayaran</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Tunai', value: cashSales, count: validSales.filter(s => s.payment_method === 'cash').length, color: 'emerald' },
              { label: 'Transfer', value: transferSales, count: validSales.filter(s => s.payment_method === 'transfer').length, color: 'blue' },
              { label: 'Split', value: splitSales.reduce((s, r) => s + r.total_amount, 0), count: splitSales.length, color: 'purple' },
              { label: 'Kredit (piutang)', value: creditSales.reduce((s, r) => s + r.total_amount, 0), count: creditSales.length, color: 'orange' },
            ].map(({ label, value, count, color }) => (
              <div key={label} className={`rounded-xl p-3 bg-${color}-50 dark:bg-${color}-900/20`}>
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="font-bold text-sm">{formatRp(value)}</p>
                <p className="text-xs text-muted-foreground">{count} transaksi</p>
              </div>
            ))}
          </div>
        </div>

        {/* Exceptions */}
        {(cancelledSales.length > 0 || exchangedSales.length > 0) && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4 text-destructive flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Transaksi Dikecualikan
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-xs text-muted-foreground">Dibatalkan</p>
                <p className="font-bold">{cancelledSales.length} transaksi</p>
                <p className="text-sm text-muted-foreground">{formatRp(cancelledSales.reduce((s, r) => s + r.total_amount, 0))}</p>
              </div>
              <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 p-3">
                <p className="text-xs text-muted-foreground">Tukar Barang</p>
                <p className="font-bold">{exchangedSales.length} transaksi</p>
              </div>
            </div>
          </div>
        )}

        {/* Expenses */}
        {expenses.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Pengeluaran Hari Ini</h3>
            <BeautifulTable
              data={expenses as any[]}
              columns={[
                { header: 'Kategori', accessorKey: 'category', cell: (e: any) => <span className="capitalize text-sm">{e.category.replace('_', ' ')}</span> },
                { header: 'Deskripsi', accessorKey: 'description', cell: (e: any) => <span className="text-sm">{e.description || '-'}</span> },
                { header: 'Metode', accessorKey: 'payment_method', cell: (e: any) => <Badge variant="outline" className="text-xs capitalize">{e.payment_method}</Badge> },
                { header: 'Jumlah', accessorKey: 'amount', cell: (e: any) => <span className="font-semibold text-sm text-destructive">{formatRp(e.amount)}</span> },
              ] as Column<any>[]}
              hideSelection hideExport
            />
          </div>
        )}

        <div className="hidden print:block text-center text-xs text-muted-foreground border-t pt-4">
          Z-Report — {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: localeId })} — Dicetak {format(now, 'HH:mm')}
        </div>
      </div>
    </MainLayout>
  );
}

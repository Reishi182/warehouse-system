import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { exportToExcel } from '@/lib/exportExcel';
import {
  AlertTriangle, Clock, CheckCircle2, Download, CreditCard, 
  TrendingUp, Users, AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface CreditSaleRow {
  id: string;
  sale_number: string;
  cashier_name: string;
  credit_customer_name: string | null;
  total_amount: number;
  created_at: string;
  is_credit: boolean;
  credit_settled_at: string | null;
  is_cancelled: boolean;
  ageingGroup: string;
  daysOutstanding: number;
}

const formatRp = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;
const formatRpShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(v) >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

function getAgeingGroup(daysOutstanding: number): string {
  if (daysOutstanding <= 7) return '≤ 7 hari';
  if (daysOutstanding <= 30) return '8 – 30 hari';
  return '> 30 hari';
}

function getAgeingColor(group: string): string {
  if (group === '≤ 7 hari') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (group === '8 – 30 hari') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

export default function CreditAgingReport() {
  const now = new Date();
  const qc = useQueryClient();
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['credit-aging'],
    queryFn: async (): Promise<CreditSaleRow[]> => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, sale_number, cashier_name, credit_customer_name, total_amount, created_at, is_credit, credit_settled_at, is_cancelled')
        .eq('is_credit', true)
        .is('credit_settled_at', null)
        .or('is_cancelled.is.null,is_cancelled.eq.false')
        .order('created_at', { ascending: true });
      if (error) throw error;

      return (data || []).map(s => {
        const days = differenceInDays(now, new Date(s.created_at));
        return {
          ...s,
          daysOutstanding: days,
          ageingGroup: getAgeingGroup(days),
        } as CreditSaleRow;
      });
    },
    refetchInterval: 60_000,
  });

  const settleMutation = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: 'cash' | 'transfer' }) => {
      const { error } = await supabase
        .from('sales')
        .update({
          credit_settled_at: new Date().toISOString(),
          credit_payment_method: method,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-aging'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Piutang berhasil ditandai lunas');
      setSettlingId(null);
    },
    onError: (e: Error) => toast.error(`Gagal: ${e.message}`),
  });

  // Stats
  const totalPiutang = useMemo(() => sales.reduce((s, r) => s + r.total_amount, 0), [sales]);
  const over30 = useMemo(() => sales.filter(r => r.daysOutstanding > 30), [sales]);
  const totalOver30 = useMemo(() => over30.reduce((s, r) => s + r.total_amount, 0), [over30]);
  const uniqueCustomers = useMemo(() => new Set(sales.map(r => r.credit_customer_name || r.cashier_name)).size, [sales]);

  const handleExcelExport = () => {
    exportToExcel(
      sales.map(s => ({
        saleNumber: s.sale_number,
        customer: s.credit_customer_name || '-',
        cashier: s.cashier_name,
        amount: s.total_amount,
        since: s.created_at,
        days: s.daysOutstanding,
        ageing: s.ageingGroup,
      })),
      [
        { header: 'No. Transaksi', key: 'saleNumber', width: 18 },
        { header: 'Pelanggan', key: 'customer', width: 24 },
        { header: 'Kasir', key: 'cashier', width: 20 },
        { header: 'Jumlah', key: 'amount', format: 'number', width: 18 },
        { header: 'Tanggal Transaksi', key: 'since', format: 'date', width: 18 },
        { header: 'Hari Outstanding', key: 'days', format: 'number', width: 16 },
        { header: 'Status Ageing', key: 'ageing', width: 14 },
      ],
      `Laporan-Aging-Piutang-${format(now, 'yyyy-MM-dd')}`,
      'Aging Piutang',
      {
        title: 'Laporan Aging Piutang (Outstanding Credit)',
        printedAt: format(now, 'dd MMM yyyy HH:mm', { locale: localeId }),
      }
    );
  };

  const columns: Column<CreditSaleRow>[] = [
    {
      header: 'No. Transaksi', accessorKey: 'sale_number',
      cell: r => <span className="font-mono text-sm font-semibold">{r.sale_number}</span>,
    },
    {
      header: 'Pelanggan', accessorKey: 'credit_customer_name',
      cell: r => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{r.credit_customer_name || '—'}</span>
          <span className="text-xs text-muted-foreground">via {r.cashier_name}</span>
        </div>
      ),
    },
    {
      header: 'Jumlah', accessorKey: 'total_amount',
      cell: r => <span className="font-semibold text-sm">{formatRp(r.total_amount)}</span>,
    },
    {
      header: 'Sejak', accessorKey: 'created_at',
      cell: r => <span className="text-sm text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy', { locale: localeId })}</span>,
    },
    {
      header: 'Outstanding', accessorKey: 'daysOutstanding',
      cell: r => (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={`text-sm font-medium ${r.daysOutstanding > 30 ? 'text-red-600 dark:text-red-400' : r.daysOutstanding > 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
            {r.daysOutstanding} hari
          </span>
        </div>
      ),
    },
    {
      header: 'Status', accessorKey: 'ageingGroup',
      cell: r => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getAgeingColor(r.ageingGroup)}`}>
          {r.ageingGroup === '> 30 hari' && <AlertCircle className="w-3 h-3" />}
          {r.ageingGroup}
        </span>
      ),
    },
    {
      header: 'Aksi', sortable: false,
      cell: r => (
        <div className="flex gap-1.5">
          {settlingId === r.id ? (
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs rounded-lg px-2" onClick={() => settleMutation.mutate({ id: r.id, method: 'cash' })} disabled={settleMutation.isPending}>
                {settleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tunai'}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg px-2" onClick={() => settleMutation.mutate({ id: r.id, method: 'transfer' })} disabled={settleMutation.isPending}>
                Transfer
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg px-2" onClick={() => setSettlingId(null)}>
                Batal
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg px-3 gap-1" onClick={() => setSettlingId(r.id)}>
              <CheckCircle2 className="w-3 h-3" /> Lunas
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return (
    <MainLayout title="Aging Piutang" subtitle="Laporan kredit yang belum lunas">
      <PageSkeleton variant="table" />
    </MainLayout>
  );

  return (
    <MainLayout
      title="Laporan Aging Piutang"
      subtitle="Daftar kredit outstanding yang belum dilunasi"
      actions={
        <Button variant="outline" className="rounded-xl" onClick={handleExcelExport} disabled={sales.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      }
    >
      <div className="space-y-6">
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Piutang"
            value={formatRpShort(totalPiutang)}
            subtitle={`${sales.length} transaksi outstanding`}
            icon={<CreditCard className="w-5 h-5" />}
            gradient="orange"
          />
          <StatsCard
            title="Piutang > 30 Hari"
            value={formatRpShort(totalOver30)}
            subtitle={`${over30.length} transaksi berisiko`}
            subtitleType={over30.length > 0 ? 'danger' : 'normal'}
            icon={<AlertTriangle className="w-5 h-5" />}
            gradient="red"
          />
          <StatsCard
            title="Pelanggan"
            value={uniqueCustomers}
            subtitle="Memiliki piutang aktif"
            icon={<Users className="w-5 h-5" />}
            gradient="blue"
          />
          <StatsCard
            title="Rata-rata per Kasus"
            value={formatRpShort(sales.length > 0 ? totalPiutang / sales.length : 0)}
            subtitle="Per transaksi kredit"
            icon={<TrendingUp className="w-5 h-5" />}
            gradient="purple"
          />
        </StatsGrid>

        {/* Ageing summary bands */}
        <div className="grid grid-cols-3 gap-4">
          {['≤ 7 hari', '8 – 30 hari', '> 30 hari'].map(group => {
            const items = sales.filter(s => s.ageingGroup === group);
            const total = items.reduce((s, r) => s + r.total_amount, 0);
            return (
              <div key={group} className={`rounded-2xl p-4 border ${getAgeingColor(group)} bg-opacity-10`}>
                <p className="text-xs font-medium opacity-80 mb-1">{group}</p>
                <p className="text-lg font-bold">{formatRpShort(total)}</p>
                <p className="text-xs opacity-70">{items.length} transaksi</p>
              </div>
            );
          })}
        </div>

        <BeautifulTable
          data={sales}
          columns={columns}
          title="Daftar Piutang Outstanding"
          hideSelection
          hideExport
          emptyState={{
            icon: <CheckCircle2 className="w-10 h-10 text-emerald-500" />,
            title: 'Tidak Ada Piutang Outstanding',
            description: 'Semua kredit sudah lunas. Bagus!',
          }}
        />
      </div>
    </MainLayout>
  );
}

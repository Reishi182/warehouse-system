import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  OverviewTab,
  FinanceTab,
  StockMovementTab,
  RequestsTab,
  SuratJalanTab,
} from '@/components/reports';
import { useData } from '@/contexts/DataContext';

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function Reports() {
  const { products, requests, suratJalans, stockLogs, sales, cashTransfers, loading } = useData();
  const [activeTab, setActiveTab] = useState('overview');
  const [financeDate, setFinanceDate] = useState<string>(toISODate(new Date()));

  // Calculate stats
  const totalProducts = products.length;
  const totalStock = products.reduce((acc, p) => acc + p.stock.gudang + p.stock.toko + p.stock.lainnya, 0);
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const approvedSuratJalans = suratJalans.filter(s => s.status === 'approved').length;

  // Chart data
  const stockByLocationData = [
    { name: 'Gudang', value: products.reduce((acc, p) => acc + p.stock.gudang, 0) },
    { name: 'Toko', value: products.reduce((acc, p) => acc + p.stock.toko, 0) },
    { name: 'Lainnya', value: products.reduce((acc, p) => acc + p.stock.lainnya, 0) },
  ];

  const requestStatusData = [
    { name: 'Pending', count: requests.filter(r => r.status === 'pending').length },
    { name: 'Disetujui', count: requests.filter(r => r.status === 'approved').length },
    { name: 'Selesai', count: requests.filter(r => r.status === 'completed').length },
    { name: 'Ditolak', count: requests.filter(r => r.status === 'rejected').length },
  ];

  // Finance data
  const salesOnDate = sales.filter(s => s.created_at.slice(0, 10) === financeDate);
  const transfersOnDate = cashTransfers.filter(t => t.transfer_date === financeDate);

  const totalSalesAmount = salesOnDate.reduce((acc, s) => acc + s.total_amount, 0);
  const totalCashSales = salesOnDate.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.total_amount, 0);
  const totalTransferSales = salesOnDate.filter(s => s.payment_method === 'transfer').reduce((acc, s) => acc + s.total_amount, 0);
  const totalCashTransfer = transfersOnDate.reduce((acc, t) => acc + t.amount, 0);
  const saldoBelumDisetor = Math.max(0, totalCashSales - totalCashTransfer);

  if (loading) {
    return (
      <MainLayout title="Laporan" subtitle="Analisis dan laporan inventaris">
        <PageSkeleton variant="dashboard" />
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Laporan" subtitle="Analisis dan laporan inventaris">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="finance">Keuangan</TabsTrigger>
            <TabsTrigger value="stock">Pergerakan Stok</TabsTrigger>
            <TabsTrigger value="requests">Permintaan</TabsTrigger>
            <TabsTrigger value="surat-jalan">Surat Jalan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab
              totalProducts={totalProducts}
              totalStock={totalStock}
              completedRequests={completedRequests}
              approvedSuratJalans={approvedSuratJalans}
              stockByLocationData={stockByLocationData}
              requestStatusData={requestStatusData}
            />
          </TabsContent>

          <TabsContent value="finance" className="mt-6">
            <FinanceTab
              financeDate={financeDate}
              onDateChange={setFinanceDate}
              salesOnDate={salesOnDate}
              transfersOnDate={transfersOnDate}
              totalSalesAmount={totalSalesAmount}
              totalCashSales={totalCashSales}
              totalTransferSales={totalTransferSales}
              totalCashTransfer={totalCashTransfer}
              saldoBelumDisetor={saldoBelumDisetor}
            />
          </TabsContent>

          <TabsContent value="stock" className="mt-6">
            <StockMovementTab stockLogs={stockLogs} />
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <RequestsTab requests={requests} />
          </TabsContent>

          <TabsContent value="surat-jalan" className="mt-6">
            <SuratJalanTab suratJalans={suratJalans} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import {
  StatsGrid,
  LowStockAlertWidget,
  DashboardActivityHub,
  RoleCharts,
  PODiscrepancyWidget,
} from '@/components/dashboard';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

export default function Dashboard() {
  const { profile } = useAuth();
  const role = useRole();
  const { products, requests, suratJalans, stockLogs, sales, cashTransfers, loading } = useData();

  if (loading) {
    return (
      <MainLayout
        title={`Selamat Datang, ${profile?.name || 'User'}`}
      >
        <PageSkeleton variant="dashboard" />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={`Selamat Datang, ${profile?.name || 'User'}`}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-1">Dashboard Overview</h2>
            <p className="text-muted-foreground text-sm">Ringkasan data dan aktivitas terbaru.</p>
          </div>
        </div>

        {/* Role-Specific Stats Grid */}
        <StatsGrid
          role={role}
          products={products}
          sales={sales}
          cashTransfers={cashTransfers}
          suratJalans={suratJalans}
          requests={requests}
        />

        {/* Role-Specific Charts */}
        <RoleCharts
          role={role}
          products={products}
          sales={sales}
          requests={requests}
          suratJalans={suratJalans}
          cashTransfers={cashTransfers}
        />

        {/* PO Discrepancy Widget - for main_office, auditor, admin */}
        {(role === 'main_office' || role === 'auditor' || role === 'admin') && (
          <PODiscrepancyWidget />
        )}

        {/* Low Stock Alert Widget - for warehouse and admin */}
        {(role === 'warehouse' || role === 'admin') && (
          <LowStockAlertWidget maxVisible={5} />
        )}

        {/* Unified Activity Hub with Tabs */}
        <DashboardActivityHub
          role={role}
          requests={requests}
          stockLogs={stockLogs}
          sales={sales}
          suratJalans={suratJalans}
        />
      </div>
    </MainLayout>
  );
}

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import {
  StatsGrid,
  LowStockAlertWidget,
  DashboardActivityHub,
  RoleCharts,
  PODiscrepancyWidget,
} from '@/components/dashboard';
import DashboardDateRangePicker, { getDefaultDateRange, DashboardDateRange } from '@/components/dashboard/DashboardDateRangePicker';
import QuickActionBar from '@/components/dashboard/QuickActionBar';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Selamat Pagi', emoji: '☀️' };
  if (hour >= 12 && hour < 15) return { text: 'Selamat Siang', emoji: '🌤️' };
  if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', emoji: '🌅' };
  return { text: 'Selamat Malam', emoji: '🌙' };
}

export default function Dashboard() {
  const { profile } = useAuth();
  const role = useRole();
  const { products, requests, suratJalans, stockLogs, sales, cashTransfers, loading } = useData();
  const [dateRange, setDateRange] = useState<DashboardDateRange>(getDefaultDateRange);

  const greeting = useMemo(() => getGreeting(), []);
  const todayFormatted = useMemo(
    () => format(new Date(), "EEEE, dd MMMM yyyy", { locale: localeId }),
    []
  );

  // Filter sales within date range
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = new Date(s.created_at);
      return saleDate >= dateRange.from && saleDate <= dateRange.to;
    });
  }, [sales, dateRange]);

  // Filter cash transfers within date range
  const filteredCashTransfers = useMemo(() => {
    return cashTransfers.filter(t => {
      const transferDate = new Date(t.transfer_date || t.created_at);
      return transferDate >= dateRange.from && transferDate <= dateRange.to;
    });
  }, [cashTransfers, dateRange]);

  if (loading) {
    return (
      <MainLayout
        title={`${greeting.text}, ${profile?.name || 'User'} ${greeting.emoji}`}
      >
        <PageSkeleton variant="dashboard" />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={`${greeting.text}, ${profile?.name || 'User'} ${greeting.emoji}`}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-1">
                Dashboard Overview
              </h2>
              <p className="text-muted-foreground text-sm capitalize">{todayFormatted}</p>
            </div>
            <DashboardDateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          {/* Quick Action Bar */}
          <QuickActionBar role={role} />
        </div>

        {/* Role-Specific Stats Grid */}
        <StatsGrid
          role={role}
          products={products}
          sales={filteredSales}
          cashTransfers={filteredCashTransfers}
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
          stockLogs={stockLogs}
        />

        {/* PO Discrepancy Widget - for main_office, auditor, admin */}
        {(role === 'main_office' || role === 'auditor' || role === 'admin') && (
          <PODiscrepancyWidget />
        )}

        {/* Low Stock Alert Widget - for warehouse, cashier, and admin */}
        {(role === 'warehouse' || role === 'cashier' || role === 'admin') && (
          <LowStockAlertWidget maxVisible={5} />
        )}

        {/* Unified Activity Hub with Tabs - for all roles */}
        <DashboardActivityHub
          role={role}
          requests={requests}
          stockLogs={stockLogs}
          sales={filteredSales}
          suratJalans={suratJalans}
        />
      </div>
    </MainLayout>
  );
}

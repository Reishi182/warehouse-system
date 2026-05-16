import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { RealtimeNotificationProvider } from "@/components/common/RealtimeNotificationProvider";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import { GlobalShortcutsProvider } from "@/components/common/GlobalShortcutsProvider";
import { PwaReloadPrompt } from "@/components/common/PwaReloadPrompt";

// Lazy load all pages for better performance (code splitting)
const Login = React.lazy(() => import("./pages/Login"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Products = React.lazy(() => import("./pages/Products"));
const StockIn = React.lazy(() => import("./pages/StockIn"));
const StockRequests = React.lazy(() => import("./pages/StockRequests"));
const Approval = React.lazy(() => import("./pages/Approval"));
const Reports = React.lazy(() => import("./pages/Reports"));
const Sales = React.lazy(() => import("./pages/Sales"));
const CashTransfer = React.lazy(() => import("./pages/CashTransfer"));
const CashHistory = React.lazy(() => import("./pages/CashHistory"));
const StockOpname = React.lazy(() => import("./pages/StockOpname"));
const StockOpnameApproval = React.lazy(() => import("./pages/StockOpnameApproval"));
const Users = React.lazy(() => import("./pages/Users"));
const Customers = React.lazy(() => import("./pages/customers/Customers"));
const Settings = React.lazy(() => import("./pages/Settings"));
const StockRequestsNew = React.lazy(() => import("@/pages/stock-request/StockRequestsNew"));
const StockShipments = React.lazy(() => import('@/pages/stock-request/StockShipments'));
const StockApprovals = React.lazy(() => import('@/pages/stock-request/StockApprovals'));
const GoodsReceipt = React.lazy(() => import('@/pages/stock-request/GoodsReceipt'));
const SuratJalanMainOffice = React.lazy(() => import('@/pages/surat-jalan/SuratJalanMainOffice'));
const SuratJalanWarehouse = React.lazy(() => import('@/pages/surat-jalan/SuratJalanWarehouse'));
const SuratJalanCashier = React.lazy(() => import('@/pages/surat-jalan/SuratJalanCashier'));
const SuratJalanAuditor = React.lazy(() => import('@/pages/surat-jalan/SuratJalanAuditor'));
const InvoiceMainOffice = React.lazy(() => import('@/pages/invoices/InvoiceMainOffice'));
const Suppliers = React.lazy(() => import('@/pages/suppliers/Suppliers'));
const PurchaseOrderMainOffice = React.lazy(() => import('@/pages/purchase-orders/PurchaseOrderMainOffice'));
const PurchaseOrderReceipt = React.lazy(() => import('@/pages/purchase-orders/PurchaseOrderReceipt'));
const PODiscrepancyReport = React.lazy(() => import('@/pages/purchase-orders/PODiscrepancyReport'));
const GeneralTransactions = React.lazy(() => import('@/pages/finance/GeneralTransactions'));
const Backorders = React.lazy(() => import('@/pages/finance/Backorders'));
const SalesHistory = React.lazy(() => import('@/pages/finance/SalesHistory'));
const Expenses = React.lazy(() => import('@/pages/finance/Expenses'));
const CashierOpeningCash = React.lazy(() => import('@/pages/finance/CashierOpeningCash'));
const FinancialReport = React.lazy(() => import('@/pages/finance/FinancialReport'));
const DailyStockReport = React.lazy(() => import('@/pages/reports/DailyStockReport'));
const SalesReport = React.lazy(() => import('@/pages/reports/SalesReport'));
const ProfitLossReport = React.lazy(() => import('@/pages/reports/ProfitLossReport'));
const CreditAgingReport = React.lazy(() => import('@/pages/reports/CreditAgingReport'));
const CashierZReport = React.lazy(() => import('@/pages/finance/CashierZReport'));
const POS = React.lazy(() => import('./pages/POS'));
const DirectOrders = React.lazy(() => import('./pages/direct-orders/DirectOrders'));
const DirectOrderDetail = React.lazy(() => import('./pages/direct-orders/DirectOrderDetail'));
const MarketplaceOrders = React.lazy(() => import('./pages/marketplace/MarketplaceOrders'));
const MarketplaceOrderDetail = React.lazy(() => import('./pages/marketplace/MarketplaceOrderDetail'));
const MarketplaceReceipt = React.lazy(() => import('./pages/marketplace/MarketplaceReceipt'));
const MarketplaceReturns = React.lazy(() => import('./pages/marketplace/MarketplaceReturns'));
const StockReturnCreate = React.lazy(() => import('@/pages/stock-return/StockReturnCreate'));
const StockReturnApproval = React.lazy(() => import('@/pages/stock-return/StockReturnApproval'));
const StockHistory = React.lazy(() => import('@/pages/stock/StockHistory'));
const NotificationHistory = React.lazy(() => import('@/pages/NotificationHistory'));
const TokopediaOrders = React.lazy(() => import('@/pages/tokopedia/TokopediaOrders'));
const TokopediaOrderDetail = React.lazy(() => import('@/pages/tokopedia/TokopediaOrderDetail'));
const TokopediaShipping = React.lazy(() => import('@/pages/tokopedia/TokopediaShipping'));
const TokopediaSalesReport = React.lazy(() => import('@/pages/tokopedia/TokopediaSalesReport'));
const SiteBuilder = React.lazy(() => import("./pages/SiteBuilder"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

import { UserRole } from '@/types';
import { useGlobalRealtimeUpdates } from '@/hooks/useGlobalRealtimeUpdates';
import { useBroadcastSync } from '@/hooks/useBroadcastSync';
import { useTabLeader } from '@/hooks/useTabLeader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Initialize low performance mode from localStorage on startup
if (typeof window !== 'undefined') {
  const isLowPerformance = localStorage.getItem('low-performance-mode') === 'true';
  if (isLowPerformance) {
    document.body.classList.add('low-performance-mode');
  }
}

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Memuat halaman...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, loading, profile } = useAuth();
  const userRole = profile?.role as UserRole | undefined;

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role authorization if allowedRoles is specified
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    console.warn(`[Security] Blocked access to route. User role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  
  // Leader election: only ONE tab subscribes to postgres_changes (expensive).
  // Broadcast sync runs on ALL tabs — it's free (WebSocket, no DB cost).
  const isLeader = useTabLeader();

  // postgres_changes for products — ONLY in the leader tab (saves realtime.subscription cost)
  useGlobalRealtimeUpdates(isLeader);

  // ✅ Broadcast sync — runs on ALL tabs (Supabase Broadcast = free, no DB hit)
  // Must be on all tabs so broadcastTableChange() can send from any tab
  useBroadcastSync();

  // Role shortcuts for cleaner route definitions
  const ALL_ROLES: UserRole[] = ['warehouse', 'cashier', 'auditor', 'admin', 'main_office'];

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        {/* Dashboard - All roles */}
        <Route path="/" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}>
            <Dashboard />
          </ProtectedRoute>
        } />



        {/* Products - All roles */}
        <Route path="/products" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}>
            <Products />
          </ProtectedRoute>
        } />

        {/* B2B / Surat Jalan Routes */}
        <Route path="/surat-jalan" element={<ProtectedRoute allowedRoles={['main_office', 'admin']}><SuratJalanMainOffice /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute allowedRoles={['main_office', 'admin']}><InvoiceMainOffice /></ProtectedRoute>} />
        <Route path="/surat-jalan/warehouse" element={<ProtectedRoute allowedRoles={['warehouse', 'admin']}><SuratJalanWarehouse /></ProtectedRoute>} />
        <Route path="/surat-jalan/cashier" element={<ProtectedRoute allowedRoles={['cashier', 'admin']}><SuratJalanCashier /></ProtectedRoute>} />
        <Route path="/surat-jalan/auditor" element={<ProtectedRoute allowedRoles={['auditor', 'admin']}><SuratJalanAuditor /></ProtectedRoute>} />

        {/* Stock Routes */}
        <Route path="/stock-in" element={
          <ProtectedRoute allowedRoles={['warehouse', 'admin']}>
            <StockIn />
          </ProtectedRoute>
        } />

        <Route path="/requests" element={
          <ProtectedRoute allowedRoles={['cashier', 'admin']}>
            <StockRequestsNew />
          </ProtectedRoute>
        } />

        <Route path="/requests/approval" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <StockApprovals />
          </ProtectedRoute>
        } />

        <Route path="/requests/shipments" element={
          <ProtectedRoute allowedRoles={['warehouse', 'admin']}>
            <StockShipments />
          </ProtectedRoute>
        } />

        <Route path="/requests/receipt" element={
          <ProtectedRoute allowedRoles={['cashier', 'admin']}>
            <GoodsReceipt />
          </ProtectedRoute>
        } />

        <Route path="/approval" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <Approval />
          </ProtectedRoute>
        } />

        {/* Report Routes */}
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['cashier', 'main_office', 'auditor', 'admin']}>
            <Reports />
          </ProtectedRoute>
        } />

        <Route path="/reports/daily-stock" element={
          <ProtectedRoute allowedRoles={['cashier', 'admin']}>
            <DailyStockReport />
          </ProtectedRoute>
        } />

        <Route path="/reports/sales" element={
          <ProtectedRoute allowedRoles={['cashier', 'main_office', 'auditor', 'admin']}>
            <SalesReport />
          </ProtectedRoute>
        } />

        {/* POS - Cashier only */}
        <Route path="/pos" element={
          <ProtectedRoute allowedRoles={['cashier', 'admin']}>
            <POS />
          </ProtectedRoute>
        } />

        {/* Finance Routes */}
        <Route path="/finance/sales-history" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <SalesHistory />
          </ProtectedRoute>
        } />

        <Route path="/sales" element={
          <ProtectedRoute allowedRoles={['cashier', 'main_office', 'admin']}>
            <Sales />
          </ProtectedRoute>
        } />

        <Route path="/cash-transfer" element={
          <ProtectedRoute allowedRoles={['cashier', 'main_office', 'admin']}>
            <CashTransfer />
          </ProtectedRoute>
        } />

        <Route path="/cash-history" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <CashHistory />
          </ProtectedRoute>
        } />

        <Route path="/stock-opname" element={
          <ProtectedRoute allowedRoles={['warehouse', 'cashier', 'auditor', 'admin']}>
            <StockOpname />
          </ProtectedRoute>
        } />

        <Route path="/stock-opname/approval" element={
          <ProtectedRoute allowedRoles={['main_office', 'auditor', 'admin']}>
            <StockOpnameApproval />
          </ProtectedRoute>
        } />

        {/* Users - Admin only */}
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Users />
          </ProtectedRoute>
        } />

        {/* Site Builder - Admin only */}
        <Route path="/site-builder" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SiteBuilder />
          </ProtectedRoute>
        } />

        {/* Settings - All roles */}
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}>
            <Settings />
          </ProtectedRoute>
        } />

        {/* Customers */}
        <Route path="/customers" element={
          <ProtectedRoute allowedRoles={['cashier', 'main_office', 'admin']}>
            <Customers />
          </ProtectedRoute>
        } />

        {/* Supplier & Purchase Order Routes */}
        <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['main_office', 'admin']}><Suppliers /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={['main_office', 'admin']}><PurchaseOrderMainOffice /></ProtectedRoute>} />

        <Route path="/purchase-orders/receipt" element={<ProtectedRoute allowedRoles={['warehouse', 'cashier', 'admin']}><PurchaseOrderReceipt /></ProtectedRoute>} />
        <Route path="/purchase-orders/discrepancy" element={<ProtectedRoute allowedRoles={['main_office', 'auditor', 'admin']}><PODiscrepancyReport /></ProtectedRoute>} />

        {/* Direct Order Routes (Supplier -> Customer) */}
        <Route path="/direct-orders" element={<ProtectedRoute allowedRoles={['main_office', 'admin']}><DirectOrders /></ProtectedRoute>} />
        <Route path="/direct-orders/:id" element={<ProtectedRoute allowedRoles={['main_office', 'admin']}><DirectOrderDetail /></ProtectedRoute>} />

        {/* Marketplace Order Routes */}
        <Route path="/marketplace" element={<ProtectedRoute allowedRoles={['main_office', 'admin']}><MarketplaceOrders /></ProtectedRoute>} />
        <Route path="/marketplace/:id" element={<ProtectedRoute allowedRoles={['main_office', 'warehouse', 'cashier', 'admin']}><MarketplaceOrderDetail /></ProtectedRoute>} />
        <Route path="/marketplace/receipt" element={<ProtectedRoute allowedRoles={['warehouse', 'cashier', 'admin']}><MarketplaceReceipt /></ProtectedRoute>} />
        <Route path="/marketplace/returns" element={<ProtectedRoute allowedRoles={['warehouse', 'cashier', 'main_office', 'admin']}><MarketplaceReturns /></ProtectedRoute>} />

        <Route path="/finance/transactions" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <GeneralTransactions />
          </ProtectedRoute>
        } />

        <Route path="/finance/backorders" element={
          <ProtectedRoute allowedRoles={['cashier', 'main_office', 'admin']}>
            <Backorders />
          </ProtectedRoute>
        } />

        <Route path="/finance/expenses" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <Expenses />
          </ProtectedRoute>
        } />

        <Route path="/finance/opening-cash" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <CashierOpeningCash />
          </ProtectedRoute>
        } />

        <Route path="/finance/report" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <FinancialReport />
          </ProtectedRoute>
        } />

        {/* Profit & Loss Report */}
        <Route path="/reports/profit-loss" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <ProfitLossReport />
          </ProtectedRoute>
        } />

        {/* Credit Aging Report */}
        <Route path="/reports/credit-aging" element={
          <ProtectedRoute allowedRoles={['main_office', 'admin']}>
            <CreditAgingReport />
          </ProtectedRoute>
        } />

        {/* Cashier Z-Report */}
        <Route path="/finance/z-report" element={
          <ProtectedRoute allowedRoles={['cashier', 'main_office', 'admin']}>
            <CashierZReport />
          </ProtectedRoute>
        } />

        {/* Stock Return Routes (Toko -> Gudang) */}
        <Route path="/stock-return" element={<ProtectedRoute allowedRoles={['cashier', 'admin']}><StockReturnCreate /></ProtectedRoute>} />
        <Route path="/stock-return/approval" element={<ProtectedRoute allowedRoles={['warehouse', 'main_office', 'auditor', 'admin']}><StockReturnApproval /></ProtectedRoute>} />

        {/* Stock History - All roles */}
        <Route path="/stock/history" element={<ProtectedRoute allowedRoles={ALL_ROLES}><StockHistory /></ProtectedRoute>} />

        {/* Notification History - All roles */}
        <Route path="/notifications" element={<ProtectedRoute allowedRoles={ALL_ROLES}><NotificationHistory /></ProtectedRoute>} />

        {/* Tokopedia Outbound Orders */}
        <Route path="/tokopedia" element={<ProtectedRoute allowedRoles={['cashier', 'admin']}><TokopediaOrders /></ProtectedRoute>} />
        <Route path="/tokopedia/shipping" element={<ProtectedRoute allowedRoles={['warehouse', 'admin']}><TokopediaShipping /></ProtectedRoute>} />
        <Route path="/tokopedia/report" element={<ProtectedRoute allowedRoles={['cashier', 'main_office', 'admin']}><TokopediaSalesReport /></ProtectedRoute>} />
        <Route path="/tokopedia/:id" element={<ProtectedRoute allowedRoles={['cashier', 'warehouse', 'admin']}><TokopediaOrderDetail /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataProvider>
            <SidebarProvider>
              <TooltipProvider>
                <Toaster />
                <OfflineIndicator />
                <HashRouter>
                  <GlobalShortcutsProvider>
                    <RealtimeNotificationProvider>
                      <PwaReloadPrompt />
                      <AppRoutes />
                    </RealtimeNotificationProvider>
                  </GlobalShortcutsProvider>
                </HashRouter>
              </TooltipProvider>
            </SidebarProvider>
          </DataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;

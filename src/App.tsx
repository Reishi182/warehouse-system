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
import PageSkeleton from "@/components/common/PageSkeleton";
import { RealtimeNotificationProvider } from "@/components/common/RealtimeNotificationProvider";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import { GlobalShortcutsProvider } from "@/components/common/GlobalShortcutsProvider";

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
const PurchaseOrderAuditor = React.lazy(() => import('@/pages/purchase-orders/PurchaseOrderAuditor'));
const PurchaseOrderReceipt = React.lazy(() => import('@/pages/purchase-orders/PurchaseOrderReceipt'));
const PODiscrepancyReport = React.lazy(() => import('@/pages/purchase-orders/PODiscrepancyReport'));
const GeneralTransactions = React.lazy(() => import('@/pages/finance/GeneralTransactions'));
const Backorders = React.lazy(() => import('@/pages/finance/Backorders'));
const SalesHistory = React.lazy(() => import('@/pages/finance/SalesHistory'));
const DailyStockReport = React.lazy(() => import('@/pages/reports/DailyStockReport'));
const DailySalesReport = React.lazy(() => import('@/pages/reports/DailySalesReport'));
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
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Guide = React.lazy(() => import("./pages/Guide"));

import { UserRole } from '@/types';

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

        {/* Guide - All roles */}
        <Route path="/guide" element={
          <ProtectedRoute allowedRoles={ALL_ROLES}>
            <Guide />
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

        <Route path="/reports/daily-sales" element={
          <ProtectedRoute allowedRoles={['cashier', 'main_office', 'auditor', 'admin']}>
            <DailySalesReport />
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
          <ProtectedRoute allowedRoles={['auditor', 'admin']}>
            <StockOpname />
          </ProtectedRoute>
        } />

        {/* Users - Admin only */}
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Users />
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
        <Route path="/purchase-orders/approval" element={<ProtectedRoute allowedRoles={['main_office', 'admin']}><PurchaseOrderAuditor /></ProtectedRoute>} />
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

        {/* Stock Return Routes (Toko -> Gudang) */}
        <Route path="/stock-return" element={<ProtectedRoute allowedRoles={['cashier', 'admin']}><StockReturnCreate /></ProtectedRoute>} />
        <Route path="/stock-return/approval" element={<ProtectedRoute allowedRoles={['main_office', 'admin']}><StockReturnApproval /></ProtectedRoute>} />

        {/* Stock History - All roles */}
        <Route path="/stock/history" element={<ProtectedRoute allowedRoles={ALL_ROLES}><StockHistory /></ProtectedRoute>} />

        {/* Notification History - All roles */}
        <Route path="/notifications" element={<ProtectedRoute allowedRoles={ALL_ROLES}><NotificationHistory /></ProtectedRoute>} />

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

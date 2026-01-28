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
const MarketplaceReceipt = React.lazy(() => import('./pages/marketplace/MarketplaceReceipt'));
const MarketplaceReturns = React.lazy(() => import('./pages/marketplace/MarketplaceReturns'));
const StockReturnCreate = React.lazy(() => import('@/pages/stock-return/StockReturnCreate'));
const StockReturnApproval = React.lazy(() => import('@/pages/stock-return/StockReturnApproval'));
const StockHistory = React.lazy(() => import('@/pages/stock/StockHistory'));
const CustomerExchange = React.lazy(() => import('@/pages/exchange/CustomerExchange'));
const NotificationHistory = React.lazy(() => import('@/pages/NotificationHistory'));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Guide = React.lazy(() => import("./pages/Guide"));

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/guide" element={
          <ProtectedRoute>
            <Guide />
          </ProtectedRoute>
        } />

        <Route path="/products" element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        } />

        <Route path="/surat-jalan" element={<ProtectedRoute><SuratJalanMainOffice /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><InvoiceMainOffice /></ProtectedRoute>} />
        <Route path="/surat-jalan/warehouse" element={<ProtectedRoute><SuratJalanWarehouse /></ProtectedRoute>} />
        <Route path="/surat-jalan/cashier" element={<ProtectedRoute><SuratJalanCashier /></ProtectedRoute>} />
        <Route path="/surat-jalan/auditor" element={<ProtectedRoute><SuratJalanAuditor /></ProtectedRoute>} />
        <Route path="/stock-in" element={
          <ProtectedRoute>
            <StockIn />
          </ProtectedRoute>
        } />

        <Route path="/requests" element={
          <ProtectedRoute>
            <StockRequestsNew />
          </ProtectedRoute>
        } />

        <Route path="/requests/approval" element={
          <ProtectedRoute>
            <StockApprovals />
          </ProtectedRoute>
        } />

        <Route path="/requests/shipments" element={
          <ProtectedRoute>
            <StockShipments />
          </ProtectedRoute>
        } />

        <Route path="/requests/receipt" element={
          <ProtectedRoute>
            <GoodsReceipt />
          </ProtectedRoute>
        } />

        <Route path="/approval" element={
          <ProtectedRoute>
            <Approval />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } />

        <Route path="/reports/daily-stock" element={
          <ProtectedRoute>
            <DailyStockReport />
          </ProtectedRoute>
        } />

        <Route path="/reports/daily-sales" element={
          <ProtectedRoute>
            <DailySalesReport />
          </ProtectedRoute>
        } />

        <Route path="/pos" element={
          <ProtectedRoute>
            <POS />
          </ProtectedRoute>
        } />

        <Route path="/finance/sales-history" element={
          <ProtectedRoute>
            <SalesHistory />
          </ProtectedRoute>
        } />

        <Route path="/sales" element={
          <ProtectedRoute>
            <Sales />
          </ProtectedRoute>
        } />

        <Route path="/cash-transfer" element={
          <ProtectedRoute>
            <CashTransfer />
          </ProtectedRoute>
        } />

        <Route path="/cash-history" element={
          <ProtectedRoute>
            <CashHistory />
          </ProtectedRoute>
        } />

        <Route path="/stock-opname" element={
          <ProtectedRoute>
            <StockOpname />
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/customers" element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        } />

        {/* Supplier & Purchase Order Routes */}
        <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrderMainOffice /></ProtectedRoute>} />
        <Route path="/purchase-orders/approval" element={<ProtectedRoute><PurchaseOrderAuditor /></ProtectedRoute>} />
        <Route path="/purchase-orders/receipt" element={<ProtectedRoute><PurchaseOrderReceipt /></ProtectedRoute>} />
        <Route path="/purchase-orders/discrepancy" element={<ProtectedRoute><PODiscrepancyReport /></ProtectedRoute>} />

        {/* Direct Order Routes (Supplier -> Customer) */}
        <Route path="/direct-orders" element={<ProtectedRoute><DirectOrders /></ProtectedRoute>} />
        <Route path="/direct-orders/:id" element={<ProtectedRoute><DirectOrderDetail /></ProtectedRoute>} />

        {/* Marketplace Order Routes */}
        <Route path="/marketplace" element={<ProtectedRoute><MarketplaceOrders /></ProtectedRoute>} />
        <Route path="/marketplace/receipt" element={<ProtectedRoute><MarketplaceReceipt /></ProtectedRoute>} />
        <Route path="/marketplace/returns" element={<ProtectedRoute><MarketplaceReturns /></ProtectedRoute>} />

        <Route path="/finance/transactions" element={
          <ProtectedRoute>
            <GeneralTransactions />
          </ProtectedRoute>
        } />

        <Route path="/finance/backorders" element={
          <ProtectedRoute>
            <Backorders />
          </ProtectedRoute>
        } />

        {/* Stock Return Routes (Toko -> Gudang) */}
        <Route path="/stock-return" element={<ProtectedRoute><StockReturnCreate /></ProtectedRoute>} />
        <Route path="/stock-return/approval" element={<ProtectedRoute><StockReturnApproval /></ProtectedRoute>} />

        {/* Stock History */}
        <Route path="/stock/history" element={<ProtectedRoute><StockHistory /></ProtectedRoute>} />

        {/* Customer Exchange (Tukar Barang) */}
        <Route path="/exchange" element={<ProtectedRoute><CustomerExchange /></ProtectedRoute>} />

        {/* Notification History */}
        <Route path="/notifications" element={<ProtectedRoute><NotificationHistory /></ProtectedRoute>} />

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

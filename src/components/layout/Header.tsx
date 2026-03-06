import { ReactNode, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/utils';

// Complete route-to-breadcrumb mapping
// Each route maps to: [parentLabel, parentHref?, currentLabel]
const ROUTE_MAP: Record<string, { segments: { label: string; href?: string }[] }> = {
  '/': { segments: [{ label: 'Dashboard' }] },
  '/guide': { segments: [{ label: 'Panduan' }] },
  '/pos': { segments: [{ label: 'Kasir (POS)' }] },
  '/products': { segments: [{ label: 'Produk' }] },

  // Stok
  '/stock-in': { segments: [{ label: 'Stok' }, { label: 'Stok Masuk' }] },
  '/stock-opname': { segments: [{ label: 'Stok' }, { label: 'Stok Opname' }] },
  '/requests': { segments: [{ label: 'Stok' }, { label: 'Permintaan Stok' }] },
  '/stock-return': { segments: [{ label: 'Stok' }, { label: 'Retur ke Gudang' }] },
  '/requests/shipments': { segments: [{ label: 'Stok' }, { label: 'Proses Permintaan' }] },
  '/requests/approval': { segments: [{ label: 'Stok' }, { label: 'Persetujuan Stok' }] },
  '/stock-return/approval': { segments: [{ label: 'Stok' }, { label: 'Approval Retur' }] },
  '/requests/receipt': { segments: [{ label: 'Stok' }, { label: 'Penerimaan Barang' }] },
  '/stock/history': { segments: [{ label: 'Stok' }, { label: 'History Stok' }] },

  // Purchase Order
  '/suppliers': { segments: [{ label: 'Purchase Order' }, { label: 'Supplier' }] },
  '/purchase-orders': { segments: [{ label: 'Purchase Order' }, { label: 'Buat PO' }] },
  '/purchase-orders/approval': { segments: [{ label: 'Purchase Order' }, { label: 'Approval PO' }] },
  '/purchase-orders/receipt': { segments: [{ label: 'Purchase Order' }, { label: 'Penerimaan PO' }] },
  '/purchase-orders/discrepancy': { segments: [{ label: 'Purchase Order' }, { label: 'Selisih & Klaim' }] },
  '/direct-orders': { segments: [{ label: 'Purchase Order' }, { label: 'Direct Order' }] },

  // Marketplace
  '/marketplace': { segments: [{ label: 'Marketplace' }, { label: 'Pesanan' }] },
  '/marketplace/receipt': { segments: [{ label: 'Marketplace' }, { label: 'Penerimaan' }] },
  '/marketplace/returns': { segments: [{ label: 'Marketplace' }, { label: 'Return' }] },

  // B2B / Surat Jalan
  '/customers': { segments: [{ label: 'B2B / Surat Jalan' }, { label: 'Pelanggan' }] },
  '/surat-jalan': { segments: [{ label: 'B2B / Surat Jalan' }, { label: 'Surat Jalan' }] },
  '/surat-jalan/warehouse': { segments: [{ label: 'B2B / Surat Jalan' }, { label: 'Pengiriman B2B' }] },
  '/surat-jalan/cashier': { segments: [{ label: 'B2B / Surat Jalan' }, { label: 'Pengiriman Toko' }] },
  '/surat-jalan/auditor': { segments: [{ label: 'B2B / Surat Jalan' }, { label: 'Audit Surat Jalan' }] },
  '/invoices': { segments: [{ label: 'B2B / Surat Jalan' }, { label: 'Invoice' }] },

  // Keuangan
  '/cash-transfer': { segments: [{ label: 'Keuangan' }, { label: 'Setoran Cash' }] },
  '/cash-history': { segments: [{ label: 'Keuangan' }, { label: 'Riwayat Setoran' }] },
  '/finance/transactions': { segments: [{ label: 'Keuangan' }, { label: 'Transaksi Umum' }] },
  '/finance/sales-history': { segments: [{ label: 'Keuangan' }, { label: 'Riwayat Penjualan' }] },
  '/finance/backorders': { segments: [{ label: 'Keuangan' }, { label: 'Backorder' }] },
  '/sales': { segments: [{ label: 'Keuangan' }, { label: 'Penjualan' }] },
  '/approval': { segments: [{ label: 'Persetujuan' }] },

  // Laporan
  '/reports': { segments: [{ label: 'Laporan' }, { label: 'Laporan Umum' }] },
  '/reports/sales': { segments: [{ label: 'Laporan' }, { label: 'Laporan Penjualan' }] },
  '/reports/daily-stock': { segments: [{ label: 'Laporan' }, { label: 'Laporan Stok Harian' }] },

  // Other
  '/users': { segments: [{ label: 'Pengguna' }] },
  '/settings': { segments: [{ label: 'Pengaturan' }] },
  '/notifications': { segments: [{ label: 'Notifikasi' }] },
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function Header({ title, actions }: HeaderProps) {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const path = location.pathname;

    // Try exact match first
    let route = ROUTE_MAP[path];

    // Try matching dynamic routes (e.g., /direct-orders/:id, /marketplace/:id)
    if (!route) {
      const parts = path.split('/');
      if (parts.length >= 3) {
        const basePath = '/' + parts[1];
        const parentRoute = ROUTE_MAP[basePath];
        if (parentRoute) {
          return [
            ...parentRoute.segments,
            { label: title },
          ];
        }
      }
    }

    if (route) {
      return route.segments;
    }

    // Fallback: just show the title
    return [{ label: title }];
  }, [location.pathname, title]);

  return (
    <header className="sticky top-0 z-30 min-h-16 sm:h-20 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 py-3 sm:py-0 border-b border-border bg-background gap-2 sm:gap-0">
      {/* Title Section */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumb - Desktop */}
        <nav className="hidden md:flex items-center text-sm" aria-label="Breadcrumb">
          <Link
            to="/"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>

          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <span key={index} className="flex items-center">
                <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-muted-foreground/50" />
                {isLast ? (
                  <span className="font-semibold text-foreground truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                ) : (
                  <span className="text-muted-foreground font-medium">
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>

        {/* Mobile Title */}
        <div className="md:hidden">
          <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{title}</h1>
          {breadcrumbs.length > 1 && (
            <p className="text-xs text-muted-foreground">{breadcrumbs[0].label}</p>
          )}
        </div>
      </div>

      {/* Action Buttons & Notifications - Responsive */}
      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end sm:justify-start">
        <NotificationBell />
        {actions}
      </div>
    </header>
  );
}

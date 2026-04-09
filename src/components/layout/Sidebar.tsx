import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Store,
  FileText,
  ClipboardCheck,
  ShoppingCart,
  Wallet,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Building2,
  MoreHorizontal,
  Truck,
  FileCheck,
  Receipt,
  ChevronDown,
  ChevronRight,
  Boxes,
  CreditCard,
  FileStack, RotateCcw,
  Banknote,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  ArrowLeftRight,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { usePendingCounts } from '@/hooks/usePendingCounts';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  roles: UserRole[];
  children?: NavItem[];
  badgeKey?: 'suratJalan' | 'stockRequests' | 'stockReturns'; // Key for pending count
}

// Grouped navigation with submenus
const navGroups: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/', roles: ['warehouse', 'cashier', 'auditor', 'admin', 'main_office'] },
  { label: 'Panduan', icon: BookOpen, href: '/guide', roles: ['warehouse', 'cashier', 'auditor', 'admin', 'main_office'] },
  
  // Superadmin Exclusive Tools (Site Builder & User Management)
  { label: 'Site Builder', icon: Zap, href: '/site-builder', roles: ['admin'] },
  { label: 'Pengguna', icon: Users, href: '/users', roles: ['admin'] },

  { label: 'Kasir (POS)', icon: ShoppingCart, href: '/pos', roles: ['cashier'] },
  { label: 'Produk', icon: Package, href: '/products', roles: ['warehouse', 'cashier', 'auditor', 'main_office'] },

  // Stok submenu
  {
    label: 'Stok',
    icon: Boxes,
    roles: ['warehouse', 'cashier', 'auditor', 'main_office'],
    children: [
      { label: 'Stok Masuk', icon: ArrowDownToLine, href: '/stock-in', roles: ['warehouse'] },
      { label: 'Stok Opname', icon: ClipboardCheck, href: '/stock-opname', roles: ['warehouse', 'cashier', 'auditor'] },
      { label: 'Permintaan Stok', icon: ArrowUpFromLine, href: '/requests', roles: ['cashier'] },
      { label: 'Retur ke Gudang', icon: RotateCcw, href: '/stock-return', roles: ['cashier'] },
      { label: 'Proses Permintaan', icon: Package, href: '/requests/shipments', roles: ['warehouse'] },
      { label: 'Persetujuan Stok', icon: ClipboardCheck, href: '/requests/approval', roles: ['main_office'], badgeKey: 'stockRequests' },
      { label: 'Approval Retur', icon: ClipboardCheck, href: '/stock-return/approval', roles: ['main_office'], badgeKey: 'stockReturns' },
      { label: 'Approval Opname', icon: ClipboardCheck, href: '/stock-opname/approval', roles: ['main_office'] },
      { label: 'Penerimaan Barang', icon: ArrowDownToLine, href: '/requests/receipt', roles: ['cashier'] },
      { label: 'History Stok', icon: BarChart3, href: '/stock/history', roles: ['warehouse', 'cashier', 'auditor', 'main_office'] },
    ],
  },

  // Purchase Order submenu
  {
    label: 'Purchase Order',
    icon: FileStack,
    roles: ['warehouse', 'cashier', 'auditor', 'main_office'],
    children: [
      { label: 'Supplier', icon: Building2, href: '/suppliers', roles: ['main_office'] },
      { label: 'Buat PO', icon: FileText, href: '/purchase-orders', roles: ['main_office'] },
      { label: 'Approval PO', icon: ClipboardCheck, href: '/purchase-orders/approval', roles: ['main_office'] },
      { label: 'Penerimaan PO', icon: ArrowDownToLine, href: '/purchase-orders/receipt', roles: ['warehouse', 'cashier'] },
      { label: 'Selisih & Klaim', icon: AlertTriangle, href: '/purchase-orders/discrepancy', roles: ['main_office', 'auditor'] },
      { label: 'Direct Order', icon: Truck, href: '/direct-orders', roles: ['main_office'] },
    ],
  },

  // Marketplace submenu
  {
    label: 'Marketplace',
    icon: ShoppingCart,
    roles: ['warehouse', 'cashier', 'main_office'],
    children: [
      { label: 'Pesanan', icon: FileText, href: '/marketplace', roles: ['main_office'] },
      { label: 'Penerimaan', icon: ArrowDownToLine, href: '/marketplace/receipt', roles: ['warehouse', 'cashier'] },
      { label: 'Return', icon: RotateCcw, href: '/marketplace/returns', roles: ['warehouse', 'cashier', 'main_office'] },
      { label: 'Order Tokopedia', icon: ShoppingBag, href: '/tokopedia', roles: ['cashier'] },
      { label: 'Kirim Tokopedia', icon: Truck, href: '/tokopedia/shipping', roles: ['warehouse'] },
      { label: 'Laporan Tokopedia', icon: BarChart3, href: '/tokopedia/report', roles: ['cashier', 'main_office'] },
    ],
  },

  // B2B / Surat Jalan submenu
  {
    label: 'B2B / Surat Jalan',
    icon: Truck,
    roles: ['warehouse', 'cashier', 'auditor', 'main_office'],
    children: [
      { label: 'Pelanggan', icon: Users, href: '/customers', roles: ['cashier', 'main_office'] },
      { label: 'Surat Jalan', icon: FileText, href: '/surat-jalan', roles: ['main_office'] },
      { label: 'Pengiriman B2B', icon: Truck, href: '/surat-jalan/warehouse', roles: ['warehouse'] },
      { label: 'Pengiriman Toko', icon: Store, href: '/surat-jalan/cashier', roles: ['cashier'] },
      { label: 'Invoice', icon: FileText, href: '/invoices', roles: ['main_office'] },
    ],
  },

  // Keuangan submenu
  {
    label: 'Keuangan',
    icon: CreditCard,
    roles: ['cashier', 'auditor', 'main_office'],
    children: [
      { label: 'Setoran Cash', icon: Wallet, href: '/cash-transfer', roles: ['cashier', 'main_office'] },
      { label: 'Riwayat Setoran', icon: Receipt, href: '/cash-history', roles: ['main_office'] },
      { label: 'Transaksi Umum', icon: Banknote, href: '/finance/transactions', roles: ['main_office'] },
      { label: 'Riwayat Penjualan', icon: Receipt, href: '/finance/sales-history', roles: ['main_office'] },
      { label: 'Backorder', icon: ClipboardList, href: '/finance/backorders', roles: ['cashier', 'main_office'] },
    ],
  },

  { label: 'Persetujuan', icon: ClipboardCheck, href: '/approval', roles: ['main_office'], badgeKey: 'suratJalan' },

  // Laporan submenu
  {
    label: 'Laporan',
    icon: BarChart3,
    roles: ['cashier', 'main_office', 'auditor'],
    children: [
      { label: 'Laporan Penjualan', icon: Receipt, href: '/reports/sales', roles: ['cashier', 'main_office', 'auditor'] },
      { label: 'Laporan Stok Harian', icon: Package, href: '/reports/daily-stock', roles: ['cashier'] },
      { label: 'Laporan Umum', icon: BarChart3, href: '/reports', roles: ['cashier', 'main_office', 'auditor'] },
    ],
  },

  { label: 'Pengaturan', icon: Settings, href: '/settings', roles: ['warehouse', 'cashier', 'auditor', 'admin', 'main_office'] },
];

export default function Sidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const role = useRole();
  const [isHovered, setIsHovered] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const { counts: pendingCounts } = usePendingCounts();

  // Filter nav items based on role
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items
      .filter(item => role && item.roles.includes(role))
      .map(item => {
        if (item.children) {
          const filteredChildren = item.children.filter(child => role && child.roles.includes(role));
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        return item;
      })
      .filter(Boolean) as NavItem[];
  };

  const filteredNavGroups = filterItems(navGroups);

  // Flatten for mobile - limit to 3 items to make room for "More" with logout
  const flattenedItems = filteredNavGroups.flatMap(item =>
    item.children ? item.children : [item]
  );
  const mobilePrimaryItems = flattenedItems.slice(0, 3);
  const mobileMoreItems = flattenedItems.slice(3);
  const isMoreActive = mobileMoreItems.some((item) => item.href === location.pathname);

  const toggleGroup = (label: string, event?: React.MouseEvent) => {
    // Prevent default button behavior that might cause scroll
    if (event) {
      event.preventDefault();
    }
    setExpandedGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  // Auto-expand group if child is active
  const isChildActive = (children: NavItem[] | undefined) => {
    if (!children) return false;
    return children.some(child => location.pathname === child.href);
  };

  const getRoleBadgeColor = (userRole: UserRole) => {
    switch (userRole) {
      case 'admin': return 'bg-accent text-accent-foreground';
      case 'auditor': return 'bg-info/20 text-info';
      case 'cashier': return 'bg-warning/20 text-warning';
      case 'warehouse': return 'bg-success/20 text-success';
      case 'main_office': return 'bg-primary/20 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (userRole: UserRole) => {
    switch (userRole) {
      case 'admin': return 'Admin';
      case 'auditor': return 'Auditor';
      case 'cashier': return 'Kasir';
      case 'warehouse': return 'Gudang';
      case 'main_office': return 'Kantor Pusat';
      default: return userRole;
    }
  };

  const isCollapsed = !isHovered;

  const NavLink = ({ item, isSubItem = false }: { item: NavItem; isSubItem?: boolean }) => {
    if (!item.href) return null;
    const isActive = location.pathname === item.href;
    const badgeCount = item.badgeKey ? pendingCounts[item.badgeKey] : 0;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
          isCollapsed && 'justify-center px-2',
          isSubItem && !isCollapsed && 'ml-6 pl-4 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:transition-colors before:duration-200',
          isSubItem && !isCollapsed && isActive && 'before:bg-primary',
          isSubItem && !isCollapsed && !isActive && 'before:bg-muted-foreground/30',
          isActive
            ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground sidebar-active-glow font-semibold'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5'
        )}
      >
        <item.icon className={cn(
          'w-4 h-4 flex-shrink-0 transition-transform duration-200',
          isActive && 'scale-110',
          !isActive && 'group-hover:scale-110'
        )} />
        {!isCollapsed && (
          <span className={cn(
            'text-sm font-medium transition-opacity duration-200 whitespace-nowrap flex-1',
            isActive && 'font-semibold'
          )}>
            {item.label}
          </span>
        )}
        {/* Pending count badge */}
        {badgeCount > 0 && (
          <span className={cn(
            'min-w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold',
            isActive
              ? 'bg-primary-foreground text-primary'
              : 'bg-destructive text-destructive-foreground animate-pulse',
            isCollapsed && 'absolute -top-1 -right-1 min-w-4 h-4 text-[10px]'
          )}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const NavGroup = ({ item }: { item: NavItem }) => {
    if (!item.children) {
      return <NavLink item={item} />;
    }

    const isExpanded = expandedGroups.includes(item.label) || isChildActive(item.children);
    const hasActiveChild = isChildActive(item.children);

    if (isCollapsed) {
      // In collapsed mode, show tooltip with submenu items
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'flex items-center justify-center w-full px-2 py-2.5 rounded-xl transition-all duration-200',
                hasActiveChild
                  ? 'bg-primary/20 text-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="p-0">
            <div className="py-2 min-w-[160px]">
              <p className="px-3 py-1 text-sm font-semibold text-muted-foreground">{item.label}</p>
              {item.children.map(child => (
                <Link
                  key={child.href}
                  to={child.href!}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                    location.pathname === child.href
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <child.icon className="w-4 h-4" />
                  {child.label}
                </Link>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(item.label)}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all duration-200 group',
              hasActiveChild
                ? 'bg-primary/10 text-primary border-l-[3px] border-primary rounded-l-none'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className={cn(
                'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                hasActiveChild && 'scale-110',
                !hasActiveChild && 'group-hover:scale-105'
              )} />
              <span className={cn(
                'text-sm font-medium',
                hasActiveChild && 'font-semibold'
              )}>{item.label}</span>
            </div>
            <ChevronDown className={cn(
              'w-4 h-4 transition-transform duration-200',
              !isExpanded && '-rotate-90'
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent
          className="mt-1 space-y-0.5 ml-2 pl-3 border-l border-muted/50 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
        >
          {item.children.map(child => (
            <NavLink key={child.href} item={child} isSubItem />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Determine which items need a separator after them (group boundaries)
  const groupBoundaries = new Set(['Panduan', 'Kasir (POS)', 'Produk', 'Persetujuan', 'Pengguna']);

  return (
    <>
      {/* Desktop Sidebar - Always collapsed, expands on hover */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border hidden md:flex flex-col transition-all duration-300',
          'shadow-[4px_0_24px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.25)]',
          isCollapsed ? 'w-[72px]' : 'w-[280px]'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className={cn(
          'border-b border-sidebar-border transition-all duration-300 flex items-center',
          isCollapsed ? 'p-4 justify-center' : 'p-5 px-6'
        )}>
          <Link to="/" className="flex items-center gap-3">
            <div className={cn(
              'rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 transition-all duration-300 flex-shrink-0',
              isCollapsed ? 'w-10 h-10' : 'w-10 h-10'
            )}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold text-foreground leading-tight whitespace-nowrap tracking-tight">
                  VMB
                </h1>
                <span className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">
                  Warehouse System
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className={cn(
          'sidebar-nav flex-1 py-4 px-3 space-y-0.5 overflow-y-auto transition-all duration-300',
          isCollapsed && 'px-2'
        )}>
          {filteredNavGroups.map((item, index) => (
            <div key={item.label}>
              <NavGroup item={item} />
              {/* Visual separator after specific items */}
              {groupBoundaries.has(item.label) && index < filteredNavGroups.length - 1 && (
                <div className="sidebar-separator" />
              )}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className={cn(
          'border-t border-sidebar-border transition-all duration-300',
          isCollapsed ? 'p-3 flex flex-col items-center gap-2' : 'p-4'
        )}>
          {!isCollapsed ? (
            <div className="sidebar-profile-card p-4 rounded-2xl flex items-center gap-3 mb-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base font-bold text-primary">
                    {profile?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {profile?.name || 'User'}
                </p>
                {role && (
                  <span className={cn(
                    'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5',
                    getRoleBadgeColor(role)
                  )}>
                    {getRoleLabel(role)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-default">
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {profile?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                <p>{profile?.name || 'User'}</p>
                {role && <p className="text-xs text-muted-foreground">{getRoleLabel(role)}</p>}
              </TooltipContent>
            </Tooltip>
          )}
          <button
            onClick={signOut}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all duration-200',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-2">
          {mobilePrimaryItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href!}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground/60'
                )}
              >
                <item.icon className={cn('w-5 h-5', isActive && 'scale-110')} />
                <span className="text-xs font-medium truncate max-w-[60px]">{item.label}</span>
              </Link>
            );
          })}

          {/* More Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]',
                  isMoreActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground/60'
                )}
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-xs font-medium">Lainnya</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl flex flex-col">
              <SheetHeader className="text-left pb-4 flex-shrink-0">
                <SheetTitle>Menu Lainnya</SheetTitle>
              </SheetHeader>

              {/* User Profile Section */}
              <div className="flex items-center gap-3 p-4 mb-4 bg-muted/50 rounded-2xl border border-border flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-foreground">
                      {profile?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">
                    {profile?.name || 'User'}
                  </p>
                  {role && (
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getRoleBadgeColor(role))}>
                      {getRoleLabel(role)}
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable Menu Grid */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
                  {mobileMoreItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href!}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-foreground hover:bg-muted'
                        )}
                      >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Logout Button - Always visible at bottom */}
              <div className="pt-4 border-t border-border flex-shrink-0">
                <button
                  onClick={signOut}
                  className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-2xl text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Keluar</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}

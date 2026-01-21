import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
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
  FileStack,
  Banknote,
} from 'lucide-react';
import { useAuth, useRole } from '@/contexts/AuthContext';
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
}

// Grouped navigation with submenus
const navGroups: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/', roles: ['warehouse', 'cashier', 'kepala_toko', 'auditor', 'admin', 'main_office'] },
  { label: 'Kasir (POS)', icon: ShoppingCart, href: '/pos', roles: ['cashier', 'admin'] },
  { label: 'Produk', icon: Package, href: '/products', roles: ['warehouse', 'cashier', 'kepala_toko', 'auditor', 'admin', 'main_office'] },

  // Stok submenu
  {
    label: 'Stok',
    icon: Boxes,
    roles: ['warehouse', 'kepala_toko', 'auditor', 'admin', 'main_office'],
    children: [
      { label: 'Stok Masuk', icon: ArrowDownToLine, href: '/stock-in', roles: ['warehouse', 'admin'] },
      { label: 'Stok Opname', icon: ClipboardCheck, href: '/stock-opname', roles: ['auditor', 'admin'] },
      { label: 'Permintaan Stok', icon: ArrowUpFromLine, href: '/requests', roles: ['kepala_toko', 'admin'] },
      { label: 'Proses Permintaan', icon: Package, href: '/requests/shipments', roles: ['warehouse', 'admin'] },
      { label: 'Persetujuan Stok', icon: ClipboardCheck, href: '/requests/approval', roles: ['main_office', 'admin'] },
      { label: 'Penerimaan Barang', icon: ArrowDownToLine, href: '/requests/receipt', roles: ['kepala_toko', 'admin'] },
    ],
  },

  // Purchase Order submenu
  {
    label: 'Purchase Order',
    icon: FileStack,
    roles: ['warehouse', 'kepala_toko', 'auditor', 'admin', 'main_office'],
    children: [
      { label: 'Supplier', icon: Building2, href: '/suppliers', roles: ['main_office', 'admin'] },
      { label: 'Buat PO', icon: FileText, href: '/purchase-orders', roles: ['main_office', 'admin'] },
      { label: 'Approval PO', icon: ClipboardCheck, href: '/purchase-orders/approval', roles: ['auditor', 'admin'] },
      { label: 'Penerimaan PO', icon: ArrowDownToLine, href: '/purchase-orders/receipt', roles: ['warehouse', 'kepala_toko', 'admin'] },
    ],
  },

  // B2B / Surat Jalan submenu
  {
    label: 'B2B / Surat Jalan',
    icon: Truck,
    roles: ['warehouse', 'cashier', 'auditor', 'admin', 'main_office'],
    children: [
      { label: 'Pelanggan', icon: Users, href: '/customers', roles: ['main_office', 'admin'] },
      { label: 'Surat Jalan', icon: FileText, href: '/surat-jalan', roles: ['main_office', 'admin'] },
      { label: 'Pengiriman B2B', icon: Truck, href: '/surat-jalan/warehouse', roles: ['warehouse', 'admin'] },
      { label: 'Verifikasi B2B', icon: FileCheck, href: '/surat-jalan/auditor', roles: ['auditor', 'admin'] },
      { label: 'Invoice', icon: FileText, href: '/invoices', roles: ['main_office', 'admin'] },
    ],
  },

  // Keuangan submenu
  {
    label: 'Keuangan',
    icon: CreditCard,
    roles: ['cashier', 'kepala_toko', 'auditor', 'admin', 'main_office'],
    children: [
      { label: 'Cash', icon: Wallet, href: '/cash-transfer', roles: ['cashier', 'kepala_toko', 'main_office', 'admin'] },
      { label: 'Riwayat Cash', icon: Receipt, href: '/cash-history', roles: ['main_office', 'admin'] },
      { label: 'Transaksi Umum', icon: Banknote, href: '/finance/transactions', roles: ['main_office', 'admin'] },
      { label: 'Riwayat Penjualan', icon: Receipt, href: '/finance/sales-history', roles: ['cashier', 'kepala_toko', 'main_office', 'admin'] },
    ],
  },

  { label: 'Persetujuan', icon: ClipboardCheck, href: '/approval', roles: ['auditor', 'admin'] },

  // Laporan submenu
  {
    label: 'Laporan',
    icon: BarChart3,
    roles: ['kepala_toko', 'main_office', 'auditor', 'admin'],
    children: [
      { label: 'Laporan Stok Harian', icon: Package, href: '/reports/daily-stock', roles: ['kepala_toko', 'admin'] },
      { label: 'Laporan Umum', icon: BarChart3, href: '/reports', roles: ['kepala_toko', 'main_office', 'auditor', 'admin'] },
    ],
  },

  { label: 'Pengguna', icon: Users, href: '/users', roles: ['admin'] },
  { label: 'Pengaturan', icon: Settings, href: '/settings', roles: ['warehouse', 'cashier', 'kepala_toko', 'auditor', 'admin', 'main_office'] },
];

export default function Sidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const role = useRole();
  const [isHovered, setIsHovered] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

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

  // Flatten for mobile
  const flattenedItems = filteredNavGroups.flatMap(item =>
    item.children ? item.children : [item]
  );
  const mobilePrimaryItems = flattenedItems.slice(0, 4);
  const mobileMoreItems = flattenedItems.slice(4);
  const isMoreActive = mobileMoreItems.some((item) => item.href === location.pathname);

  const toggleGroup = (label: string) => {
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
      case 'kepala_toko': return 'bg-orange-500/20 text-orange-600';
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
      case 'kepala_toko': return 'Kepala Toko';
      case 'warehouse': return 'Gudang';
      case 'main_office': return 'Kantor Pusat';
      default: return userRole;
    }
  };

  const isCollapsed = !isHovered;

  const NavLink = ({ item, isSubItem = false }: { item: NavItem; isSubItem?: boolean }) => {
    if (!item.href) return null;
    const isActive = location.pathname === item.href;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group',
          isCollapsed && 'justify-center px-2',
          isSubItem && !isCollapsed && 'ml-4 pl-6 border-l-2 border-muted',
          isActive
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <item.icon className={cn(
          'w-4 h-4 flex-shrink-0 transition-transform duration-200',
          isActive && 'scale-110',
          !isActive && 'group-hover:scale-105'
        )} />
        {!isCollapsed && (
          <span className={cn(
            'text-sm font-medium transition-opacity duration-200 whitespace-nowrap',
            isActive && 'font-semibold'
          )}>
            {item.label}
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
              <item.icon className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="p-0">
            <div className="py-2 min-w-[160px]">
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground">{item.label}</p>
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
        <CollapsibleTrigger className={cn(
          'flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all duration-200',
          hasActiveChild
            ? 'bg-primary/10 text-primary'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}>
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{item.label}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1">
          {item.children.map(child => (
            <NavLink key={child.href} item={child} isSubItem />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <>
      {/* Desktop Sidebar - Always collapsed, expands on hover */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border hidden md:flex flex-col transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]',
          isCollapsed ? 'w-20' : 'w-72'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className={cn(
          'border-b border-sidebar-border transition-all duration-300',
          isCollapsed ? 'p-4 px-3' : 'p-8'
        )}>
          <Link to="/" className="flex items-center gap-3">
            <div className={cn(
              'rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 transition-all duration-300',
              isCollapsed ? 'w-12 h-12' : 'w-10 h-10'
            )}>
              <Building2 className={cn(
                'text-white transition-all duration-300',
                isCollapsed ? 'w-7 h-7' : 'w-6 h-6'
              )} />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold text-foreground leading-tight whitespace-nowrap tracking-tight">
                  Vertical<span className="text-primary">Inv</span>
                </h1>
                <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                  Enterprise
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className={cn(
          'flex-1 p-3 space-y-1 overflow-y-auto transition-all duration-300',
          isCollapsed && 'px-2'
        )}>
          {filteredNavGroups.map((item) => (
            <NavGroup key={item.label} item={item} />
          ))}
        </nav>

        {/* User Profile */}
        <div className={cn(
          'p-6 border-t border-sidebar-border transition-all duration-300',
          isCollapsed && 'px-2 p-4'
        )}>
          {!isCollapsed && (
            <div className="glass-card p-4 rounded-2xl flex items-center gap-3 mb-3 border border-border shadow-sm">
              <div className="w-10 h-10 rounded-full bg-muted border border-border shadow-inner flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                <p className="text-sm font-bold text-foreground truncate">
                  {profile?.name || 'User'}
                </p>
                {role && (
                  <span className="text-xs text-primary font-medium truncate">
                    {getRoleLabel(role)}
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Keluar</span>}
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
            <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
              <SheetHeader className="text-left pb-4">
                <SheetTitle>Menu Lainnya</SheetTitle>
              </SheetHeader>

              {/* User Profile Section */}
              <div className="flex items-center gap-3 p-4 mb-4 bg-muted/50 rounded-2xl border border-border">
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

              <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[calc(75vh-200px)]">
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

              {/* Logout Button */}
              <div className="mt-4 pt-4 border-t border-border">
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

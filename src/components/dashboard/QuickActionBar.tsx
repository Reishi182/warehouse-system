import { useNavigate } from 'react-router-dom';
import {
    ShoppingCart,
    Banknote,
    ArrowUpFromLine,
    Package,
    Truck,
    ClipboardCheck,
    FileText,
    BarChart3,
    Users,
    Store,
    ShoppingBag,
    ArrowDownToLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface QuickAction {
    label: string;
    icon: typeof ShoppingCart;
    path: string;
    gradient: string;
    iconColor: string;
}

interface QuickActionBarProps {
    role: UserRole | undefined;
}

const roleActions: Record<string, QuickAction[]> = {
    cashier: [
        { label: 'Buka POS', icon: ShoppingCart, path: '/pos', gradient: 'from-emerald-500/15 to-emerald-500/5 hover:from-emerald-500/25 hover:to-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Setor Cash', icon: Banknote, path: '/cash-transfer', gradient: 'from-blue-500/15 to-blue-500/5 hover:from-blue-500/25 hover:to-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
        { label: 'Buat Permintaan', icon: ArrowUpFromLine, path: '/requests', gradient: 'from-violet-500/15 to-violet-500/5 hover:from-violet-500/25 hover:to-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
        { label: 'Riwayat Penjualan', icon: BarChart3, path: '/sales', gradient: 'from-amber-500/15 to-amber-500/5 hover:from-amber-500/25 hover:to-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
    ],
    warehouse: [
        { label: 'Stok Masuk', icon: ArrowDownToLine, path: '/stock-in', gradient: 'from-emerald-500/15 to-emerald-500/5 hover:from-emerald-500/25 hover:to-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Kirim Stok', icon: Truck, path: '/requests/shipments', gradient: 'from-blue-500/15 to-blue-500/5 hover:from-blue-500/25 hover:to-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
        { label: 'Lihat Produk', icon: Package, path: '/products', gradient: 'from-violet-500/15 to-violet-500/5 hover:from-violet-500/25 hover:to-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
        { label: 'Riwayat Stok', icon: BarChart3, path: '/stock/history', gradient: 'from-amber-500/15 to-amber-500/5 hover:from-amber-500/25 hover:to-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
    ],
    main_office: [
        { label: 'Approve Permintaan', icon: ClipboardCheck, path: '/requests/approval', gradient: 'from-emerald-500/15 to-emerald-500/5 hover:from-emerald-500/25 hover:to-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Buat PO', icon: ShoppingBag, path: '/purchase-orders', gradient: 'from-blue-500/15 to-blue-500/5 hover:from-blue-500/25 hover:to-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
        { label: 'Surat Jalan', icon: FileText, path: '/surat-jalan', gradient: 'from-violet-500/15 to-violet-500/5 hover:from-violet-500/25 hover:to-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
        { label: 'Kelola Supplier', icon: Users, path: '/suppliers', gradient: 'from-amber-500/15 to-amber-500/5 hover:from-amber-500/25 hover:to-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
    ],
    auditor: [
        { label: 'Stock Opname', icon: ClipboardCheck, path: '/stock-opname', gradient: 'from-emerald-500/15 to-emerald-500/5 hover:from-emerald-500/25 hover:to-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Verifikasi SJ', icon: Truck, path: '/surat-jalan/auditor', gradient: 'from-blue-500/15 to-blue-500/5 hover:from-blue-500/25 hover:to-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
        { label: 'Laporan', icon: BarChart3, path: '/reports', gradient: 'from-violet-500/15 to-violet-500/5 hover:from-violet-500/25 hover:to-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
    ],
    admin: [
        { label: 'Buka POS', icon: ShoppingCart, path: '/pos', gradient: 'from-emerald-500/15 to-emerald-500/5 hover:from-emerald-500/25 hover:to-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Stok Masuk', icon: ArrowDownToLine, path: '/stock-in', gradient: 'from-blue-500/15 to-blue-500/5 hover:from-blue-500/25 hover:to-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
        { label: 'Approve', icon: ClipboardCheck, path: '/requests/approval', gradient: 'from-violet-500/15 to-violet-500/5 hover:from-violet-500/25 hover:to-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
        { label: 'Produk', icon: Package, path: '/products', gradient: 'from-amber-500/15 to-amber-500/5 hover:from-amber-500/25 hover:to-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
        { label: 'Laporan', icon: BarChart3, path: '/reports', gradient: 'from-cyan-500/15 to-cyan-500/5 hover:from-cyan-500/25 hover:to-cyan-500/10', iconColor: 'text-cyan-600 dark:text-cyan-400' },
        { label: 'Kelola User', icon: Users, path: '/users', gradient: 'from-pink-500/15 to-pink-500/5 hover:from-pink-500/25 hover:to-pink-500/10', iconColor: 'text-pink-600 dark:text-pink-400' },
    ],
};

export default function QuickActionBar({ role }: QuickActionBarProps) {
    const navigate = useNavigate();
    const actions = roleActions[role || ''] || [];

    if (actions.length === 0) return null;

    return (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {actions.map((action) => {
                const Icon = action.icon;
                return (
                    <Button
                        key={action.path}
                        variant="ghost"
                        className={cn(
                            "shrink-0 h-auto py-2.5 px-4 rounded-xl",
                            "flex items-center gap-2",
                            `bg-gradient-to-r ${action.gradient}`,
                            "border border-border/30",
                            "transition-all duration-200",
                            "hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5",
                            "active:scale-[0.98]"
                        )}
                        onClick={() => navigate(action.path)}
                    >
                        <Icon className={cn("w-4 h-4", action.iconColor)} />
                        <span className="text-xs font-semibold whitespace-nowrap">{action.label}</span>
                    </Button>
                );
            })}
        </div>
    );
}

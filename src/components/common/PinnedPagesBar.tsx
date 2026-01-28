import React from 'react';
import { Link } from 'react-router-dom';
import { usePinnedPages } from '@/hooks/usePinnedPages';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Star,
    X,
    LayoutDashboard,
    Package,
    ShoppingCart,
    FileText,
    Users,
    Settings,
    Truck,
    DollarSign,
    Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon mapping for pinned pages
const PAGE_ICONS: Record<string, React.ReactNode> = {
    '/': <LayoutDashboard className="w-4 h-4" />,
    '/products': <Package className="w-4 h-4" />,
    '/pos': <ShoppingCart className="w-4 h-4" />,
    '/sales': <FileText className="w-4 h-4" />,
    '/customers': <Users className="w-4 h-4" />,
    '/settings': <Settings className="w-4 h-4" />,
    '/surat-jalan': <Truck className="w-4 h-4" />,
    '/cash-transfer': <DollarSign className="w-4 h-4" />,
    '/requests': <Box className="w-4 h-4" />,
    '/finance/sales-history': <FileText className="w-4 h-4" />,
};

interface PinnedPagesBarProps {
    className?: string;
    compact?: boolean;
}

/**
 * Pinned Pages Bar - Shows pinned/favorite pages for quick access
 */
export function PinnedPagesBar({ className, compact = false }: PinnedPagesBarProps) {
    const { pinnedPages, unpinPage } = usePinnedPages();

    if (pinnedPages.length === 0) {
        return null;
    }

    return (
        <div className={cn(
            "flex items-center gap-1 px-2",
            compact ? "py-1" : "py-2",
            className
        )}>
            <Star className="w-3.5 h-3.5 text-yellow-500 mr-1" />

            {pinnedPages.map((page) => (
                <Tooltip key={page.path}>
                    <TooltipTrigger asChild>
                        <div className="relative group">
                            <Link to={page.path}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "gap-1.5 pr-6",
                                        compact ? "h-7 text-xs" : "h-8 text-sm"
                                    )}
                                >
                                    {PAGE_ICONS[page.path] || <FileText className="w-4 h-4" />}
                                    <span className="max-w-[80px] truncate">{page.title}</span>
                                </Button>
                            </Link>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    unpinPage(page.path);
                                }}
                                className={cn(
                                    "absolute right-1 top-1/2 -translate-y-1/2",
                                    "w-4 h-4 rounded-full",
                                    "flex items-center justify-center",
                                    "opacity-0 group-hover:opacity-100 transition-opacity",
                                    "hover:bg-destructive hover:text-destructive-foreground"
                                )}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        {page.title}
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}

export default PinnedPagesBar;

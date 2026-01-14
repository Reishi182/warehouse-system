import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    subtitle?: string;
    subtitleType?: 'success' | 'warning' | 'error' | 'info';
    change?: number; // Percentage change (e.g., 23 for +23%)
    changeLabel?: string; // e.g., "last week"
    className?: string;
}

export function StatsCard({
    title,
    value,
    icon,
    subtitle,
    subtitleType = 'info',
    change,
    changeLabel = 'dari minggu lalu',
    className
}: StatsCardProps) {
    const subtitleColors = {
        success: 'text-emerald-600',
        warning: 'text-amber-600',
        error: 'text-red-600',
        info: 'text-muted-foreground',
    };

    const isPositive = change !== undefined && change > 0;
    const isNegative = change !== undefined && change < 0;
    const isNeutral = change !== undefined && change === 0;

    return (
        <div className={cn(
            "glass-card rounded-2xl p-6 group hover:border-primary/30 transition-all duration-500",
            className
        )}>
            <div className="flex justify-between items-start mb-4">
                {/* Icon */}
                {icon && (
                    <div className={cn(
                        "p-3 rounded-xl border shadow-sm",
                        subtitleType === 'warning'
                            ? "bg-orange-50 border-orange-100 text-orange-400"
                            : "bg-primary/10 border-primary/10 text-primary"
                    )}>
                        {icon}
                    </div>
                )}

                {/* Change Badge */}
                {change !== undefined && (
                    <span className={cn(
                        "flex items-center text-xs font-bold px-2 py-1 rounded-full border shadow-sm",
                        isPositive && "bg-emerald-50 text-emerald-600 border-emerald-100",
                        isNegative && "bg-red-50 text-red-600 border-red-100",
                        isNeutral && "bg-orange-50 text-orange-500 border-orange-100"
                    )}>
                        {isPositive && <TrendingUp className="w-3.5 h-3.5 mr-1" />}
                        {isNegative && <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                        {isNeutral && <Minus className="w-3.5 h-3.5 mr-1" />}
                        {isPositive ? '+' : ''}{change}%
                    </span>
                )}
            </div>

            {/* Title */}
            <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>

            {/* Value */}
            <h3 className="text-2xl font-bold text-foreground tracking-tight">{value}</h3>

            {/* Subtitle (legacy support) */}
            {subtitle && !change && (
                <p className={cn("text-xs font-medium mt-2", subtitleColors[subtitleType])}>
                    {subtitle}
                </p>
            )}

            {/* Change Label */}
            {change !== undefined && changeLabel && (
                <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
            )}
        </div>
    );
}

interface StatsGridProps {
    children: ReactNode;
    columns?: 2 | 3 | 4;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
    const gridClass = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={cn("grid gap-6", gridClass[columns])}>
            {children}
        </div>
    );
}

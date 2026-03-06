import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    subtitle?: string;
    subtitleType?: 'success' | 'warning' | 'error' | 'info';
    change?: number;
    changeLabel?: string;
    className?: string;
    gradient?: 'blue' | 'purple' | 'orange' | 'green' | 'amber' | 'cyan' | 'violet' | 'emerald';
    animationDelay?: number;
}

const gradientStyles = {
    blue: {
        card: 'from-blue-500/20 via-blue-500/10 to-transparent',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        valueColor: 'text-blue-600 dark:text-blue-400',
    },
    purple: {
        card: 'from-purple-500/20 via-purple-500/10 to-transparent',
        iconBg: 'bg-purple-500/20',
        iconColor: 'text-purple-600 dark:text-purple-400',
        valueColor: 'text-purple-600 dark:text-purple-400',
    },
    orange: {
        card: 'from-orange-500/20 via-orange-500/10 to-transparent',
        iconBg: 'bg-orange-500/20',
        iconColor: 'text-orange-600 dark:text-orange-400',
        valueColor: 'text-orange-600 dark:text-orange-400',
    },
    green: {
        card: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    emerald: {
        card: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
        card: 'from-amber-500/20 via-amber-500/10 to-transparent',
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        valueColor: 'text-amber-600 dark:text-amber-400',
    },
    cyan: {
        card: 'from-cyan-500/20 via-cyan-500/10 to-transparent',
        iconBg: 'bg-cyan-500/20',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        valueColor: 'text-cyan-600 dark:text-cyan-400',
    },
    violet: {
        card: 'from-violet-500/20 via-violet-500/10 to-transparent',
        iconBg: 'bg-violet-500/20',
        iconColor: 'text-violet-600 dark:text-violet-400',
        valueColor: 'text-violet-600 dark:text-violet-400',
    },
};

// Map subtitleType to gradient for backward compatibility
const subtitleToGradient: Record<string, keyof typeof gradientStyles> = {
    success: 'green',
    warning: 'amber',
    error: 'orange',
    info: 'blue',
};

export function StatsCard({
    title,
    value,
    icon,
    subtitle,
    subtitleType = 'info',
    change,
    changeLabel,
    className,
    gradient,
    animationDelay = 0,
}: StatsCardProps) {
    // Determine gradient - use provided gradient or derive from subtitleType
    const effectiveGradient = gradient || subtitleToGradient[subtitleType] || 'blue';
    const styles = gradientStyles[effectiveGradient];

    const hasChange = typeof change === 'number';
    const isPositive = hasChange && change >= 0;

    return (
        <Card
            className={cn(
                'relative overflow-hidden border-0 shadow-lg',
                `bg-gradient-to-br ${styles.card}`,
                'backdrop-blur-xl',
                'hover:shadow-xl hover:scale-[1.02]',
                'transition-all duration-300 ease-out',
                'animate-slide-up',
                className
            )}
            style={{ animationDelay: `${animationDelay}ms` }}
        >
            {/* Decorative glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl" />

            <CardContent className="p-5 relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    {icon && (
                        <div className={cn('p-2.5 rounded-xl backdrop-blur-sm', styles.iconBg)}>
                            <div className={styles.iconColor}>
                                {icon}
                            </div>
                        </div>
                    )}

                    {hasChange ? (
                        <Badge
                            variant="secondary"
                            className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-semibold',
                                isPositive
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            )}
                        >
                            <span className="flex items-center gap-1">
                                {isPositive ? (
                                    <TrendingUp className="w-3 h-3" />
                                ) : (
                                    <TrendingDown className="w-3 h-3" />
                                )}
                                {Math.abs(change).toFixed(1)}%
                            </span>
                        </Badge>
                    ) : subtitle ? (
                        <Badge
                            variant="secondary"
                            className={cn(
                                'rounded-full text-xs',
                                subtitleType === 'warning'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                    : 'bg-muted/50'
                            )}
                        >
                            {subtitle}
                        </Badge>
                    ) : null}
                </div>

                {/* Value */}
                <div className="space-y-1">
                    <p className={cn('text-2xl xl:text-3xl font-bold tracking-tight', styles.valueColor)}>
                        {value}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                        {title}
                    </p>
                    {changeLabel && (
                        <p className="text-xs text-muted-foreground/70">
                            {changeLabel}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

interface StatsGridProps {
    children: ReactNode;
    columns?: 2 | 3 | 4 | 5;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
    const gridClass = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-2 xl:grid-cols-4',
        5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    };

    return (
        <div className={cn("grid gap-4", gridClass[columns])}>
            {children}
        </div>
    );
}

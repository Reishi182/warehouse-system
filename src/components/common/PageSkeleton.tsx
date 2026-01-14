import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
    variant?: 'table' | 'cards' | 'dashboard' | 'form';
}

export default function PageSkeleton({ variant = 'table' }: PageSkeletonProps) {
    if (variant === 'dashboard') {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-2xl border bg-card p-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="h-12 w-12 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border bg-card p-6">
                        <Skeleton className="h-5 w-40 mb-4" />
                        <div className="flex items-center gap-8">
                            <Skeleton className="h-48 w-48 rounded-full" />
                            <div className="space-y-3 flex-1">
                                <Skeleton className="h-12 w-full rounded-xl" />
                                <Skeleton className="h-12 w-full rounded-xl" />
                                <Skeleton className="h-12 w-full rounded-xl" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border bg-card p-6">
                        <Skeleton className="h-5 w-40 mb-4" />
                        <Skeleton className="h-48 w-full rounded-lg" />
                    </div>
                </div>

                {/* Activity Hub */}
                <div className="rounded-2xl border bg-card">
                    <div className="p-4 border-b">
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <div className="p-4">
                        <div className="flex gap-2 mb-4">
                            <Skeleton className="h-10 w-24 rounded-lg" />
                            <Skeleton className="h-10 w-24 rounded-lg" />
                            <Skeleton className="h-10 w-24 rounded-lg" />
                        </div>
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'cards') {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl border bg-card p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-8 w-12" />
                                </div>
                                <Skeleton className="h-12 w-12 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-2xl border bg-card p-5">
                            <div className="flex gap-4">
                                <Skeleton className="h-16 w-16 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (variant === 'form') {
        return (
            <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
                <div className="rounded-2xl border bg-card p-6 space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-11 w-full rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-11 w-full rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-11 w-full rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-11 w-full rounded-xl" />
                            </div>
                        </div>
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    // Default: table variant
    return (
        <div className="space-y-6 animate-pulse">
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-7 w-12" />
                            </div>
                            <Skeleton className="h-10 w-10 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Header */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="space-y-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32 rounded-xl" />
                        <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                </div>

                {/* Search/Filter Bar */}
                <div className="p-4 border-b flex gap-4">
                    <Skeleton className="h-10 w-64 rounded-xl" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>

                {/* Table Rows */}
                <div className="divide-y">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-4 flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="p-4 border-t flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TableFiltersProps {
    globalFilter: string;
    setGlobalFilter: (value: string) => void;
    columnFilters: ColumnFiltersState;
    setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
    sorting: SortingState;
    setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
    hideSearch: boolean;
    isPremium: boolean;
    columns: { header: string; accessorKey?: string }[];
}

export function TableFilters({
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    hideSearch,
    isPremium,
    columns,
}: TableFiltersProps) {
    const hasActiveFilters = globalFilter || columnFilters.length > 0 || sorting.length > 0;

    // Bug fix #5: Debounce search input (300ms)
    const [localSearch, setLocalSearch] = useState(globalFilter);
    useEffect(() => {
        const timer = setTimeout(() => {
            setGlobalFilter(localSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [localSearch, setGlobalFilter]);

    // Sync local search when globalFilter is cleared externally
    useEffect(() => {
        if (globalFilter === '' && localSearch !== '') {
            setLocalSearch('');
        }
    }, [globalFilter]);

    const clearFilters = useCallback(() => {
        setLocalSearch('');
        setGlobalFilter('');
        setColumnFilters([]);
        setSorting([]);
    }, [setGlobalFilter, setColumnFilters, setSorting]);

    return (
        <div className="px-6 pb-4 space-y-3 relative">
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                {!hideSearch && (
                    <div className="relative mt-4 flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari semua kolom..."
                            className={cn(
                                "pl-10 pr-10 h-10 focus-visible:ring-1",
                                isPremium
                                    ? "rounded-xl bg-muted/30 backdrop-blur-sm"
                                    : "rounded-xl bg-muted/50"
                            )}
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                        />
                        {localSearch && (
                            <button
                                onClick={() => setLocalSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Clear All Filters Button — styled as pill/chip */}
                <div className="flex items-center gap-2 mt-4">
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium",
                                "border border-destructive/20 bg-destructive/5 text-destructive",
                                "hover:bg-destructive/10 hover:border-destructive/30",
                                "transition-all duration-200",
                                isPremium ? "rounded-full" : "rounded-lg"
                            )}
                        >
                            <X className="w-3.5 h-3.5" />
                            Hapus Filter
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filters Tags */}
            {(columnFilters.length > 0 || sorting.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                    {sorting.map((sort) => {
                        const col = columns.find(c => String(c.accessorKey) === sort.id);
                        return (
                            <Badge
                                key={`sort-${sort.id}`}
                                variant="secondary"
                                className={cn(
                                    "gap-1.5 pr-1",
                                    isPremium && "rounded-lg bg-primary/10 text-primary border-0"
                                )}
                            >
                                {sort.desc ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                                {col?.header || sort.id}
                                <button
                                    onClick={() => setSorting([])}
                                    className="ml-1 p-0.5 rounded hover:bg-primary/20"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        );
                    })}
                    {columnFilters.map((filter) => {
                        const col = columns.find(c => String(c.accessorKey) === filter.id);
                        return (
                            <Badge
                                key={`filter-${filter.id}`}
                                variant="secondary"
                                className={cn(
                                    "gap-1.5 pr-1",
                                    isPremium && "rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border-0"
                                )}
                            >
                                <Filter className="w-3 h-3" />
                                {col?.header}: {String(filter.value)}
                                <button
                                    onClick={() => setColumnFilters(prev => prev.filter(f => f.id !== filter.id))}
                                    className="ml-1 p-0.5 rounded hover:bg-violet-500/20"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

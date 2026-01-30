import React from 'react';
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

    const clearFilters = () => {
        setGlobalFilter('');
        setColumnFilters([]);
        setSorting([]);
    };

    return (
        <div className="px-6 pb-4 space-y-3 relative">
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                {!hideSearch && (
                    <div className="relative mt-4 flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search all columns..."
                            className={cn(
                                "pl-10 pr-10 h-10 focus-visible:ring-1",
                                isPremium
                                    ? "rounded-xl bg-muted/30 backdrop-blur-sm"
                                    : "rounded-xl bg-muted/50"
                            )}
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                        {globalFilter && (
                            <button
                                onClick={() => setGlobalFilter('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Clear All Filters Button */}
                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className={cn(
                                "h-10 gap-2 text-muted-foreground hover:text-foreground",
                                isPremium && "rounded-xl"
                            )}
                        >
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">Clear Filters</span>
                        </Button>
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


import React from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    SortingState,
    ColumnDef,
    ColumnFiltersState,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Plus,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Sparkles,
    Filter,
    X,
    SlidersHorizontal,
    ChevronDown
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportButton } from './ExportButton';
import { ExportColumn } from '@/lib/export';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    sortKey?: string;
    sortable?: boolean;
    filterable?: boolean;
    filterOptions?: { label: string; value: string }[];
    cell?: (item: T) => React.ReactNode;
    className?: string;
    exportFormat?: (value: any, row?: T) => string;
}

interface EmptyStateConfig {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

interface BeautifulTableProps<T> {
    data: T[];
    columns: Column<T>[];
    title?: string;
    subtitle?: string;
    onSearch?: (query: string) => void;
    onAdd?: () => void;
    addButtonLabel?: string;
    itemsPerPage?: number;
    isLoading?: boolean;
    hideSelection?: boolean;
    hideExport?: boolean;
    hideSearch?: boolean;
    hideFilters?: boolean;
    exportFilename?: string;
    exportTitle?: string;
    emptyState?: EmptyStateConfig;
    variant?: 'default' | 'premium';
}

export function BeautifulTable<T extends { id: string }>({
    data,
    columns,
    title,
    subtitle,
    onAdd,
    addButtonLabel = "Add New",
    itemsPerPage = 10,
    isLoading = false,
    hideSelection = false,
    hideExport = false,
    hideSearch = false,
    hideFilters = false,
    exportFilename,
    exportTitle,
    emptyState,
    variant = 'premium',
}: BeautifulTableProps<T>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = React.useState('');
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = React.useState({});
    const [showFilters, setShowFilters] = React.useState(false);

    const isPremium = variant === 'premium';

    // Get filterable columns
    const filterableColumns = columns.filter(col => col.filterable && col.accessorKey);

    // Convert our Column interface to TanStack ColumnDef
    const tanstackColumns = React.useMemo<ColumnDef<T>[]>(() => {
        const cols: ColumnDef<T>[] = [];

        // Selection column
        if (!hideSelection) {
            cols.push({
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        className="rounded-md border-gray-300"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        className="rounded-md border-gray-300"
                    />
                ),
                enableSorting: false,
                size: 50,
            });
        }

        // Map user columns
        columns.forEach((col, idx) => {
            cols.push({
                id: String(col.accessorKey || idx),
                accessorKey: col.accessorKey as string,
                header: ({ column }) => {
                    const canSort = col.sortable !== false && col.accessorKey;
                    const isSorted = column.getIsSorted();

                    return (
                        <div
                            className={cn(
                                "flex items-center gap-1.5 group",
                                canSort && "cursor-pointer select-none"
                            )}
                            onClick={() => canSort && column.toggleSorting()}
                        >
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-wider transition-colors",
                                isPremium ? "text-muted-foreground/80 group-hover:text-foreground" : "text-muted-foreground"
                            )}>
                                {col.header}
                            </span>
                            {canSort && (
                                <div className={cn(
                                    "flex items-center justify-center w-5 h-5 rounded-md transition-all",
                                    isSorted
                                        ? "bg-primary/10"
                                        : "opacity-40 group-hover:opacity-100"
                                )}>
                                    {isSorted === 'asc' ? (
                                        <ArrowUp className="w-3.5 h-3.5 text-primary" />
                                    ) : isSorted === 'desc' ? (
                                        <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                    ) : (
                                        <ArrowUpDown className="w-3.5 h-3.5" />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => {
                    if (col.cell) {
                        return col.cell(row.original);
                    }
                    const value = col.accessorKey ? row.original[col.accessorKey] : null;
                    return <span className="text-sm text-foreground">{String(value ?? '')}</span>;
                },
                enableSorting: col.sortable !== false,
                filterFn: 'includesString',
            });
        });

        return cols;
    }, [columns, hideSelection, isPremium]);

    const table = useReactTable({
        data,
        columns: tanstackColumns,
        state: {
            sorting,
            globalFilter,
            columnFilters,
            rowSelection,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        enableRowSelection: !hideSelection,
        initialState: {
            pagination: { pageSize: itemsPerPage },
        },
    });

    // Generate export columns from our column definitions
    const exportColumns: ExportColumn[] = React.useMemo(() => {
        return columns
            .filter(col => col.accessorKey && col.header)
            .map(col => ({
                header: col.header,
                accessorKey: String(col.accessorKey),
                format: col.exportFormat,
            }));
    }, [columns]);

    // Clear all filters
    const clearFilters = () => {
        setGlobalFilter('');
        setColumnFilters([]);
        setSorting([]);
    };

    const hasActiveFilters = globalFilter || columnFilters.length > 0 || sorting.length > 0;

    return (
        <div className="space-y-4 animate-slide-up">
            <div className={cn(
                "rounded-2xl overflow-hidden transition-all duration-300 relative",
                isPremium
                    ? "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg"
                    : "bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm"
            )}>
                {/* Decorative gradient overlay for premium */}
                {isPremium && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                )}

                {/* Header with Title and Actions */}
                {(title || !hideExport || onAdd) && (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 pb-4 gap-4 relative">
                        <div>
                            {title && (
                                <div className="flex items-center gap-3">
                                    {isPremium && (
                                        <div className="p-2 rounded-xl bg-primary/10">
                                            <Sparkles className="w-5 h-5 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <h2 className={cn(
                                            "font-bold text-foreground",
                                            isPremium ? "text-xl" : "text-lg"
                                        )}>
                                            {title}
                                        </h2>
                                        {subtitle && (
                                            <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-bold",
                                        isPremium
                                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary"
                                            : "bg-primary/10 text-primary"
                                    )}>
                                        {table.getFilteredRowModel().rows.length} Total
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {!hideExport && (
                                <ExportButton
                                    data={table.getFilteredRowModel().rows.map(row => row.original)}
                                    columns={exportColumns}
                                    filename={exportFilename || title?.toLowerCase().replace(/\s+/g, '_') || 'export'}
                                    title={exportTitle || title}
                                    subtitle={`Exported on ${new Date().toLocaleDateString('id-ID')}`}
                                />
                            )}
                            {onAdd && (
                                <Button
                                    onClick={onAdd}
                                    size="sm"
                                    className={cn(
                                        "h-9 px-4 font-semibold",
                                        isPremium
                                            ? "rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                                            : "rounded-xl"
                                    )}
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    {addButtonLabel}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Premium Search & Filter Bar */}
                <div className="px-6 pb-4 space-y-3 relative">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search Input */}
                        {!hideSearch && (
                            <div className="relative mt-4 flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search all columns..."
                                    className={cn(
                                        "pl-10 pr-10 h-10 border-0 focus-visible:ring-1",
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

                        {/* Filter & Sort Controls */}
                        <div className="flex items-center gap-2">

                            {/* Filter Toggle */}
                            {!hideFilters && filterableColumns.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={cn(
                                        "h-10 gap-2",
                                        isPremium ? "rounded-xl border-border/50" : "rounded-lg",
                                        (showFilters || columnFilters.length > 0) && "border-primary/50 bg-primary/5"
                                    )}
                                >
                                    <Filter className="w-4 h-4" />
                                    <span className="hidden sm:inline">Filter</span>
                                    {columnFilters.length > 0 && (
                                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 text-xs">
                                            {columnFilters.length}
                                        </Badge>
                                    )}
                                </Button>
                            )}

                            {/* Clear All Filters */}
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
                                    <span className="hidden sm:inline">Clear</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Expandable Column Filters */}
                    {showFilters && filterableColumns.length > 0 && (
                        <div className={cn(
                            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 rounded-xl animate-slide-up",
                            isPremium ? "bg-muted/20 border border-border/30" : "bg-muted/30"
                        )}>
                            {filterableColumns.map((col) => {
                                const columnId = String(col.accessorKey);
                                const currentFilter = columnFilters.find(f => f.id === columnId);

                                if (col.filterOptions) {
                                    // Dropdown filter
                                    return (
                                        <div key={columnId} className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">
                                                {col.header}
                                            </label>
                                            <Select
                                                value={currentFilter?.value as string || ''}
                                                onValueChange={(value) => {
                                                    if (value === '_all_') {
                                                        setColumnFilters(prev => prev.filter(f => f.id !== columnId));
                                                    } else {
                                                        setColumnFilters(prev => {
                                                            const existing = prev.filter(f => f.id !== columnId);
                                                            return [...existing, { id: columnId, value }];
                                                        });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className={cn(
                                                    "h-9",
                                                    isPremium && "rounded-lg bg-background/50"
                                                )}>
                                                    <SelectValue placeholder="All" />
                                                </SelectTrigger>
                                                <SelectContent className={cn(isPremium && "rounded-xl")}>
                                                    <SelectItem value="_all_">All</SelectItem>
                                                    {col.filterOptions.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    );
                                }

                                // Text filter
                                return (
                                    <div key={columnId} className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            {col.header}
                                        </label>
                                        <Input
                                            placeholder={`Filter ${col.header.toLowerCase()}...`}
                                            value={(currentFilter?.value as string) || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (!value) {
                                                    setColumnFilters(prev => prev.filter(f => f.id !== columnId));
                                                } else {
                                                    setColumnFilters(prev => {
                                                        const existing = prev.filter(f => f.id !== columnId);
                                                        return [...existing, { id: columnId, value }];
                                                    });
                                                }
                                            }}
                                            className={cn(
                                                "h-9",
                                                isPremium && "rounded-lg bg-background/50"
                                            )}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

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

                {/* Table */}
                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow
                                    key={headerGroup.id}
                                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-transparent bg-gray-50/50 dark:bg-gray-800/30"
                                >
                                    {headerGroup.headers.map((header, idx) => (
                                        <TableHead
                                            key={header.id}
                                            className={cn(
                                                "h-12 py-3",
                                                idx === 0 && "pl-6"
                                            )}
                                            style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                                        >
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} style={{ animationDelay: `${i * 100}ms` }} className="animate-pulse">
                                        <TableCell colSpan={tanstackColumns.length} className="h-16 pl-6">
                                            <div className="w-full h-5 bg-muted/50 rounded-lg" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row, rowIdx) => (
                                    <TableRow
                                        key={row.id}
                                        className={cn(
                                            "transition-all duration-200",
                                            "border-b border-gray-100 dark:border-gray-800",
                                            row.getIsSelected()
                                                ? "bg-primary/5"
                                                : "bg-white dark:bg-gray-900",
                                            !row.getIsSelected() && "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        )}
                                    >
                                        {row.getVisibleCells().map((cell, idx) => (
                                            <TableCell
                                                key={cell.id}
                                                className={cn(
                                                    "py-4",
                                                    idx === 0 && "pl-6"
                                                )}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={tanstackColumns.length} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center py-12">
                                            {emptyState?.icon ? (
                                                <div className={cn(
                                                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg",
                                                    isPremium
                                                        ? "bg-gradient-to-br from-primary via-primary/80 to-primary/60"
                                                        : "bg-gradient-to-br from-primary to-primary/60"
                                                )}>
                                                    <div className="text-white">{emptyState.icon}</div>
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-5",
                                                    isPremium
                                                        ? "bg-gradient-to-br from-muted to-muted/50"
                                                        : "bg-muted"
                                                )}>
                                                    <Search className="w-7 h-7 text-muted-foreground" />
                                                </div>
                                            )}
                                            <h3 className="text-base font-semibold text-foreground mb-1">
                                                {emptyState?.title || 'Tidak ada data'}
                                            </h3>
                                            <p className="text-sm text-muted-foreground max-w-xs mb-5">
                                                {emptyState?.description || 'Belum ada data yang tersedia.'}
                                            </p>
                                            {emptyState?.actionLabel && emptyState?.onAction && (
                                                <Button
                                                    onClick={emptyState.onAction}
                                                    className={cn(
                                                        isPremium
                                                            ? "rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25"
                                                            : "rounded-xl"
                                                    )}
                                                >
                                                    <Plus className="w-4 h-4 mr-1.5" />
                                                    {emptyState.actionLabel}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Premium Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 pt-4 gap-4 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Showing</span>
                        <span className="font-semibold text-foreground">
                            {table.getFilteredRowModel().rows.length === 0 ? 0 : table.getState().pagination.pageIndex * itemsPerPage + 1}
                        </span>
                        <span>to</span>
                        <span className="font-semibold text-foreground">
                            {Math.min((table.getState().pagination.pageIndex + 1) * itemsPerPage, table.getFilteredRowModel().rows.length)}
                        </span>
                        <span>of</span>
                        <span className="font-semibold text-foreground">
                            {table.getFilteredRowModel().rows.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className={cn(
                                "h-9 px-3",
                                isPremium && "rounded-xl hover:bg-muted/50"
                            )}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Previous</span>
                        </Button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, table.getPageCount()) }).map((_, i) => {
                                const totalPages = table.getPageCount();
                                const currentPage = table.getState().pagination.pageIndex;

                                // Calculate which page numbers to show
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage < 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 3) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 1 + i;
                                }

                                if (pageNum < 1 || pageNum > totalPages) return null;

                                const isActive = currentPage + 1 === pageNum;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => table.setPageIndex(pageNum - 1)}
                                        className={cn(
                                            "w-9 h-9 rounded-xl text-sm font-semibold transition-all",
                                            isActive
                                                ? isPremium
                                                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                                                    : "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className={cn(
                                "h-9 px-3",
                                isPremium && "rounded-xl hover:bg-muted/50"
                            )}
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

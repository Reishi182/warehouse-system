import React, { useRef } from 'react';
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
import {
    Search,
    Plus,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Filter,
    X,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
import { PAGINATION } from '@/constants';

// Import sub-components
import { Column, EmptyStateConfig, BeautifulTableProps } from './BeautifulTable/types';
import { TableHeaderSection } from './BeautifulTable/TableHeaderSection';
import { TableFilters } from './BeautifulTable/TableFilters';
import { TablePagination } from './BeautifulTable/TablePagination';

// Re-export types for backward compatibility
export type { Column, EmptyStateConfig, BeautifulTableProps };

export function BeautifulTable<T extends { id: string }>({
    data,
    columns,
    title,
    subtitle,
    onAdd,
    addButtonLabel = "Add New",
    itemsPerPage = PAGINATION.DEFAULT_PAGE_SIZE,
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
    const [pageSize, setPageSize] = React.useState(itemsPerPage);
    const [pageIndex, setPageIndex] = React.useState(0);
    const expandedGroupsRef = React.useRef<Set<string>>(new Set());
    const [, forceRender] = React.useState(0);
    const toggleExpandedGroup = React.useCallback((value: string) => {
        const groups = expandedGroupsRef.current;
        if (groups.has(value)) groups.delete(value);
        else groups.add(value);
        forceRender(n => n + 1);
    }, []);

    const isPremium = variant === 'premium';

    // Get unique values for each filterable column
    const getUniqueValues = React.useCallback((accessorKey: keyof T) => {
        const values = new Set<string>();
        data.forEach(item => {
            const value = item[accessorKey];
            if (value !== null && value !== undefined) {
                values.add(String(value));
            }
        });
        return Array.from(values).sort();
    }, [data]);

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
            const columnId = String(col.accessorKey || idx);
            // Excel-like: all columns with accessorKey are filterable by default
            const canFilter = col.filterable !== false && !!col.accessorKey;

            cols.push({
                id: columnId,
                accessorKey: col.accessorKey as string,
                header: ({ column }) => {
                    const canSort = col.sortable !== false && col.accessorKey;
                    const isSorted = column.getIsSorted();
                    const currentFilter = columnFilters.find(f => f.id === columnId);
                    const hasFilter = !!currentFilter;

                    const filterOptions: { label: string; value: string; children?: { label: string; value: string }[] }[] = col.filterOptions || (
                        canFilter ? getUniqueValues(col.accessorKey!).map(v => ({ label: v, value: v })) : []
                    );

                    return (
                        <div className="flex items-center gap-1">
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

                            {/* Column Filter Dropdown */}
                            {canFilter && filterOptions.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-6 w-6 rounded-md ml-1 transition-all",
                                                hasFilter
                                                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                                                    : "opacity-50 hover:opacity-100 hover:bg-muted"
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Filter className="w-3 h-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="start"
                                        className={cn(
                                            "min-w-[180px] max-h-[300px] overflow-y-auto",
                                            isPremium && "rounded-xl border-border/50"
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                            Filter {col.header}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem
                                            onClick={() => {
                                                setColumnFilters(prev => prev.filter(f => f.id !== columnId));
                                            }}
                                            className={cn(
                                                "gap-2",
                                                !hasFilter && "text-muted-foreground"
                                            )}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Tampilkan Semua
                                            {!hasFilter && (
                                                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                                                    Aktif
                                                </Badge>
                                            )}
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        {filterOptions.map(opt => {
                                            const hasChildren = opt.children && opt.children.length > 0;
                                            const isGroupSelected = currentFilter?.value === opt.value;
                                            const isChildSelected = hasChildren && opt.children!.some(c => currentFilter?.value === c.value);
                                            const isAnySelected = isGroupSelected || isChildSelected;

                                            if (!hasChildren) {
                                                // Flat option (no children)
                                                return (
                                                    <DropdownMenuItem
                                                        key={opt.value}
                                                        onClick={() => {
                                                            setColumnFilters(prev => {
                                                                const existing = prev.filter(f => f.id !== columnId);
                                                                return [...existing, { id: columnId, value: opt.value }];
                                                            });
                                                        }}
                                                        className={cn(
                                                            "gap-2 cursor-pointer",
                                                            isGroupSelected && "bg-primary/10 text-primary"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-3 h-3 rounded-full border-2 flex-shrink-0",
                                                            isGroupSelected
                                                                ? "border-primary bg-primary"
                                                                : "border-muted-foreground/30"
                                                        )} />
                                                        <span className="truncate">{opt.label}</span>
                                                        {isGroupSelected && (
                                                            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                                                                Aktif
                                                            </Badge>
                                                        )}
                                                    </DropdownMenuItem>
                                                );
                                            }

                                            // Group option with children (hierarchical)
                                            const isExpanded = expandedGroupsRef.current.has(opt.value) || isChildSelected;
                                            return (
                                                <div key={opt.value}>
                                                    {/* Group header row: chevron + month label side by side */}
                                                    <div className="flex items-center gap-0">
                                                        {/* Chevron — separate DropdownMenuItem that only toggles expand */}
                                                        <DropdownMenuItem
                                                            onSelect={(e) => {
                                                                e.preventDefault();
                                                                toggleExpandedGroup(opt.value);
                                                            }}
                                                            className="px-1.5 py-1.5 cursor-pointer rounded-md flex-shrink-0 focus:bg-muted"
                                                        >
                                                            {isExpanded
                                                                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                                                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                                            }
                                                        </DropdownMenuItem>

                                                        {/* Month label — click = filter semua tanggal di bulan ini */}
                                                        <DropdownMenuItem
                                                            onSelect={(e) => {
                                                                e.preventDefault();
                                                                setColumnFilters(prev => {
                                                                    const existing = prev.filter(f => f.id !== columnId);
                                                                    return [...existing, { id: columnId, value: opt.value }];
                                                                });
                                                            }}
                                                            className={cn(
                                                                "gap-2 cursor-pointer font-semibold flex-1",
                                                                isGroupSelected && "bg-primary/10 text-primary"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-3 h-3 rounded-sm border-2 flex-shrink-0",
                                                                isAnySelected
                                                                    ? "border-primary bg-primary"
                                                                    : "border-muted-foreground/30"
                                                            )} />
                                                            <span className="truncate">{opt.label}</span>
                                                            {isGroupSelected && (
                                                                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                                                                    Semua
                                                                </Badge>
                                                            )}
                                                        </DropdownMenuItem>
                                                    </div>

                                                    {/* Children — only visible when expanded */}
                                                    {isExpanded && opt.children!.map(child => {
                                                        const isChildActive = currentFilter?.value === child.value;
                                                        return (
                                                            <DropdownMenuItem
                                                                key={child.value}
                                                                onSelect={(e) => {
                                                                    e.preventDefault();
                                                                    setColumnFilters(prev => {
                                                                        const existing = prev.filter(f => f.id !== columnId);
                                                                        return [...existing, { id: columnId, value: child.value }];
                                                                    });
                                                                }}
                                                                className={cn(
                                                                    "gap-2 cursor-pointer pl-8 text-xs",
                                                                    isChildActive && "bg-primary/10 text-primary"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-2.5 h-2.5 rounded-full border-2 flex-shrink-0",
                                                                    isChildActive
                                                                        ? "border-primary bg-primary"
                                                                        : "border-muted-foreground/20"
                                                                )} />
                                                                <span className="truncate">{child.label}</span>
                                                                {isChildActive && (
                                                                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                                                                        Aktif
                                                                    </Badge>
                                                                )}
                                                            </DropdownMenuItem>
                                                        );
                                                    })}

                                                    <DropdownMenuSeparator className="my-1" />
                                                </div>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => {
                    if (col.cell) {
                        return col.cell(row.original, row.index);
                    }
                    const value = col.accessorKey ? row.original[col.accessorKey] : null;
                    return <span className="text-sm text-foreground">{String(value ?? '')}</span>;
                },
                enableSorting: col.sortable !== false,
                // Use startsWith for filter matching (supports date filtering where value is date-only but cell has timestamp)
                filterFn: (row, columnId, filterValue) => {
                    const cellValue = String(row.getValue(columnId) ?? '');
                    const filter = String(filterValue);
                    return cellValue === filter || cellValue.startsWith(filter);
                },
            });
        });

        return cols;
    }, [columns, hideSelection, isPremium, getUniqueValues, columnFilters]);

    // Effective page size (handle "All" case)
    const effectivePageSize = pageSize === -1 ? data.length || 1 : pageSize;

    const table = useReactTable({
        data,
        columns: tanstackColumns,
        state: {
            sorting,
            globalFilter,
            columnFilters,
            rowSelection,
            pagination: {
                pageIndex,
                pageSize: effectivePageSize,
            },
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const newState = typeof updater === 'function'
                ? updater({ pageIndex, pageSize: effectivePageSize })
                : updater;
            setPageIndex(newState.pageIndex);
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        enableRowSelection: !hideSelection,
    });

    // Update table page size when pageSize changes
    React.useEffect(() => {
        table.setPageSize(effectivePageSize);
    }, [effectivePageSize, table]);

    // Bug fix #4: Reset page index only when filters actually change
    // Use serialized values for stable comparison
    const prevDataLenRef = useRef(data.length);
    const serializedFilters = JSON.stringify(columnFilters);
    React.useEffect(() => {
        setPageIndex(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [globalFilter, serializedFilters]);

    // Only reset page when data count actually changes (not on reference changes)
    React.useEffect(() => {
        if (data.length !== prevDataLenRef.current) {
            prevDataLenRef.current = data.length;
            setPageIndex(0);
        }
    }, [data.length]);

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

    const filteredRows = table.getFilteredRowModel().rows;

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

                {/* Header Section */}
                <TableHeaderSection
                    title={title}
                    subtitle={subtitle}
                    totalFiltered={filteredRows.length}
                    isPremium={isPremium}
                    hideExport={hideExport}
                    onAdd={onAdd}
                    addButtonLabel={addButtonLabel}
                    exportData={filteredRows.map(row => row.original)}
                    exportColumns={exportColumns}
                    exportFilename={exportFilename}
                    exportTitle={exportTitle}
                />

                {/* Filters Section */}
                <TableFilters
                    globalFilter={globalFilter}
                    setGlobalFilter={setGlobalFilter}
                    columnFilters={columnFilters}
                    setColumnFilters={setColumnFilters}
                    sorting={sorting}
                    setSorting={setSorting}
                    hideSearch={hideSearch}
                    isPremium={isPremium}
                    columns={columns.map(c => ({ header: c.header, accessorKey: c.accessorKey as string }))}
                />

                {/* Table */}
                <div className="w-full overflow-x-auto">
                    <Table>
                        {/* Bug fix #8: Sticky header for better UX on long tables */}
                        <TableHeader className="sticky top-0 z-10">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow
                                    key={headerGroup.id}
                                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-transparent bg-gray-50 dark:bg-gray-800"
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
                                table.getRowModel().rows.map((row) => (
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

                {/* Pagination Section */}
                <TablePagination
                    currentPage={table.getState().pagination.pageIndex}
                    totalPages={table.getPageCount()}
                    totalFiltered={filteredRows.length}
                    pageSize={pageSize}
                    effectivePageSize={effectivePageSize}
                    setPageSize={setPageSize}
                    canPreviousPage={table.getCanPreviousPage()}
                    canNextPage={table.getCanNextPage()}
                    previousPage={() => table.previousPage()}
                    nextPage={() => table.nextPage()}
                    setPageIndex={(index) => table.setPageIndex(index)}
                    isPremium={isPremium}
                />
            </div>
        </div>
    );
}

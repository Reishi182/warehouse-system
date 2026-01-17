
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
import { Search, ChevronLeft, ChevronRight, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportButton } from './ExportButton';
import { ExportColumn } from '@/lib/export';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    sortKey?: string;
    sortable?: boolean;
    cell?: (item: T) => React.ReactNode;
    className?: string;
    exportFormat?: (value: any, row?: T) => string;  // Format for export
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
    exportFilename?: string;
    exportTitle?: string;
    emptyState?: EmptyStateConfig;
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
    exportFilename,
    exportTitle,
    emptyState,
}: BeautifulTableProps<T>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = React.useState('');
    const [rowSelection, setRowSelection] = React.useState({});

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
                    return (
                        <div
                            className={`flex items-center gap-1 ${canSort ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                            onClick={() => canSort && column.toggleSorting()}
                        >
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                {col.header}
                            </span>
                            {canSort && (
                                column.getIsSorted() === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> :
                                    column.getIsSorted() === 'desc' ? <ArrowDown className="w-3 h-3 text-primary" /> :
                                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                            )}
                        </div>
                    );
                },
                cell: ({ row }) => {
                    if (col.cell) {
                        return col.cell(row.original);
                    }
                    const value = col.accessorKey ? row.original[col.accessorKey] : null;
                    return <span className="text-sm text-muted-foreground">{String(value ?? '')}</span>;
                },
                enableSorting: col.sortable !== false,
            });
        });

        return cols;
    }, [columns, hideSelection]);

    const table = useReactTable({
        data,
        columns: tanstackColumns,
        state: {
            sorting,
            globalFilter,
            rowSelection,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
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

    return (
        <div className="space-y-4">
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                {/* Header with Title and Actions */}
                {(title || !hideExport || onAdd) && (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 pb-4 gap-4">
                        <div>
                            {title && (
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-foreground">{title}</h2>
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                        {table.getFilteredRowModel().rows.length} Total
                                    </span>
                                </div>
                            )}
                            {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
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
                                <Button onClick={onAdd} size="sm" className="rounded-xl h-9 px-4 font-semibold">
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    {addButtonLabel}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                {!hideSearch && (
                    <div className="px-6 pb-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search all columns..."
                                className="pl-9 h-9 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-muted/30 border-b hover:bg-muted/30">
                                    {headerGroup.headers.map((header, idx) => (
                                        <TableHead
                                            key={header.id}
                                            className={`h-11 py-3 ${idx === 0 ? 'pl-6' : ''}`}
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
                                    <TableRow key={i}>
                                        <TableCell colSpan={tanstackColumns.length} className="h-16 pl-6">
                                            <div className="w-full h-5 bg-muted rounded animate-pulse" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className={`border-b border-border/50 transition-colors ${row.getIsSelected() ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                                    >
                                        {row.getVisibleCells().map((cell, idx) => (
                                            <TableCell key={cell.id} className={`py-4 ${idx === 0 ? 'pl-6' : ''}`}>
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
                                                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                                                    <div className="text-white">{emptyState.icon}</div>
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
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
                                                <Button onClick={emptyState.onAction} className="rounded-xl">
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

                {/* Pagination */}
                <div className="flex items-center justify-between p-6 pt-4 border-t">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, table.getPageCount()) }).map((_, i) => {
                            const pageNum = i + 1;
                            const isActive = table.getState().pagination.pageIndex + 1 === pageNum;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => table.setPageIndex(pageNum - 1)}
                                    className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                                        }`}
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
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

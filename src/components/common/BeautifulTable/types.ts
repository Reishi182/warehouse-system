import React from 'react';
import { SortingState, ColumnFiltersState } from '@tanstack/react-table';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    sortKey?: string;
    sortable?: boolean;
    filterable?: boolean;
    filterOptions?: { label: string; value: string; children?: { label: string; value: string }[] }[];
    cell?: (item: T, index?: number) => React.ReactNode;
    className?: string;
    exportFormat?: (value: any, row?: T) => string;
}

export interface EmptyStateConfig {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export interface BeautifulTableProps<T> {
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
    /** Accessor key for a date field. When set, the export button shows a date range filter dialog. */
    exportDateFilterAccessor?: string;
    emptyState?: EmptyStateConfig;
    variant?: 'default' | 'premium';
    /** Custom global search predicate. When provided, a row is visible if
     *  this function returns true for the given query string. */
    globalFilterFn?: (row: T, query: string) => boolean;
    /** If true, the table's current page will be synced with the URL query params. Default is true. */
    syncPaginationWithUrl?: boolean;
    /** The URL parameter name to use when syncing. Useful if multiple tables are on the same page. Default is "page". */
    paginationUrlParam?: string;
}

export interface TableHeaderProps<T> {
    title?: string;
    subtitle?: string;
    totalFiltered: number;
    isPremium: boolean;
    hideExport: boolean;
    onAdd?: () => void;
    addButtonLabel: string;
    exportData: T[];
    exportColumns: { header: string; accessorKey: string; format?: (value: any, row?: T) => string }[];
    exportFilename?: string;
    exportTitle?: string;
}

export interface TableFiltersProps {
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

export interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    totalFiltered: number;
    pageSize: number;
    effectivePageSize: number;
    setPageSize: (size: number) => void;
    canPreviousPage: boolean;
    canNextPage: boolean;
    previousPage: () => void;
    nextPage: () => void;
    setPageIndex: (index: number) => void;
    isPremium: boolean;
    pageSizeOptions: readonly number[];
}

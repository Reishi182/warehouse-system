import React, { memo, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PAGINATION } from '@/constants';

interface TablePaginationProps {
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
}

function TablePaginationComponent({
    currentPage,
    totalPages,
    totalFiltered,
    pageSize,
    effectivePageSize,
    setPageSize,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
    setPageIndex,
    isPremium,
}: TablePaginationProps) {
    const pageSizeOptions = PAGINATION.PAGE_SIZE_OPTIONS;

    // Memoize page number calculations
    const pageNumbers = useMemo(() => {
        const pages: number[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage < 3) {
            for (let i = 1; i <= maxVisible; i++) pages.push(i);
        } else if (currentPage >= totalPages - 3) {
            for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
        } else {
            for (let i = currentPage - 1; i <= currentPage + 3; i++) pages.push(i);
        }

        return pages.filter(p => p >= 1 && p <= totalPages);
    }, [currentPage, totalPages]);

    // Memoize handlers
    const handlePageSizeChange = useCallback((value: string) => {
        const newSize = parseInt(value);
        setPageSize(newSize);
        setPageIndex(0);
    }, [setPageSize, setPageIndex]);

    const handleFirstPage = useCallback(() => setPageIndex(0), [setPageIndex]);
    const handleLastPage = useCallback(() => setPageIndex(totalPages - 1), [setPageIndex, totalPages]);

    // Don't render pagination if no data
    if (totalFiltered === 0 && totalPages === 0) {
        return null;
    }

    return (
        <div
            className="flex flex-col sm:flex-row items-center justify-between p-6 pt-4 gap-4 bg-gray-50/50 dark:bg-gray-800/30"
            role="navigation"
            aria-label="Table pagination"
        >
            <div className="flex items-center gap-4">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2 text-sm">
                    <label htmlFor="page-size-select" className="text-muted-foreground">
                        Show
                    </label>
                    <Select
                        value={String(pageSize)}
                        onValueChange={handlePageSizeChange}
                    >
                        <SelectTrigger
                            id="page-size-select"
                            className={cn(
                                "w-[75px] h-8",
                                isPremium && "rounded-lg"
                            )}
                            aria-label="Select page size"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={cn(isPremium && "rounded-xl")}>
                            {pageSizeOptions.map(size => (
                                <SelectItem key={size} value={String(size)}>
                                    {size === -1 ? 'All' : size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">entries</span>
                </div>

                {/* Showing info */}
                <div
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    <span>Showing</span>
                    <span className="font-semibold text-foreground">
                        {totalFiltered === 0 ? 0 : currentPage * effectivePageSize + 1}
                    </span>
                    <span>to</span>
                    <span className="font-semibold text-foreground">
                        {Math.min((currentPage + 1) * effectivePageSize, totalFiltered)}
                    </span>
                    <span>of</span>
                    <span className="font-semibold text-foreground">
                        {totalFiltered}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1" role="group" aria-label="Pagination controls">
                {/* First Page Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleFirstPage}
                    disabled={!canPreviousPage}
                    className={cn(
                        "h-9 w-9 p-0 hidden sm:flex",
                        isPremium && "rounded-xl hover:bg-muted/50"
                    )}
                    aria-label="Go to first page"
                    title="First page"
                >
                    <ChevronsLeft className="w-4 h-4" />
                </Button>

                {/* Previous Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={previousPage}
                    disabled={!canPreviousPage}
                    className={cn(
                        "h-9 px-3",
                        isPremium && "rounded-xl hover:bg-muted/50"
                    )}
                    aria-label="Go to previous page"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                </Button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1">
                    {pageNumbers.map((pageNum) => {
                        const isActive = currentPage + 1 === pageNum;
                        return (
                            <button
                                key={pageNum}
                                type="button"
                                onClick={() => setPageIndex(pageNum - 1)}
                                disabled={isActive}
                                className={cn(
                                    "w-9 h-9 rounded-xl text-sm font-semibold transition-all",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                    isActive
                                        ? isPremium
                                            ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 cursor-default"
                                            : "bg-primary text-primary-foreground cursor-default"
                                        : "text-muted-foreground hover:bg-muted/50 cursor-pointer"
                                )}
                                aria-label={`Go to page ${pageNum}`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                {/* Next Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={nextPage}
                    disabled={!canNextPage}
                    className={cn(
                        "h-9 px-3",
                        isPremium && "rounded-xl hover:bg-muted/50"
                    )}
                    aria-label="Go to next page"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                {/* Last Page Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLastPage}
                    disabled={!canNextPage}
                    className={cn(
                        "h-9 w-9 p-0 hidden sm:flex",
                        isPremium && "rounded-xl hover:bg-muted/50"
                    )}
                    aria-label="Go to last page"
                    title="Last page"
                >
                    <ChevronsRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders
export const TablePagination = memo(TablePaginationComponent);

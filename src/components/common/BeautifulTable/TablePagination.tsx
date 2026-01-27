import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export function TablePagination({
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

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 pt-4 gap-4 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="flex items-center gap-4">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Show</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                            const newSize = parseInt(value);
                            setPageSize(newSize);
                            setPageIndex(0);
                        }}
                    >
                        <SelectTrigger className={cn(
                            "w-[75px] h-8",
                            isPremium && "rounded-lg"
                        )}>
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
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={previousPage}
                    disabled={!canPreviousPage}
                    className={cn(
                        "h-9 px-3",
                        isPremium && "rounded-xl hover:bg-muted/50"
                    )}
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
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
                                onClick={() => setPageIndex(pageNum - 1)}
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
                    onClick={nextPage}
                    disabled={!canNextPage}
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
    );
}

import { Button } from '@/components/ui/button';
import { useGlobalShortcuts } from '@/components/common/GlobalShortcutsProvider';
import { Search, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchButtonProps {
    className?: string;
    variant?: 'icon' | 'full' | 'compact';
}

/**
 * Search Button - Triggers the global search (Ctrl+K)
 */
export function SearchButton({ className, variant = 'full' }: SearchButtonProps) {
    const { openSearch } = useGlobalShortcuts();

    if (variant === 'icon') {
        return (
            <Button
                variant="ghost"
                size="icon"
                onClick={openSearch}
                className={cn("h-9 w-9", className)}
            >
                <Search className="h-4 w-4" />
                <span className="sr-only">Pencarian (Ctrl+K)</span>
            </Button>
        );
    }

    if (variant === 'compact') {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={openSearch}
                className={cn("h-8 gap-2 px-3 text-muted-foreground", className)}
            >
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Cari...</span>
                <kbd className="ml-1 hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                    <Command className="h-2.5 w-2.5" />K
                </kbd>
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            onClick={openSearch}
            className={cn(
                "relative h-9 w-full justify-start rounded-lg text-sm text-muted-foreground sm:w-64 md:w-80",
                className
            )}
        >
            <Search className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline-flex">Cari produk, halaman...</span>
            <span className="inline-flex lg:hidden">Cari...</span>
            <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <Command className="h-3 w-3" />K
            </kbd>
        </Button>
    );
}

export default SearchButton;

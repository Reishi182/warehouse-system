import { useLocation } from 'react-router-dom';
import { usePinnedPages } from '@/hooks/usePinnedPages';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinPageButtonProps {
    title: string;
    className?: string;
    variant?: 'icon' | 'button';
}

/**
 * Button to pin/unpin the current page to favorites
 */
export function PinPageButton({ title, className, variant = 'icon' }: PinPageButtonProps) {
    const location = useLocation();
    const { isPagePinned, togglePin, canPinMore } = usePinnedPages();

    const isPinned = isPagePinned(location.pathname);

    const handleClick = () => {
        togglePin(location.pathname, title);
    };

    if (variant === 'icon') {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClick}
                        className={cn("h-8 w-8", className)}
                        disabled={!isPinned && !canPinMore}
                    >
                        <Star
                            className={cn(
                                "w-4 h-4 transition-colors",
                                isPinned
                                    ? "fill-yellow-500 text-yellow-500"
                                    : "text-muted-foreground hover:text-yellow-500"
                            )}
                        />
                        <span className="sr-only">
                            {isPinned ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                        </span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {isPinned ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Button
            variant={isPinned ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleClick}
            className={cn("gap-2", className)}
            disabled={!isPinned && !canPinMore}
        >
            <Star
                className={cn(
                    "w-4 h-4",
                    isPinned && "fill-yellow-500 text-yellow-500"
                )}
            />
            {isPinned ? 'Tersimpan' : 'Simpan'}
        </Button>
    );
}

export default PinPageButton;

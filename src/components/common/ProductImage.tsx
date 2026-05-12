import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { thumbUrl, cardUrl, mediumUrl, fullUrl, storageUrl, StorageUrlOptions } from '@/lib/storageUrl';

type SizePreset = 'thumb' | 'card' | 'medium' | 'full' | 'custom';

interface ProductImageProps {
    src?: string | null;
    alt?: string;
    /** Preset size: thumb (80px), card (200px), medium (400px), full (800px), custom */
    size?: SizePreset;
    /** Used when size='custom' */
    customOptions?: StorageUrlOptions;
    className?: string;
    /** Tailwind class for the fallback placeholder container */
    placeholderClassName?: string;
    /** Whether to use native lazy loading (default: true) */
    lazy?: boolean;
}

/**
 * ProductImage
 *
 * Renders a product image served through Supabase's CDN image transform endpoint.
 * - Automatically converts storage URLs → CDN-cached transform URLs
 * - Falls back to original URL if transform fails (img onError)
 * - Shows a placeholder icon when no image is available
 * - Uses native lazy loading by default
 */
export default function ProductImage({
    src,
    alt = '',
    size = 'thumb',
    customOptions,
    className,
    placeholderClassName,
    lazy = true,
}: ProductImageProps) {
    const [errored, setErrored] = useState(false);

    const cdnUrl = (() => {
        if (!src) return null;
        switch (size) {
            case 'thumb':  return thumbUrl(src);
            case 'card':   return cardUrl(src);
            case 'medium': return mediumUrl(src);
            case 'full':   return fullUrl(src);
            case 'custom': return storageUrl(src, customOptions);
            default:       return thumbUrl(src);
        }
    })();

    if (!cdnUrl || errored && !src) {
        return (
            <div className={cn(
                'flex items-center justify-center bg-muted/40 text-muted-foreground/40 rounded',
                placeholderClassName,
                className
            )}>
                <Package className="w-1/2 h-1/2" />
            </div>
        );
    }

    return (
        <img
            src={errored ? src! : cdnUrl}
            alt={alt}
            loading={lazy ? 'lazy' : 'eager'}
            decoding="async"
            onError={() => {
                if (!errored) setErrored(true);
            }}
            className={cn('object-cover', className)}
        />
    );
}

import React, { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    alt: string;
    fallbackIcon?: React.ReactNode;
    className?: string;
    containerClassName?: string;
}

/**
 * LazyImage - Optimized image component with:
 * - Intersection Observer for true lazy loading
 * - Blur placeholder while loading
 * - Fade-in animation when loaded
 * - Error handling with fallback
 */
export const LazyImage = memo(function LazyImage({
    src,
    alt,
    fallbackIcon,
    className,
    containerClassName,
    ...props
}: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    // Use Intersection Observer for lazy loading
    useEffect(() => {
        const element = imgRef.current;
        if (!element || !src) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '50px', // Start loading 50px before entering viewport
                threshold: 0.01,
            }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [src]);

    // Reset states when src changes
    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
    }, [src]);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    const handleError = () => {
        setHasError(true);
        setIsLoaded(true);
    };

    // No image URL - show placeholder
    if (!src || hasError) {
        return (
            <div
                ref={imgRef}
                className={cn(
                    'flex items-center justify-center bg-muted/50',
                    containerClassName
                )}
            >
                {fallbackIcon || <Package className="w-10 h-10 text-muted-foreground/20" />}
            </div>
        );
    }

    return (
        <div
            ref={imgRef}
            className={cn('relative overflow-hidden bg-muted/30', containerClassName)}
        >
            {/* Placeholder blur effect */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-muted/50 animate-pulse" />
            )}

            {/* Actual image - only render when in viewport */}
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={cn(
                        'w-full h-full object-cover transition-opacity duration-300',
                        isLoaded ? 'opacity-100' : 'opacity-0',
                        className
                    )}
                    {...props}
                />
            )}
        </div>
    );
});

export default LazyImage;

/**
 * ImageLightbox Component
 * 
 * A reusable lightbox component for viewing images with zoom and download functionality.
 * Features:
 * - Click to open fullscreen view
 * - Zoom in/out with buttons or mouse wheel
 * - Pan image when zoomed
 * - Download image directly
 * - Keyboard navigation (Escape to close, +/- to zoom)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    X,
    ZoomIn,
    ZoomOut,
    Download,
    RotateCw,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
    src: string;
    alt?: string;
    className?: string;
    thumbnailClassName?: string;
    children?: React.ReactNode; // Custom trigger element
}

export function ImageLightbox({
    src,
    alt = 'Image',
    className,
    thumbnailClassName,
    children
}: ImageLightboxProps) {
    const [open, setOpen] = useState(false);
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isDownloading, setIsDownloading] = useState(false);

    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setScale(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
        }
    }, [open]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    setOpen(false);
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    zoomOut();
                    break;
                case 'r':
                    e.preventDefault();
                    rotate();
                    break;
                case '0':
                    e.preventDefault();
                    resetView();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    const zoomIn = useCallback(() => {
        setScale(prev => Math.min(prev + 0.5, 5));
    }, []);

    const zoomOut = useCallback(() => {
        setScale(prev => {
            const newScale = Math.max(prev - 0.5, 0.5);
            if (newScale <= 1) {
                setPosition({ x: 0, y: 0 });
            }
            return newScale;
        });
    }, []);

    const rotate = useCallback(() => {
        setRotation(prev => (prev + 90) % 360);
    }, []);

    const resetView = useCallback(() => {
        setScale(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    }, []);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    }, [zoomIn, zoomOut]);

    // Pan functionality
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    }, [scale, position]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    }, [isDragging, scale, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Download image
    const handleDownload = useCallback(async () => {
        setIsDownloading(true);
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from URL or use default
            const urlParts = src.split('/');
            const filename = urlParts[urlParts.length - 1].split('?')[0] || 'image.jpg';
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open(src, '_blank');
        } finally {
            setIsDownloading(false);
        }
    }, [src]);

    // Default thumbnail
    const thumbnail = children || (
        <img
            src={src}
            alt={alt}
            className={cn(
                "cursor-pointer hover:opacity-90 transition-opacity",
                thumbnailClassName
            )}
            onClick={() => setOpen(true)}
        />
    );

    return (
        <>
            {/* Thumbnail/Trigger */}
            <div
                className={cn("inline-block", className)}
                onClick={() => setOpen(true)}
            >
                {thumbnail}
            </div>

            {/* Lightbox Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-none overflow-hidden"
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    <DialogTitle className="sr-only">{alt}</DialogTitle>

                    {/* Toolbar */}
                    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
                        <div className="flex items-center gap-1">
                            {/* Zoom controls */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-white hover:bg-white/20"
                                onClick={zoomOut}
                                disabled={scale <= 0.5}
                            >
                                <ZoomOut className="h-5 w-5" />
                            </Button>
                            <span className="text-white text-sm font-medium min-w-[50px] text-center">
                                {Math.round(scale * 100)}%
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-white hover:bg-white/20"
                                onClick={zoomIn}
                                disabled={scale >= 5}
                            >
                                <ZoomIn className="h-5 w-5" />
                            </Button>

                            <div className="w-px h-6 bg-white/30 mx-2" />

                            {/* Rotate */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-white hover:bg-white/20"
                                onClick={rotate}
                                title="Rotate (R)"
                            >
                                <RotateCw className="h-5 w-5" />
                            </Button>

                            {/* Reset */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-white hover:bg-white/20"
                                onClick={resetView}
                                title="Reset (0)"
                            >
                                <Minimize2 className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Download */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20 gap-2"
                                onClick={handleDownload}
                                disabled={isDownloading}
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    {isDownloading ? 'Downloading...' : 'Download'}
                                </span>
                            </Button>

                            {/* Close */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-white hover:bg-white/20"
                                onClick={() => setOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Image Container */}
                    <div
                        ref={containerRef}
                        className={cn(
                            "w-full h-[80vh] flex items-center justify-center overflow-hidden",
                            scale > 1 ? "cursor-grab" : "cursor-zoom-in",
                            isDragging && "cursor-grabbing"
                        )}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img
                            ref={imageRef}
                            src={src}
                            alt={alt}
                            className="max-w-full max-h-full object-contain select-none"
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                            }}
                            draggable={false}
                            onClick={(e) => {
                                if (!isDragging && scale === 1) {
                                    zoomIn();
                                }
                            }}
                        />
                    </div>

                    {/* Hint */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center">
                        Scroll to zoom • Drag to pan • Press R to rotate
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Wrapper component for easy integration
interface ClickableImageProps {
    src: string;
    alt?: string;
    className?: string;
    imgClassName?: string;
}

export function ClickableImage({ src, alt, className, imgClassName }: ClickableImageProps) {
    if (!src) return null;

    return (
        <ImageLightbox
            src={src}
            alt={alt}
            className={className}
            thumbnailClassName={imgClassName}
        />
    );
}

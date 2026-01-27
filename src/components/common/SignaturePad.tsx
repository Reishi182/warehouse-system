import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
    width?: number;
    height?: number;
    backgroundColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    className?: string;
    // Support both boolean (original) and string (SignatureCanvas) callbacks
    onSignatureChange?: ((hasSignature: boolean) => void) | ((signatureData: string | null) => void);
}

export interface SignaturePadRef {
    clear: () => void;
    isEmpty: () => boolean;
    toDataURL: (type?: string) => string;
    toBlob: (callback: (blob: Blob | null) => void, type?: string, quality?: number) => void;
    getSignatureData: () => string | null;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({
    width = 400,
    height = 200,
    backgroundColor = '#ffffff',
    strokeColor = '#000000',
    strokeWidth = 2,
    className = '',
    onSignatureChange,
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set up canvas
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [width, height, backgroundColor, strokeColor, strokeWidth]);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in e) {
            const touch = e.touches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        } else {
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const coords = getCoordinates(e);
        if (!coords) return;

        setIsDrawing(true);
        lastPoint.current = coords;
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const coords = getCoordinates(e);
        if (!coords || !lastPoint.current) return;

        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        lastPoint.current = coords;

        if (!hasSignature) {
            setHasSignature(true);
            // Call with both boolean and string for compatibility
            (onSignatureChange as (v: boolean | string | null) => void)?.(true);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPoint.current = null;
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        setHasSignature(false);
        (onSignatureChange as (v: boolean | string | null) => void)?.(null);
    };

    const isEmpty = () => !hasSignature;

    const toDataURL = (type = 'image/png') => {
        const canvas = canvasRef.current;
        return canvas?.toDataURL(type) || '';
    };

    const toBlob = (callback: (blob: Blob | null) => void, type = 'image/png', quality = 0.95) => {
        const canvas = canvasRef.current;
        canvas?.toBlob(callback, type, quality);
    };

    useImperativeHandle(ref, () => ({
        clear,
        isEmpty,
        toDataURL,
        toBlob,
        getSignatureData: () => hasSignature ? toDataURL() : null,
    }));

    return (
        <div className={`relative ${className}`}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair touch-none w-full"
                style={{ maxWidth: '100%', height: 'auto', aspectRatio: `${width}/${height}` }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            <div className="absolute top-2 right-2 flex gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clear}
                    className="h-8 px-2 bg-white/80 hover:bg-white shadow-sm"
                >
                    <Eraser className="h-4 w-4" />
                </Button>
            </div>
            {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-400 text-sm">Tanda tangan di sini</p>
                </div>
            )}
        </div>
    );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;

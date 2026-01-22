import { useRef, forwardRef, useImperativeHandle } from 'react';
import SignaturePad from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

export interface SignatureCanvasRef {
    clear: () => void;
    isEmpty: () => boolean;
    getSignatureData: () => string | null;
}

interface SignatureCanvasProps {
    onSignatureChange?: (signatureData: string | null) => void;
    width?: number;
    height?: number;
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
    ({ onSignatureChange, width = 300, height = 150 }, ref) => {
        const signaturePadRef = useRef<SignaturePad>(null);

        useImperativeHandle(ref, () => ({
            clear: () => {
                signaturePadRef.current?.clear();
                onSignatureChange?.(null);
            },
            isEmpty: () => signaturePadRef.current?.isEmpty() ?? true,
            getSignatureData: () => {
                if (signaturePadRef.current?.isEmpty()) return null;
                return signaturePadRef.current?.toDataURL('image/png') ?? null;
            },
        }));

        const handleEnd = () => {
            if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
                const data = signaturePadRef.current.toDataURL('image/png');
                onSignatureChange?.(data);
            }
        };

        const handleClear = () => {
            signaturePadRef.current?.clear();
            onSignatureChange?.(null);
        };

        return (
            <div className="space-y-2">
                <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white">
                    <SignaturePad
                        ref={signaturePadRef}
                        canvasProps={{
                            width,
                            height,
                            className: 'cursor-crosshair',
                            style: { width: '100%', height: `${height}px` },
                        }}
                        penColor="black"
                        onEnd={handleEnd}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        Tanda tangan di atas
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClear}
                        className="gap-1"
                    >
                        <Eraser className="w-3 h-3" />
                        Hapus
                    </Button>
                </div>
            </div>
        );
    }
);

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;

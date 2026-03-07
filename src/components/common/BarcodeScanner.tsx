import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, SwitchCamera, Search } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  /** Called when a barcode is scanned or user submits the input */
  onScan: (barcode: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional className for the root element */
  className?: string;
  /** Controlled value (for use as an input field) */
  value?: string;
  /** Called when the input value changes (controlled mode) */
  onChange?: (value: string) => void;
  /** If true, shows a "Cari" submit button. Default: true */
  showSubmitButton?: boolean;
}

// Supported barcode formats
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
];

export default function BarcodeScanner({
  onScan,
  placeholder = 'Masukkan atau scan barcode',
  className,
  value: controlledValue,
  onChange: controlledOnChange,
  showSubmitButton = true,
}: BarcodeScannerProps) {
  // Support both controlled and uncontrolled modes
  const [internalValue, setInternalValue] = useState('');
  const isControlled = controlledValue !== undefined;
  const barcode = isControlled ? controlledValue : internalValue;
  const setBarcode = useCallback((val: string) => {
    if (isControlled && controlledOnChange) {
      controlledOnChange(val);
    } else {
      setInternalValue(val);
    }
  }, [isControlled, controlledOnChange]);

  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = useRef(`barcode-scanner-${Math.random().toString(36).slice(2, 8)}`).current;

  // Debounce refs to prevent multiple detections
  const isProcessingRef = useRef(false);
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Handle physical barcode scanner input (fast typing detection)
  const lastKeyTime = useRef<number>(0);
  const keyBuffer = useRef<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();

      // If typed quickly (within 50ms), it's likely from a barcode scanner
      if (currentTime - lastKeyTime.current < 50) {
        keyBuffer.current += e.key;
      } else {
        keyBuffer.current = e.key;
      }

      lastKeyTime.current = currentTime;

      // If Enter is pressed and we have buffered input, it's a barcode scan
      if (e.key === 'Enter' && keyBuffer.current.length > 5) {
        const scannedBarcode = keyBuffer.current.replace('Enter', '').trim();
        setBarcode(scannedBarcode);
        onScan(scannedBarcode);
        keyBuffer.current = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, setBarcode]);

  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        const state = html5QrcodeRef.current.getState();
        if (state === 2) { // SCANNING state
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
    setShowCamera(false);
  }, []);

  const startScanner = useCallback(async () => {
    setCameraError(null);
    setIsScanning(true);
    isProcessingRef.current = false;

    try {
      const html5Qrcode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      html5QrcodeRef.current = html5Qrcode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.5,
      };

      await html5Qrcode.start(
        { facingMode: useFrontCamera ? 'user' : 'environment' },
        config,
        (decodedText) => {
          const now = Date.now();

          if (isProcessingRef.current) return;
          if (lastScannedRef.current === decodedText && now - lastScannedTimeRef.current < 2000) return;

          isProcessingRef.current = true;
          lastScannedRef.current = decodedText;
          lastScannedTimeRef.current = now;

          const trimmed = decodedText.trim();
          setBarcode(trimmed);
          onScan(trimmed);
          stopScanner();
        },
        () => {
          // Ignore scan failures (not found)
        }
      );
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setCameraError(
        err instanceof Error
          ? err.message
          : 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.'
      );
      setIsScanning(false);
    }
  }, [onScan, useFrontCamera, scannerContainerId, setBarcode, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => { });
      }
    };
  }, []);

  // Start scanner when dialog opens
  useEffect(() => {
    if (showCamera) {
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showCamera, startScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = barcode.trim();
    if (trimmed) {
      onScan(trimmed);
    }
  };

  const toggleCamera = async () => {
    if (html5QrcodeRef.current && isScanning) {
      await stopScanner();
      setUseFrontCamera(!useFrontCamera);
      setTimeout(() => {
        setShowCamera(true);
      }, 100);
    }
  };

  return (
    <>
      <form onSubmit={handleManualSubmit} className={cn("flex gap-2", className)}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-12 rounded-xl h-11"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {barcode && (
              <button
                type="button"
                onClick={() => setBarcode('')}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="Hapus"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            <button
              type="button"
              onClick={() => { setShowCamera(true); setCameraError(null); }}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Scan dengan Kamera"
            >
              <Camera className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        {showSubmitButton && (
          <Button type="submit" disabled={!barcode.trim()} className="rounded-xl h-11 px-5">
            Cari
          </Button>
        )}
      </form>

      {/* Camera Scanner Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && stopScanner()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Camera className="w-5 h-5" />
              Scan Barcode
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            {/* Scanner Container */}
            <div
              id={scannerContainerId}
              className="w-full min-h-[280px] bg-black"
            />

            {/* Scan Guide Overlay */}
            {isScanning && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-36 border-2 border-white/60 rounded-xl relative">
                  <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-3 border-l-3 border-primary rounded-tl-lg" />
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-3 border-r-3 border-primary rounded-tr-lg" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-3 border-l-3 border-primary rounded-bl-lg" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-3 border-r-3 border-primary rounded-br-lg" />
                </div>
              </div>
            )}

            {/* Error Message */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                <div className="text-center text-white">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm mb-3">{cameraError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startScanner}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Coba Lagi
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {!isScanning && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center text-white">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Memulai kamera...</p>
                </div>
              </div>
            )}

            {/* Camera Controls Overlay */}
            {isScanning && (
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 bg-black/40 border-0 text-white hover:bg-black/60 rounded-full backdrop-blur-sm"
                  onClick={toggleCamera}
                  title="Ganti Kamera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="p-4 pt-2 space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Arahkan barcode ke dalam kotak untuk scan otomatis
            </p>
            <Button
              variant="outline"
              onClick={stopScanner}
              className="w-full rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

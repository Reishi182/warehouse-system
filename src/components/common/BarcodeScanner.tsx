import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Keyboard, SwitchCamera, Flashlight } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
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

export default function BarcodeScanner({ onScan, placeholder = 'Masukkan atau scan barcode' }: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'barcode-scanner-container';

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
        const scannedBarcode = keyBuffer.current.replace('Enter', '');
        setBarcode(scannedBarcode);
        onScan(scannedBarcode);
        keyBuffer.current = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);

  const startScanner = useCallback(async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      // Create scanner instance
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
          // Success callback
          setBarcode(decodedText);
          onScan(decodedText);
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
  }, [onScan, useFrontCamera]);

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
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showCamera, startScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onScan(barcode.trim());
    }
  };

  const toggleCamera = async () => {
    if (html5QrcodeRef.current && isScanning) {
      await stopScanner();
      setUseFrontCamera(!useFrontCamera);
      setTimeout(() => {
        startScanner();
      }, 100);
    }
  };

  const openCameraDialog = () => {
    setShowCamera(true);
    setCameraError(null);
  };

  return (
    <>
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder={placeholder}
            className="pr-20 rounded-xl"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => inputRef.current?.focus()}
              title="Input Manual"
            >
              <Keyboard className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={openCameraDialog}
              title="Scan dengan Kamera"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button type="submit" disabled={!barcode.trim()} className="rounded-xl">
          Cari
        </Button>
      </form>

      <Dialog open={showCamera} onOpenChange={(open) => !open && stopScanner()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Scan Barcode
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            {/* Scanner Container */}
            <div
              id={scannerContainerId}
              className="w-full min-h-[300px] bg-black"
            />

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
          </div>

          <div className="p-4 pt-2 space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Arahkan barcode ke dalam kotak untuk scan otomatis
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={toggleCamera}
                className="flex-1 rounded-xl"
                disabled={!isScanning}
              >
                <SwitchCamera className="w-4 h-4 mr-2" />
                Ganti Kamera
              </Button>
              <Button
                variant="destructive"
                onClick={stopScanner}
                className="flex-1 rounded-xl"
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

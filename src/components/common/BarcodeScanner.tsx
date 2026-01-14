import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Keyboard } from 'lucide-react';
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

export default function BarcodeScanner({ onScan, placeholder = 'Masukkan atau scan barcode' }: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Failed to start camera:', err);
      alert('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onScan(barcode.trim());
    }
  };

  // Simulated barcode detection for demo
  const simulateScan = () => {
    const demoBarcode = '8991234567890';
    setBarcode(demoBarcode);
    onScan(demoBarcode);
    stopCamera();
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
            className="pr-20"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => inputRef.current?.focus()}
            >
              <Keyboard className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={startCamera}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button type="submit" disabled={!barcode.trim()}>
          Cari
        </Button>
      </form>

      <Dialog open={showCamera} onOpenChange={stopCamera}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-24 border-2 border-white/50 rounded-lg">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-destructive animate-pulse" />
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Arahkan barcode ke dalam kotak
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={stopCamera} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={simulateScan} className="flex-1">
              Demo Scan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for service worker updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                setShowUpdatePrompt(true);
            });
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleUpdate = () => {
        window.location.reload();
    };

    if (!isOffline && !showUpdatePrompt) return null;

    return (
        <>
            {/* Offline Banner */}
            {isOffline && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-lg">
                    <WifiOff className="w-5 h-5" />
                    <span className="font-medium">Anda sedang offline</span>
                    <span className="text-amber-100 text-sm">• Data yang ditampilkan mungkin tidak terbaru</span>
                </div>
            )}

            {/* Update Available Banner */}
            {showUpdatePrompt && !isOffline && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-blue-500 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
                    <RefreshCw className="w-5 h-5" />
                    <span className="font-medium">Update tersedia!</span>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleUpdate}
                        className="bg-white text-blue-600 hover:bg-blue-50"
                    >
                        Refresh Sekarang
                    </Button>
                </div>
            )}
        </>
    );
}

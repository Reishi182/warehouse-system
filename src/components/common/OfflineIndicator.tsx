import { useState, useEffect, useRef } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Key to track if user has dismissed the update prompt in this session
const UPDATE_DISMISSED_KEY = 'sw-update-dismissed';

export default function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
    const hasCheckedRef = useRef(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Only check for service worker updates in production
        if ('serviceWorker' in navigator && import.meta.env.PROD) {
            // Check if user already dismissed in this session
            const dismissed = sessionStorage.getItem(UPDATE_DISMISSED_KEY);
            if (dismissed) {
                hasCheckedRef.current = true;
                return;
            }

            // Listen for new service worker waiting
            const checkForWaiting = async () => {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration?.waiting) {
                    setShowUpdatePrompt(true);
                }
            };

            // Check immediately
            checkForWaiting();

            // Listen for updates
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // Only show once per page load
                if (!hasCheckedRef.current) {
                    hasCheckedRef.current = true;
                    // Page will reload anyway on controllerchange, so no need to show prompt
                }
            });

            // Listen for new service worker installation
            navigator.serviceWorker.getRegistration().then((registration) => {
                if (registration) {
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New service worker is waiting to activate
                                    setShowUpdatePrompt(true);
                                }
                            });
                        }
                    });
                }
            });
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleUpdate = () => {
        // Skip waiting and reload
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((registration) => {
                if (registration?.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        }
        window.location.reload();
    };

    const handleDismiss = () => {
        sessionStorage.setItem(UPDATE_DISMISSED_KEY, 'true');
        setShowUpdatePrompt(false);
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
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDismiss}
                        className="text-white hover:bg-blue-600 p-1 h-auto"
                        aria-label="Tutup"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </>
    );
}

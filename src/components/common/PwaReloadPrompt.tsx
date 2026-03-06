import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function PwaReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] m-0 p-0 animate-in fade-in slide-in-from-bottom-5">
            <div className="w-80 shadow-xl border border-primary/20 bg-background/95 backdrop-blur rounded-lg p-4 font-sans supports-[backdrop-filter]:bg-background/80">
                <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-primary">
                        {offlineReady ? 'Aplikasi Siap Offline' : 'Pembaruan Tersedia'}
                    </h3>
                    <button
                        onClick={close}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground p-1 rounded-md transition-colors"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Tutup</span>
                    </button>
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                    {offlineReady
                        ? 'Aplikasi telah diunduh dan siap digunakan tanpa koneksi internet.'
                        : 'Versi baru dari aplikasi telah tersedia. Klik tombol Reload untuk memperbarui tampilan.'}
                </div>
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={close} className="text-xs h-8">
                        Tutup
                    </Button>
                    {needRefresh && (
                        <Button size="sm" onClick={() => updateServiceWorker(true)} className="text-xs h-8 font-medium">
                            Reload
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

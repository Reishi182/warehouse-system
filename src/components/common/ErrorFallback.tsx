import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
    error: Error | null;
    onReset?: () => void;
}

export default function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
    return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
            <div className="glass-card rounded-3xl p-8 max-w-md text-center animate-fade-in">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>

                <h2 className="text-xl font-semibold mb-2">Terjadi Kesalahan</h2>

                <p className="text-muted-foreground mb-4">
                    Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
                </p>

                {error && (
                    <details className="mb-4 text-left">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Detail Error
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-32">
                            {error.message}
                        </pre>
                    </details>
                )}

                <div className="flex gap-3 justify-center">
                    {onReset && (
                        <Button onClick={onReset} variant="outline">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Coba Lagi
                        </Button>
                    )}
                    <Button onClick={() => window.location.reload()}>
                        Muat Ulang Halaman
                    </Button>
                </div>
            </div>
        </div>
    );
}

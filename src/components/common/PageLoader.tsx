import LoadingSpinner from './LoadingSpinner';

interface PageLoaderProps {
    message?: string;
}

export default function PageLoader({ message = 'Memuat data...' }: PageLoaderProps) {
    return (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 animate-fade-in">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground">{message}</p>
        </div>
    );
}

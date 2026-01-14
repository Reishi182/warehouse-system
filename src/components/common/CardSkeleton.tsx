import { Skeleton } from '@/components/ui/skeleton';

interface CardSkeletonProps {
    count?: number;
    showImage?: boolean;
}

export default function CardSkeleton({ count = 3, showImage = true }: CardSkeletonProps) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="glass-card rounded-3xl p-4 animate-pulse">
                    <div className="flex items-start gap-3">
                        {showImage && (
                            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                        )}
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-1/4" />
                        </div>
                        <div className="text-right space-y-2">
                            <Skeleton className="h-4 w-12 ml-auto" />
                            <Skeleton className="h-6 w-16 ml-auto" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <Skeleton className="h-14 rounded-lg" />
                        <Skeleton className="h-14 rounded-lg" />
                        <Skeleton className="h-14 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

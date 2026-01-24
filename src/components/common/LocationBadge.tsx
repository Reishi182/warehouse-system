import { cn } from '@/lib/utils';
import { Location } from '@/types';
import { Warehouse, Store, MapPin } from 'lucide-react';

interface LocationBadgeProps {
  location: Location;
  className?: string;
  showIcon?: boolean;
}

const locationConfig: Record<Location, { label: string; icon: React.ElementType; className: string }> = {
  gudang: { label: 'Gudang', icon: Warehouse, className: 'bg-primary/10 text-primary' },
  toko: { label: 'Toko', icon: Store, className: 'bg-accent/10 text-accent' },
};

// Default fallback config for unknown locations
const defaultConfig = { label: 'Unknown', icon: MapPin, className: 'bg-muted/10 text-muted-foreground' };

export default function LocationBadge({ location, className, showIcon = true }: LocationBadgeProps) {
  // Use fallback config if location is undefined or not recognized
  const config = location && locationConfig[location] ? locationConfig[location] : defaultConfig;
  const Icon = config.icon;

  return (
    <span className={cn('status-badge inline-flex items-center gap-1', config.className, className)}>
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}


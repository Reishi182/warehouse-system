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

export default function LocationBadge({ location, className, showIcon = true }: LocationBadgeProps) {
  const config = locationConfig[location];
  const Icon = config.icon;

  return (
    <span className={cn('status-badge inline-flex items-center gap-1', config.className, className)}>
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}

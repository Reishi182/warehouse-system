import { cn } from '@/lib/utils';
import { RequestStatus } from '@/types';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: 'Menunggu', className: 'status-pending' },
  approved: { label: 'Disetujui', className: 'status-approved' },
  rejected: { label: 'Ditolak', className: 'status-rejected' },
  completed: { label: 'Selesai', className: 'status-completed' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn('status-badge', config.className, className)}>
      {config.label}
    </span>
  );
}

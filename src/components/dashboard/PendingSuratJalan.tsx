import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/common/StatusBadge';
import { SuratJalan } from '@/types';

interface PendingSuratJalanProps {
    suratJalans: SuratJalan[];
}

export default function PendingSuratJalan({ suratJalans }: PendingSuratJalanProps) {
    const pendingSJ = suratJalans.filter(s => s.status === 'pending');

    return (
        <div className="glass-card rounded-3xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Surat Jalan Perlu Review</h3>
                <Link to="/approval">
                    <Button variant="ghost" size="sm">Lihat Semua</Button>
                </Link>
            </div>
            <div className="divide-y divide-border">
                {pendingSJ.length === 0 ? (
                    <p className="p-4 text-muted-foreground text-center">
                        Tidak ada surat jalan yang perlu direview
                    </p>
                ) : (
                    pendingSJ.map(sj => (
                        <div key={sj.id} className="p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-medium">{sj.number}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {sj.items.length} item • {sj.created_by || 'User'}
                                    </p>
                                </div>
                                <StatusBadge status={sj.status} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

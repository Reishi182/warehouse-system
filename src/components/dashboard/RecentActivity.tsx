import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StockLog } from '@/types';

interface RecentActivityProps {
    logs: StockLog[];
}

export default function RecentActivity({ logs }: RecentActivityProps) {
    const recentLogs = logs.slice(0, 5);

    return (
        <div className="glass-card rounded-3xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Aktivitas Stok</h3>
                <Link to="/reports">
                    <Button variant="ghost" size="sm">Lihat Semua</Button>
                </Link>
            </div>
            <div className="divide-y divide-border">
                {recentLogs.length === 0 ? (
                    <p className="p-4 text-muted-foreground text-center">
                        Belum ada aktivitas
                    </p>
                ) : (
                    recentLogs.map(log => (
                        <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-medium">{log.product?.name || 'Produk'}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {log.type === 'in' ? '+' : '-'}{log.quantity} unit
                                    </p>
                                </div>
                                <span className={`status-badge ${log.type === 'in' ? 'status-approved' : 'status-rejected'}`}>
                                    {log.type === 'in' ? 'Masuk' : 'Keluar'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

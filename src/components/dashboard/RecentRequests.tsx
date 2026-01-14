import { useState } from 'react';
import { Package, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import StatusBadge from '@/components/common/StatusBadge';
import LocationBadge from '@/components/common/LocationBadge';
import { StockOutRequest, UserRole } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface RecentRequestsProps {
    requests: StockOutRequest[];
    availableRequests: StockOutRequest[];
    role: UserRole | undefined;
    onCreateSuratJalan: (requestIds: string[]) => void;
}

export default function RecentRequests({
    requests,
    availableRequests,
    role,
    onCreateSuratJalan,
}: RecentRequestsProps) {
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

    const recentRequests = requests.slice(0, 5);

    const toggleRequest = (reqId: string) => {
        setSelectedRequests(prev =>
            prev.includes(reqId)
                ? prev.filter(r => r !== reqId)
                : [...prev, reqId]
        );
    };

    const handleCreateSuratJalan = () => {
        if (selectedRequests.length === 0) {
            toast({
                title: 'Pilih permintaan',
                description: 'Pilih minimal satu permintaan untuk dibuatkan surat jalan',
                variant: 'destructive',
            });
            return;
        }

        onCreateSuratJalan(selectedRequests);

        toast({
            title: 'Surat Jalan dibuat',
            description: `Surat jalan untuk ${selectedRequests.length} permintaan berhasil dibuat`,
        });

        setDialogOpen(false);
        setSelectedRequests([]);
    };

    return (
        <div className="glass-card rounded-3xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Permintaan Terbaru</h3>
                <div className="flex items-center gap-2">
                    {(role === 'cashier' || role === 'admin') && availableRequests.length > 0 && (
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Buat Surat Jalan
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Buat Surat Jalan Baru</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Pilih permintaan yang akan dibuatkan surat jalan:
                                    </p>

                                    {availableRequests.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                            <p>Tidak ada permintaan yang disetujui</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {availableRequests.map(request => (
                                                <label
                                                    key={request.id}
                                                    className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                                                >
                                                    <Checkbox
                                                        checked={selectedRequests.includes(request.id)}
                                                        onCheckedChange={() => toggleRequest(request.id)}
                                                    />
                                                    {request.product?.image_url ? (
                                                        <img
                                                            src={request.product.image_url}
                                                            alt={request.product?.name || 'Produk'}
                                                            className="w-10 h-10 rounded-lg object-cover border"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                            <Package className="w-5 h-5 text-muted-foreground" />
                                                        </div>
                                                    )}

                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-medium">{request.product?.name || 'Produk'}</p>
                                                            <span className="text-sm font-semibold">{request.quantity} unit</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <LocationBadge location={request.from_location} />
                                                            <span className="text-muted-foreground">→</span>
                                                            <LocationBadge location={request.to_location} />
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleCreateSuratJalan}
                                        className="w-full"
                                        disabled={selectedRequests.length === 0}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Buat Surat Jalan ({selectedRequests.length} item)
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    <Link to="/requests">
                        <Button variant="ghost" size="sm">Lihat Semua</Button>
                    </Link>
                </div>
            </div>
            <div className="divide-y divide-border">
                {recentRequests.length === 0 ? (
                    <p className="p-4 text-muted-foreground text-center">
                        Belum ada permintaan
                    </p>
                ) : (
                    recentRequests.map(request => (
                        <div key={request.id} className="p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    {request.product?.image_url ? (
                                        <img
                                            src={request.product.image_url}
                                            alt={request.product?.name || 'Produk'}
                                            className="w-10 h-10 rounded-lg object-cover border"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                            <Package className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium">{request.product?.name || 'Produk'}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {request.quantity} unit • {format(new Date(request.requested_at), 'dd MMM yyyy', { locale: id })}
                                        </p>
                                    </div>
                                </div>
                                <StatusBadge status={request.status} />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <LocationBadge location={request.from_location} />
                                <span className="text-muted-foreground">→</span>
                                <LocationBadge location={request.to_location} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

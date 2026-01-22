import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    User,
    MapPin,
    Phone,
    Truck,
    Package,
    CheckCircle2,
    Clock,
    XCircle,
    Loader2
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDirectOrder, useUpdateDirectOrderStatus } from '@/hooks/useDirectOrders';
import { DirectOrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import PageSkeleton from '@/components/common/PageSkeleton';

const statusConfig: Record<DirectOrderStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    confirmed: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
    shipped: { label: 'Dikirim', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck },
    delivered: { label: 'Terkirim', color: 'bg-green-100 text-green-700 border-green-200', icon: Package },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

const statusFlow: DirectOrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

export default function DirectOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: order, isLoading } = useDirectOrder(id);
    const updateStatus = useUpdateDirectOrderStatus();

    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    if (isLoading) {
        return (
            <MainLayout title="Detail Order" subtitle="Loading...">
                <PageSkeleton variant="form" />
            </MainLayout>
        );
    }

    if (!order) {
        return (
            <MainLayout title="Order Tidak Ditemukan" subtitle="">
                <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">Order tidak ditemukan</p>
                    <Button onClick={() => navigate('/direct-orders')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Button>
                </div>
            </MainLayout>
        );
    }

    const currentStatusIndex = statusFlow.indexOf(order.status);
    const canAdvance = order.status !== 'delivered' && order.status !== 'cancelled';
    const nextStatus = canAdvance && currentStatusIndex >= 0 ? statusFlow[currentStatusIndex + 1] : null;

    const handleAdvanceStatus = async () => {
        if (nextStatus) {
            await updateStatus.mutateAsync({ orderId: order.id, status: nextStatus });
        }
    };

    const handleCancel = async () => {
        await updateStatus.mutateAsync({
            orderId: order.id,
            status: 'cancelled',
            cancelReason
        });
        setCancelDialogOpen(false);
        setCancelReason('');
    };

    const StatusIcon = statusConfig[order.status].icon;

    return (
        <MainLayout
            title={order.order_number}
            subtitle="Detail Direct Order"
        >
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => navigate('/direct-orders')}
                className="mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Daftar
            </Button>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Status Order</CardTitle>
                                <Badge className={cn('border text-sm', statusConfig[order.status].color)}>
                                    <StatusIcon className="w-4 h-4 mr-1" />
                                    {statusConfig[order.status].label}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Timeline */}
                            <div className="flex items-center justify-between mb-6">
                                {statusFlow.map((status, idx) => {
                                    const isActive = statusFlow.indexOf(order.status) >= idx;
                                    const isCurrent = order.status === status;
                                    const Icon = statusConfig[status].icon;
                                    return (
                                        <div key={status} className="flex flex-col items-center flex-1">
                                            <div className={cn(
                                                'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                                                isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-muted-foreground/30',
                                                isCurrent && 'ring-4 ring-primary/20'
                                            )}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className={cn(
                                                'text-xs mt-2',
                                                isActive ? 'font-medium' : 'text-muted-foreground'
                                            )}>
                                                {statusConfig[status].label}
                                            </span>
                                            {idx < statusFlow.length - 1 && (
                                                <div className={cn(
                                                    'absolute h-0.5 w-full max-w-[80px] top-5 left-1/2',
                                                    isActive ? 'bg-primary' : 'bg-muted'
                                                )} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Action Buttons */}
                            {canAdvance && (
                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleAdvanceStatus}
                                        disabled={updateStatus.isPending}
                                        className="flex-1"
                                    >
                                        {updateStatus.isPending ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : null}
                                        {nextStatus === 'confirmed' && 'Konfirmasi Order'}
                                        {nextStatus === 'shipped' && 'Tandai Dikirim'}
                                        {nextStatus === 'delivered' && 'Tandai Terkirim'}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => setCancelDialogOpen(true)}
                                        disabled={updateStatus.isPending}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Batalkan
                                    </Button>
                                </div>
                            )}

                            {order.status === 'cancelled' && order.cancelled_reason && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                                    <strong>Alasan Pembatalan:</strong> {order.cancelled_reason}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Item Pesanan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {order.items?.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0">
                                        <div>
                                            <p className="font-medium">{item.product_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.quantity} {item.unit} × Rp {item.price.toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                        <p className="font-semibold">
                                            Rp {item.total.toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <Separator className="my-4" />
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>Rp {(order.total_amount - order.shipping_cost).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Biaya Kirim</span>
                                    <span>Rp {order.shipping_cost.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                                    <span>Total</span>
                                    <span>Rp {order.total_amount.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Supplier Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="w-5 h-5" />
                                Supplier
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-medium">{order.supplier_name}</p>
                        </CardContent>
                    </Card>

                    {/* Customer Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Customer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="font-medium">{order.customer_name}</p>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{order.delivery_address}</span>
                            </div>
                            {order.delivery_phone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="w-4 h-4" />
                                    <span>{order.delivery_phone}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Order Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Info Order</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Dibuat oleh</span>
                                <span>{order.created_by_name || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tanggal</span>
                                <span>{new Date(order.created_at).toLocaleDateString('id-ID')}</span>
                            </div>
                            {order.notes && (
                                <div className="pt-2 border-t">
                                    <span className="text-muted-foreground">Catatan:</span>
                                    <p className="mt-1">{order.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Cancel Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Batalkan Order</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Alasan Pembatalan</Label>
                        <Textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Masukkan alasan pembatalan..."
                            className="mt-2"
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={updateStatus.isPending}
                        >
                            {updateStatus.isPending ? 'Membatalkan...' : 'Batalkan Order'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

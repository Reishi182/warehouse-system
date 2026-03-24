import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ShoppingBag, Package, Truck, CheckCircle, XCircle, MapPin, Phone, User,
    Clock, FileText,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useTokopediaOrder } from '@/hooks/tokopedia/useTokopediaQueries';
import { useStartPacking, useShipOrder, useMarkDelivered, useCancelTokopediaOrder } from '@/hooks/tokopedia/useTokopediaMutations';
import { TokopediaCourier, TokopediaOrderStatus } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusSteps: { key: TokopediaOrderStatus; label: string; icon: typeof Package }[] = [
    { key: 'order_received', label: 'Pesanan Baru', icon: ShoppingBag },
    { key: 'packing', label: 'Dikemas', icon: Package },
    { key: 'shipped', label: 'Dikirim', icon: Truck },
    { key: 'completed', label: 'Selesai', icon: CheckCircle },
];

const statusOrder: TokopediaOrderStatus[] = ['order_received', 'packing', 'shipped', 'delivered', 'completed'];

function getStepState(orderStatus: TokopediaOrderStatus, stepKey: TokopediaOrderStatus) {
    if (orderStatus === 'cancelled') return 'cancelled';
    const orderIdx = statusOrder.indexOf(orderStatus);
    const stepIdx = statusOrder.indexOf(stepKey);
    if (stepIdx < orderIdx) return 'done';
    if (stepIdx === orderIdx) return 'current';
    return 'pending';
}

export default function TokopediaOrderDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const role = useRole();
    const { user, profile } = useAuth();

    const { data: order, isLoading } = useTokopediaOrder(id || '');

    // Ship dialog state
    const [isShipOpen, setIsShipOpen] = useState(false);
    const [courier, setCourier] = useState<TokopediaCourier>('jne');
    const [trackingNumber, setTrackingNumber] = useState('');

    // Cancel dialog state
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const startPacking = useStartPacking();
    const shipOrder = useShipOrder();
    const markDelivered = useMarkDelivered();
    const cancelOrder = useCancelTokopediaOrder();

    if (isLoading || !order) {
        return (
            <MainLayout title="Detail Order" subtitle="Memuat...">
                <PageSkeleton variant="form" />
            </MainLayout>
        );
    }

    const canPack = (role === 'warehouse' || role === 'admin') && order.status === 'order_received';
    const canShip = (role === 'warehouse' || role === 'admin') && order.status === 'packing';
    const canMarkDelivered = (role === 'cashier' || role === 'admin') && order.status === 'shipped';
    const canCancel = (role === 'cashier' || role === 'admin') && ['order_received', 'packing'].includes(order.status);

    const handlePack = async () => {
        await startPacking.mutateAsync({ orderId: order.id, userId: user?.id || '', userName: profile?.name || '' });
    };

    const handleShip = async () => {
        if (!trackingNumber.trim()) return;
        await shipOrder.mutateAsync({
            orderId: order.id, courier, trackingNumber, userId: user?.id || '', userName: profile?.name || '',
        });
        setIsShipOpen(false);
    };

    const handleDelivered = async () => {
        await markDelivered.mutateAsync({ orderId: order.id, userId: user?.id || '', userName: profile?.name || '' });
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) return;
        await cancelOrder.mutateAsync({ orderId: order.id, reason: cancelReason, userId: user?.id || '', userName: profile?.name || '' });
        setIsCancelOpen(false);
    };

    return (
        <MainLayout
            title={order.order_number}
            subtitle={`Order Tokopedia — ${order.buyer_name}`}
            actions={
                <Button variant="outline" className="rounded-xl gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4" /> Kembali
                </Button>
            }
        >
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Status Timeline */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between relative">
                            {/* Connecting line */}
                            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border z-0" />

                            {statusSteps.map((step) => {
                                const state = getStepState(order.status, step.key);
                                const Icon = step.icon;
                                return (
                                    <div key={step.key} className="flex flex-col items-center relative z-10">
                                        <div className={cn(
                                            'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                                            state === 'done' && 'bg-green-500 border-green-500 text-white',
                                            state === 'current' && 'bg-primary border-primary text-primary-foreground animate-pulse',
                                            state === 'pending' && 'bg-background border-border text-muted-foreground',
                                            state === 'cancelled' && 'bg-red-100 border-red-300 text-red-500',
                                        )}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className={cn(
                                            'text-xs mt-2 font-medium text-center',
                                            state === 'current' ? 'text-primary' : 'text-muted-foreground'
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {order.status === 'cancelled' && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-300">
                                <XCircle className="w-4 h-4" />
                                <span className="text-sm">Dibatalkan: {order.cancel_reason}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                {(canPack || canShip || canMarkDelivered || canCancel) && (
                    <div className="flex flex-wrap gap-3">
                        {canPack && (
                            <Button onClick={handlePack} disabled={startPacking.isPending} className="gap-2 rounded-xl bg-amber-600 hover:bg-amber-700">
                                <Package className="w-4 h-4" /> {startPacking.isPending ? 'Memproses...' : 'Mulai Kemas'}
                            </Button>
                        )}
                        {canShip && (
                            <Dialog open={isShipOpen} onOpenChange={setIsShipOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 rounded-xl bg-purple-600 hover:bg-purple-700">
                                        <Truck className="w-4 h-4" /> Kirim Paket
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Input Pengiriman</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>Kurir *</Label>
                                            <Select value={courier} onValueChange={v => setCourier(v as TokopediaCourier)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="jne">JNE</SelectItem>
                                                    <SelectItem value="jnt">J&T Express</SelectItem>
                                                    <SelectItem value="sicepat">SiCepat</SelectItem>
                                                    <SelectItem value="anteraja">AnterAja</SelectItem>
                                                    <SelectItem value="pos">POS Indonesia</SelectItem>
                                                    <SelectItem value="grab">GrabExpress</SelectItem>
                                                    <SelectItem value="gojek">GoSend</SelectItem>
                                                    <SelectItem value="other">Lainnya</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Nomor Resi *</Label>
                                            <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Masukkan nomor resi..." />
                                        </div>
                                        <Button className="w-full" disabled={!trackingNumber.trim() || shipOrder.isPending} onClick={handleShip}>
                                            {shipOrder.isPending ? 'Menyimpan...' : 'Konfirmasi Kirim'}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                        {canMarkDelivered && (
                            <Button onClick={handleDelivered} disabled={markDelivered.isPending} className="gap-2 rounded-xl bg-green-600 hover:bg-green-700">
                                <CheckCircle className="w-4 h-4" /> {markDelivered.isPending ? 'Memproses...' : 'Tandai Diterima'}
                            </Button>
                        )}
                        {canCancel && (
                            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2 rounded-xl text-red-600 hover:text-red-700 border-red-200">
                                        <XCircle className="w-4 h-4" /> Batalkan
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Batalkan Order</DialogTitle></DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>Alasan Pembatalan *</Label>
                                            <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Mengapa dibatalkan?" rows={3} />
                                        </div>
                                        <Button variant="destructive" className="w-full" disabled={!cancelReason.trim() || cancelOrder.isPending} onClick={handleCancel}>
                                            {cancelOrder.isPending ? 'Membatalkan...' : 'Batalkan Order'}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                )}

                {/* Order Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Buyer Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Info Pembeli</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-start gap-2">
                                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <span className="font-medium">{order.buyer_name}</span>
                            </div>
                            {order.buyer_phone && (
                                <div className="flex items-start gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <span>{order.buyer_phone}</span>
                                </div>
                            )}
                            {order.buyer_address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    <span className="text-muted-foreground">{order.buyer_address}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Order Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Info Order</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Stok Dari</span>
                                <Badge variant="outline">{order.stock_location === 'gudang' ? '📦 Gudang' : '🏪 Toko'}</Badge>
                            </div>
                            {order.tokopedia_order_id && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ID Tokopedia</span>
                                    <span className="font-mono text-xs">{order.tokopedia_order_id}</span>
                                </div>
                            )}
                            {order.tracking_number && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Resi</span>
                                    <span className="font-mono text-xs">{order.courier?.toUpperCase()} — {order.tracking_number}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Dibuat</span>
                                <span>{format(new Date(order.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Items */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> Item Pesanan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="text-left p-3">Produk</th>
                                        <th className="text-center p-3">Qty</th>
                                        <th className="text-right p-3">Harga</th>
                                        <th className="text-right p-3">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(order.items || []).map(item => (
                                        <tr key={item.id} className="border-t">
                                            <td className="p-3">
                                                {item.product_name}
                                                {item.barcode && <span className="text-xs text-muted-foreground block">{item.barcode}</span>}
                                            </td>
                                            <td className="text-center p-3">{item.quantity}</td>
                                            <td className="text-right p-3">Rp {item.unit_price.toLocaleString('id-ID')}</td>
                                            <td className="text-right p-3 font-medium">Rp {item.total_price.toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                    {order.shipping_cost > 0 && (
                                        <tr className="border-t">
                                            <td colSpan={3} className="p-3 text-right text-muted-foreground">Ongkir:</td>
                                            <td className="text-right p-3">Rp {order.shipping_cost.toLocaleString('id-ID')}</td>
                                        </tr>
                                    )}
                                    <tr className="border-t bg-muted/50">
                                        <td colSpan={3} className="p-3 text-right font-semibold">Total:</td>
                                        <td className="text-right p-3 font-bold text-lg">
                                            Rp {(order.total_amount + order.shipping_cost).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Timeline Logs */}
                {(order.logs || []).length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Riwayat Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {(order.logs || []).map((log, idx) => (
                                    <div key={log.id} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className={cn(
                                                'w-3 h-3 rounded-full',
                                                idx === (order.logs?.length || 0) - 1 ? 'bg-primary' : 'bg-muted-foreground/30'
                                            )} />
                                            {idx < (order.logs?.length || 0) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                                        </div>
                                        <div className="pb-4">
                                            <p className="text-sm font-medium">{log.note}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {log.created_by_name} · {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, ShoppingBag, Eye, Clock, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTokopediaWarehouseOrders } from '@/hooks/tokopedia/useTokopediaQueries';
import { useStartPacking, useShipOrder } from '@/hooks/tokopedia/useTokopediaMutations';
import { TokopediaCourier, TokopediaOrder } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

function OrderCard({ order, onPack, onShip, isPacking }: {
    order: TokopediaOrder;
    onPack: () => void;
    onShip: (courier: TokopediaCourier, resi: string) => void;
    isPacking: boolean;
}) {
    const navigate = useNavigate();
    const [isShipOpen, setIsShipOpen] = useState(false);
    const [courier, setCourier] = useState<TokopediaCourier>('jne');
    const [trackingNumber, setTrackingNumber] = useState('');

    const handleShip = () => {
        if (!trackingNumber.trim()) return;
        onShip(courier, trackingNumber);
        setIsShipOpen(false);
        setTrackingNumber('');
    };

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <span className="font-bold text-primary text-sm">{order.order_number}</span>
                        {order.tokopedia_order_id && (
                            <span className="block text-xs text-muted-foreground">{order.tokopedia_order_id}</span>
                        )}
                    </div>
                    <Badge variant={order.status === 'order_received' ? 'default' : 'secondary'} className="text-xs">
                        {order.status === 'order_received' ? '🆕 Baru' : '📦 Dikemas'}
                    </Badge>
                </div>

                {/* Buyer */}
                <div className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{order.buyer_name}</span>
                </div>

                {order.buyer_address && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{order.buyer_address}</span>
                    </div>
                )}

                {/* Items summary */}
                <div className="text-xs text-muted-foreground">
                    {order.items?.length || 0} item · Rp {order.total_amount.toLocaleString('id-ID')}
                </div>

                {/* Items list */}
                <div className="bg-muted/50 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                    {(order.items || []).map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                            <span className="truncate flex-1">{item.product_name}</span>
                            <span className="ml-2 font-medium text-muted-foreground">{item.quantity}×</span>
                        </div>
                    ))}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(order.created_at), 'dd MMM HH:mm', { locale: localeId })}
                    <span className="mx-1">·</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {order.stock_location === 'gudang' ? '📦 Gudang' : '🏪 Toko'}
                    </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                    {order.status === 'order_received' && (
                        <Button size="sm" className="flex-1 gap-1 rounded-lg bg-amber-600 hover:bg-amber-700" onClick={onPack} disabled={isPacking}>
                            <Package className="w-3.5 h-3.5" /> Mulai Kemas
                        </Button>
                    )}
                    {order.status === 'packing' && (
                        <Dialog open={isShipOpen} onOpenChange={setIsShipOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="flex-1 gap-1 rounded-lg bg-purple-600 hover:bg-purple-700">
                                    <Truck className="w-3.5 h-3.5" /> Kirim
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Kirim Paket — {order.order_number}</DialogTitle></DialogHeader>
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
                                    <Button className="w-full" disabled={!trackingNumber.trim()} onClick={handleShip}>
                                        Konfirmasi Kirim
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    <Button size="sm" variant="outline" className="gap-1 rounded-lg" onClick={() => navigate(`/tokopedia/${order.id}`)}>
                        <Eye className="w-3.5 h-3.5" /> Detail
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TokopediaShipping() {
    const { user, profile } = useAuth();
    const { data: orders = [], isLoading } = useTokopediaWarehouseOrders();
    const startPacking = useStartPacking();
    const shipOrder = useShipOrder();

    const newOrders = orders.filter(o => o.status === 'order_received');
    const packingOrders = orders.filter(o => o.status === 'packing');

    const handlePack = async (orderId: string) => {
        await startPacking.mutateAsync({ orderId, userId: user?.id || '', userName: profile?.name || '' });
    };

    const handleShip = async (orderId: string, courier: TokopediaCourier, resi: string) => {
        await shipOrder.mutateAsync({ orderId, courier, trackingNumber: resi, userId: user?.id || '', userName: profile?.name || '' });
    };

    if (isLoading) {
        return (
            <MainLayout title="Pengiriman Tokopedia" subtitle="Proses pengemasan & pengiriman">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Pengiriman Tokopedia" subtitle="Kemas dan kirim pesanan Tokopedia">
            <div className="space-y-6">
                {/* Summary */}
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <ShoppingBag className="w-5 h-5 text-blue-600" />
                        <div>
                            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{newOrders.length}</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 block">Perlu Dikemas</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <Package className="w-5 h-5 text-amber-600" />
                        <div>
                            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{packingOrders.length}</span>
                            <span className="text-xs text-amber-600 dark:text-amber-400 block">Perlu Dikirim</span>
                        </div>
                    </div>
                </div>

                {orders.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">Tidak ada pesanan yang perlu diproses</p>
                        <p className="text-sm text-muted-foreground/60">Pesanan baru dari kasir akan muncul di sini</p>
                    </div>
                ) : (
                    <Tabs defaultValue="new">
                        <TabsList>
                            <TabsTrigger value="new" className="gap-1.5">
                                <ShoppingBag className="w-4 h-4" /> Perlu Dikemas ({newOrders.length})
                            </TabsTrigger>
                            <TabsTrigger value="packing" className="gap-1.5">
                                <Package className="w-4 h-4" /> Perlu Dikirim ({packingOrders.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="new" className="mt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {newOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        onPack={() => handlePack(order.id)}
                                        onShip={(c, r) => handleShip(order.id, c, r)}
                                        isPacking={startPacking.isPending}
                                    />
                                ))}
                                {newOrders.length === 0 && (
                                    <p className="text-sm text-muted-foreground col-span-full text-center py-8">Tidak ada pesanan baru</p>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="packing" className="mt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {packingOrders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        onPack={() => handlePack(order.id)}
                                        onShip={(c, r) => handleShip(order.id, c, r)}
                                        isPacking={false}
                                    />
                                ))}
                                {packingOrders.length === 0 && (
                                    <p className="text-sm text-muted-foreground col-span-full text-center py-8">Tidak ada pesanan yang dikemas</p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </MainLayout>
    );
}

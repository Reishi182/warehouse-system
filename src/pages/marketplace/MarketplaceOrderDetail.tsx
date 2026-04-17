import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, ExternalLink, Clock, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMarketplaceOrder } from '@/hooks/useMarketplaceOrders';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    pending_arrival: { label: 'Menunggu Barang', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    completed: { label: 'Selesai', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
    received_with_issue: { label: 'Ada Masalah', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
    return_pending: { label: 'Return Pending', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: RotateCcw },
    return_complete: { label: 'Return Selesai', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
    cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertTriangle },
};

const marketplaceColors: Record<string, string> = {
    tokopedia: 'bg-green-100 text-green-700',
    shopee: 'bg-orange-100 text-orange-700',
    lazada: 'bg-blue-100 text-blue-700',
    bukalapak: 'bg-pink-100 text-pink-700',
    other: 'bg-gray-100 text-gray-700',
};

export default function MarketplaceOrderDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: order, isLoading } = useMarketplaceOrder(id || '');

    if (isLoading) {
        return (
            <MainLayout title="Detail Pesanan" subtitle="Memuat data...">
                <PageSkeleton variant="card" />
            </MainLayout>
        );
    }

    if (!order) {
        return (
            <MainLayout title="Detail Pesanan" subtitle="Tidak ditemukan">
                <Card className="text-center py-12">
                    <CardContent>
                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">Pesanan Tidak Ditemukan</h3>
                        <Button onClick={() => navigate('/marketplace')}>Kembali</Button>
                    </CardContent>
                </Card>
            </MainLayout>
        );
    }

    const StatusIcon = statusConfig[order.status]?.icon || Clock;

    return (
        <MainLayout
            title={`Pesanan ${order.order_number}`}
            subtitle={`Detail pesanan dari ${order.marketplace.toUpperCase()}`}
            actions={
                <Button variant="outline" onClick={() => navigate('/marketplace')} className="rounded-xl">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali
                </Button>
            }
        >
            <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <Badge className={`border ${statusConfig[order.status]?.color}`}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {statusConfig[order.status]?.label}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Marketplace</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${marketplaceColors[order.marketplace]}`}>
                                    {order.marketplace.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Tujuan</span>
                                <span className="font-medium">
                                    {order.destination === 'gudang' ? '📦 Gudang' : '🏪 Toko'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">No. Order</span>
                                <span className="font-mono font-semibold">{order.order_number}</span>
                            </div>
                            {order.marketplace_order_id && (
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">ID Marketplace</span>
                                    <span className="font-mono text-sm">{order.marketplace_order_id}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Tanggal</span>
                                <span>{format(new Date(order.created_at), 'dd MMMM yyyy, HH:mm', { locale: localeId })}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Total</span>
                                <span className="font-bold text-lg">Rp {order.total_amount.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Dibuat Oleh</span>
                                <span>{order.created_by_name || '-'}</span>
                            </div>
                            {order.received_by_name && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Diterima Oleh</span>
                                    <span>{order.received_by_name}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Invoice */}
                {order.invoice_url && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Bukti/Invoice</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <a
                                href={order.invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:underline"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Lihat Invoice
                            </a>
                        </CardContent>
                    </Card>
                )}

                {/* Notes */}
                {order.notes && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Catatan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{order.notes}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Items */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Daftar Item ({order.items?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="text-left p-3">Produk</th>
                                        <th className="text-center p-3">Dipesan</th>
                                        <th className="text-center p-3">Diterima</th>
                                        <th className="text-center p-3">Rusak</th>
                                        <th className="text-right p-3">Harga</th>
                                        <th className="text-right p-3">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items?.map((item) => (
                                        <tr key={item.id} className="border-t">
                                            <td className="p-3">
                                                <span className="font-medium">{item.product_name}</span>
                                                {item.barcode && (
                                                    <span className="block text-xs text-muted-foreground font-mono">
                                                        {item.barcode}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-center p-3">{item.quantity_ordered} {item.unit}</td>
                                            <td className="text-center p-3">
                                                {item.quantity_received > 0 ? (
                                                    <span className="text-green-600">{item.quantity_received}</span>
                                                ) : '-'}
                                            </td>
                                            <td className="text-center p-3">
                                                {item.quantity_damaged > 0 ? (
                                                    <span className="text-red-600">{item.quantity_damaged}</span>
                                                ) : '-'}
                                            </td>
                                            <td className="text-right p-3">Rp {item.unit_price.toLocaleString('id-ID')}</td>
                                            <td className="text-right p-3 font-medium">
                                                Rp {item.total_price.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="border-t bg-muted/50">
                                        <td colSpan={5} className="p-3 text-right font-medium">Total:</td>
                                        <td className="text-right p-3 font-bold">
                                            Rp {order.total_amount.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Returns */}
                {order.returns && order.returns.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <RotateCcw className="w-4 h-4" />
                                Riwayat Return ({order.returns.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {order.returns.map((ret) => (
                                    <div key={ret.id} className="p-3 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">Return #{ret.id.slice(0, 8)}</span>
                                            <Badge>
                                                {ret.status === 'pending' && 'Pending'}
                                                {ret.status === 'picked_up' && 'Sudah Pickup'}
                                                {ret.status === 'completed' && 'Selesai'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{ret.reason}</p>
                                        <div className="mt-2 flex gap-2">
                                            {ret.pickup_proof_url && (
                                                <a
                                                    href={ret.pickup_proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    Bukti Pickup
                                                </a>
                                            )}
                                            {ret.return_proof_url && (
                                                <a
                                                    href={ret.return_proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    Bukti Selesai
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Signature */}
                {order.signature_url && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Tanda Tangan Penerima</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <img
                                src={order.signature_url}
                                alt="Tanda Tangan"
                                className="max-w-xs border rounded-lg"
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}


import { useState } from 'react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Send, ShoppingCart, Search, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function StockRequestsNew() {
    const { user, profile } = useAuth();
    const { products } = useData();
    const { requests, createRequest, resubmitRequest } = useStockRequests();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [reason, setReason] = useState('');
    const [requestItems, setRequestItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // My Requests
    const myRequests = requests.filter(r => r.cashier_id === user?.id);

    const handleAddItem = (product: any) => {
        const existing = requestItems.find(i => i.productId === product.id);
        if (existing) return;

        setRequestItems([...requestItems, {
            productId: product.id,
            name: product.name,
            quantity: 1,
            unit: 'pcs', // Default unit
            note: ''
        }]);
        setIsDialogOpen(false);
    };

    const handleRemoveItem = (productId: string) => {
        setRequestItems(requestItems.filter(i => i.productId !== productId));
    };

    const handeUpdateItem = (productId: string, field: string, value: any) => {
        setRequestItems(requestItems.map(i => {
            if (i.productId === productId) {
                return { ...i, [field]: value };
            }
            return i;
        }));
    };

    const handleSubmit = async () => {
        if (!reason || requestItems.length === 0) return;

        await createRequest.mutateAsync({
            cashierId: user?.id || '',
            cashierName: profile?.name || 'Kasir',
            reason,
            items: requestItems
        });

        // Reset Form
        setReason('');
        setRequestItems([]);
    };

    // Filter products: only show products with warehouse stock > 0
    const filteredProducts = products.filter(p =>
        p.stock.gudang > 0 && (
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcode.includes(searchTerm)
        )
    );

    return (
        <MainLayout
            title="Permintaan Stok"
            subtitle="Ajukan permintaan stok baru ke Main Office"
        >
            <div className="space-y-6">

                <StatsGrid columns={3}>
                    <StatsCard
                        title="Total Permintaan"
                        value={myRequests.length}
                        icon={<ShoppingCart className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Pending"
                        value={myRequests.filter(r => r.status.includes('pending')).length}
                        icon={<Clock className="w-5 h-5" />}
                        subtitle={myRequests.filter(r => r.status.includes('pending')).length > 0 ? "menunggu proses" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Selesai"
                        value={myRequests.filter(r => r.status === 'completed').length}
                        icon={<CheckCircle className="w-5 h-5" />}
                    />
                </StatsGrid>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Form Section */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Buat Permintaan Baru</CardTitle>
                                <CardDescription>Isi detail permintaan stok di bawah ini</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Alasan Permintaan</Label>
                                    <Textarea
                                        placeholder="Contoh: Stok menipis menjelang lebaran"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Daftar Barang</Label>
                                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline">
                                                    <Plus className="w-4 h-4 mr-2" /> Tambah Barang
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                                                <DialogHeader>
                                                    <DialogTitle>Pilih Barang</DialogTitle>
                                                </DialogHeader>
                                                <div className="p-2">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="Cari nama atau barcode..."
                                                            value={searchTerm}
                                                            onChange={e => setSearchTerm(e.target.value)}
                                                            className="pl-8"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto min-h-[300px]">
                                                    {filteredProducts.map(product => (
                                                        <div key={product.id} className="flex justify-between items-center p-3 border-b hover:bg-muted/50">
                                                            <div>
                                                                <p className="font-medium">{product.name}</p>
                                                                <p className="text-xs text-muted-foreground">{product.barcode} | Stok: {product.stock.gudang}</p>
                                                            </div>
                                                            <Button size="sm" onClick={() => handleAddItem(product)}>Pilih</Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    {requestItems.length === 0 ? (
                                        <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground">
                                            Belum ada barang dipilih
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {requestItems.map((item, idx) => (
                                                <div key={item.productId} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-medium text-sm">{idx + 1}. {item.name}</span>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveItem(item.productId)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <Label className="text-xs">Jumlah</Label>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                value={item.quantity}
                                                                onChange={e => handeUpdateItem(item.productId, 'quantity', parseInt(e.target.value) || 0)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Satuan</Label>
                                                            <Input
                                                                value={item.unit}
                                                                onChange={e => handeUpdateItem(item.productId, 'unit', e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div className="col-span-3">
                                                            <Label className="text-xs">Catatan (opsional)</Label>
                                                            <Input
                                                                placeholder="Isi jika perlu..."
                                                                value={item.note}
                                                                onChange={e => handeUpdateItem(item.productId, 'note', e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Button className="w-full" size="lg" disabled={!reason || requestItems.length === 0} onClick={handleSubmit}>
                                    <Send className="w-4 h-4 mr-2" /> Kirim Permintaan
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* History Section */}
                    <div className="space-y-6">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" /> Permintaan Saya
                        </h3>
                        <div className="space-y-4">
                            {myRequests.map(req => (
                                <Card key={req.id} className="overflow-hidden">
                                    <div className={`h-2 w-full ${req.status === 'completed' ? 'bg-green-500' :
                                        req.status === 'rejected' ? 'bg-red-500' :
                                            'bg-yellow-500'
                                        }`} />
                                    <CardHeader className="pb-3 pt-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">{format(new Date(req.created_at), 'dd MMM yyyy')}</CardTitle>
                                                {req.request_number && <CardDescription className="font-mono text-xs mt-1">{req.request_number}</CardDescription>}
                                            </div>
                                            <Badge variant={req.status === 'rejected' ? 'destructive' : req.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                                                {req.status === 'pending_main_office' ? 'Pending Approval' : req.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-3 pb-4">
                                        <div className="bg-muted p-2 rounded">
                                            <p className="font-medium text-xs text-muted-foreground mb-1">Alasan:</p>
                                            <p>{req.reason}</p>
                                        </div>

                                        {req.rejected_reason && (
                                            <div className="bg-red-50 p-2 rounded border border-red-100 dark:bg-red-900/20">
                                                <p className="font-medium text-xs text-red-600 mb-1">Ditolak karena:</p>
                                                <p className="text-red-700 dark:text-red-300">{req.rejected_reason}</p>
                                                <Button size="sm" variant="outline" className="mt-2 w-full h-8" onClick={() => resubmitRequest.mutate(req.id)}>
                                                    Ajukan Ulang
                                                </Button>
                                            </div>
                                        )}

                                        <div>
                                            <p className="font-medium text-xs text-muted-foreground mb-1">Item: {req.items?.length} barang</p>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {req.items?.map((i: any) => i.product?.name).join(', ')}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {myRequests.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                                    Belum ada riwayat permintaan.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

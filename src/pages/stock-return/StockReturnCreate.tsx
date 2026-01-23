import { useState, useMemo } from 'react';
import { Plus, Package, Trash2, Send, ArrowUpFromLine } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockReturns } from '@/hooks/useStockReturns';
import { useToast } from '@/hooks/use-toast';
import { Product, StockReturn } from '@/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface ReturnItem {
    id: string;
    productId: string;
    product?: Product;
    quantity: number;
    unit: string;
    note?: string;
}

export default function StockReturnCreate() {
    const { products, loading } = useData();
    const { user, profile } = useAuth();
    const role = useRole();
    const { toast } = useToast();
    const { returns, isLoading, createReturn } = useStockReturns();

    const [items, setItems] = useState<ReturnItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [reason, setReason] = useState<string>('');

    // Filter products with stock in toko
    const availableProducts = useMemo(() => {
        return products.filter(p => p.stock.toko > 0);
    }, [products]);

    // My returns (for history display)
    const myReturns = useMemo(() => {
        if (!user) return [];
        return returns.filter(r => r.cashier_id === user.id);
    }, [returns, user]);

    const handleAddItem = () => {
        if (!selectedProduct) {
            toast({ title: 'Error', description: 'Pilih produk terlebih dahulu', variant: 'destructive' });
            return;
        }

        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        // Check if already added
        const existing = items.find(i => i.productId === selectedProduct);
        if (existing) {
            toast({ title: 'Error', description: 'Produk sudah ada dalam daftar', variant: 'destructive' });
            return;
        }

        // Check stock availability
        if (quantity > product.stock.toko) {
            toast({ title: 'Error', description: `Stok toko tidak mencukupi (tersedia: ${product.stock.toko})`, variant: 'destructive' });
            return;
        }

        setItems([
            ...items,
            {
                id: crypto.randomUUID(),
                productId: selectedProduct,
                product,
                quantity,
                unit: 'pcs'
            }
        ]);

        setSelectedProduct('');
        setQuantity(1);
    };

    const handleRemoveItem = (itemId: string) => {
        setItems(items.filter(i => i.id !== itemId));
    };

    const handleUpdateQuantity = (itemId: string, qty: number) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                const maxStock = item.product?.stock.toko || 0;
                return { ...item, quantity: Math.min(Math.max(1, qty), maxStock) };
            }
            return item;
        }));
    };

    const handleSubmit = async () => {
        if (!user || !profile) return;

        if (items.length === 0) {
            toast({ title: 'Error', description: 'Tambahkan minimal 1 produk', variant: 'destructive' });
            return;
        }

        if (!reason.trim()) {
            toast({ title: 'Error', description: 'Masukkan alasan retur', variant: 'destructive' });
            return;
        }

        createReturn.mutate({
            cashierId: user.id,
            cashierName: profile.name,
            reason: reason.trim(),
            items: items.map(i => ({
                productId: i.productId,
                quantity: i.quantity,
                unit: i.unit,
                note: i.note
            }))
        }, {
            onSuccess: () => {
                setItems([]);
                setReason('');
            }
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_main_office':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Menunggu Approval</Badge>;
            case 'approved':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Disetujui</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Ditolak</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Access control - only cashier and admin
    if (role !== 'cashier' && role !== 'admin') {
        return (
            <MainLayout title="Akses Ditolak" subtitle="Hanya kasir yang dapat mengakses halaman ini">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Retur ke Gudang"
            subtitle="Kirim barang dari toko kembali ke gudang"
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpFromLine className="h-5 w-5" />
                            Pengajuan Retur Baru
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Product Selection */}
                        <div className="space-y-2">
                            <Label>Pilih Produk</Label>
                            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih produk dari toko..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableProducts.map(product => (
                                        <SelectItem key={product.id} value={product.id}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{product.name}</span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    (Stok Toko: {product.stock.toko})
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Quantity */}
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                                <Label>Jumlah</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button onClick={handleAddItem} disabled={!selectedProduct}>
                                    <Plus className="h-4 w-4 mr-1" /> Tambah
                                </Button>
                            </div>
                        </div>

                        {/* Items Table */}
                        {items.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Produk</TableHead>
                                            <TableHead className="w-24 text-center">Stok Toko</TableHead>
                                            <TableHead className="w-28 text-center">Jumlah</TableHead>
                                            <TableHead className="w-16"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{item.product?.name}</p>
                                                        <p className="text-xs text-muted-foreground">{item.product?.barcode}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary">{item.product?.stock.toko}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={item.product?.stock.toko}
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                                                        className="w-20 text-center"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label>Alasan Retur</Label>
                            <Textarea
                                placeholder="Contoh: Stok toko terlalu banyak, produk tidak laku..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Submit Button */}
                        <Button
                            onClick={handleSubmit}
                            disabled={items.length === 0 || !reason.trim() || createReturn.isPending}
                            className="w-full"
                        >
                            <Send className="h-4 w-4 mr-2" />
                            {createReturn.isPending ? 'Mengirim...' : 'Kirim Pengajuan Retur'}
                        </Button>
                    </CardContent>
                </Card>

                {/* History Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Riwayat Pengajuan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading...</div>
                        ) : myReturns.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Belum ada pengajuan retur
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myReturns.slice(0, 10).map(ret => (
                                    <div key={ret.id} className="border rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">
                                                {ret.return_number || 'Draft'}
                                            </span>
                                            {getStatusBadge(ret.status)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{ret.reason}</p>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{ret.items?.length || 0} item</span>
                                            <span>{format(new Date(ret.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</span>
                                        </div>
                                        {ret.status === 'rejected' && ret.rejected_reason && (
                                            <div className="bg-red-50 text-red-700 text-xs p-2 rounded">
                                                Alasan ditolak: {ret.rejected_reason}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}

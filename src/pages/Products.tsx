import { useState } from 'react';
import { Package, MoreHorizontal, Pencil, Trash2, Plus, Minus, AlertTriangle, Warehouse, Store, ArrowDownToLine } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import { AddProductDialog, EditProductDialog } from '@/components/products';
import { useData } from '@/contexts/DataContext';
import { useRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Product, Location } from '@/types';
import { BeautifulTable } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Products() {
    const { products, addProduct, updateProduct, deleteProduct, getProductByBarcode, addStock, loading } = useData();
    const role = useRole();
    const { toast } = useToast();

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editProductId, setEditProductId] = useState<string | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    // Quick stock adjustment state
    const [stockAdjustDialog, setStockAdjustDialog] = useState(false);
    const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
    const [stockAdjustments, setStockAdjustments] = useState({ gudang: 0, toko: 0, lainnya: 0 });

    // Stock In modal state
    const [stockInDialog, setStockInDialog] = useState(false);
    const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
    const [stockInQuantity, setStockInQuantity] = useState(1);
    const [stockInLocation, setStockInLocation] = useState<Location>('gudang');
    const [stockInConfirmed, setStockInConfirmed] = useState(false);

    // Role permissions
    // Kasir & Gudang: can add product, edit name/barcode/photo only
    // Auditor: can adjust stock and delete
    // Admin: full access
    const canAddProduct = role === 'admin' || role === 'warehouse' || role === 'cashier';
    const canEditProduct = role === 'admin' || role === 'warehouse' || role === 'cashier' || role === 'auditor';
    const canDeleteProduct = role === 'admin' || role === 'auditor'; // Only auditor and admin can delete
    const canAdjustStock = role === 'admin' || role === 'auditor'; // Only auditor and admin can adjust stock
    const canEditStockInForm = role === 'admin' || role === 'auditor'; // Only auditor and admin can edit stock in form

    if (loading) {
        return (
            <MainLayout title="Produk" subtitle="Kelola daftar produk dan stok">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    const handleBarcodeScanned = (barcode: string) => {
        const product = getProductByBarcode(barcode);
        if (product) {
            // If Stock In modal is open, set the product there
            if (stockInDialog) {
                setStockInProduct(product);
                setStockInConfirmed(false);
                toast({
                    title: 'Produk ditemukan',
                    description: product.name,
                });
            } else {
                toast({
                    title: 'Produk ditemukan',
                    description: product.name,
                });
            }
        } else {
            setStockInProduct(null);
            toast({
                title: 'Produk tidak ditemukan',
                description: 'Barcode: ' + barcode,
                variant: 'destructive',
            });
        }
    };

    // Stock In handlers
    const handleStockInBarcodeScanned = (barcode: string) => {
        const product = getProductByBarcode(barcode);
        if (product) {
            setStockInProduct(product);
            setStockInConfirmed(false);
            toast({
                title: 'Produk ditemukan',
                description: product.name,
            });
        } else {
            setStockInProduct(null);
            toast({
                title: 'Produk tidak ditemukan',
                description: 'Barcode: ' + barcode,
                variant: 'destructive',
            });
        }
    };

    const handleAddStock = () => {
        if (!stockInProduct || stockInQuantity <= 0) {
            toast({
                title: 'Data tidak valid',
                description: 'Pilih produk dan masukkan jumlah yang valid',
                variant: 'destructive',
            });
            return;
        }

        addStock(stockInProduct.id, stockInQuantity, stockInLocation);

        toast({
            title: 'Stok berhasil ditambahkan',
            description: `${stockInQuantity} ${stockInProduct.name} ditambahkan ke ${stockInLocation}`,
        });

        // Reset form
        setStockInProduct(null);
        setStockInQuantity(1);
        setStockInConfirmed(false);
        setStockInDialog(false);
    };

    const handleAddProduct = async (product: {
        name: string;
        barcode: string;
        price: number;
        stock: { gudang: number; toko: number; lainnya: number };
        image_url?: string;
    }): Promise<boolean> => {
        const success = await addProduct(product);
        if (success) {
            setAddDialogOpen(false);
        }
        return success;
    };

    const handleDeleteProduct = async (id: string) => {
        const product = products.find(p => p.id === id);
        const ok = await deleteProduct(id);
        if (ok) {
            toast({
                title: 'Produk dihapus',
                description: `${product?.name} berhasil dihapus`,
            });
        }
    };

    const handleEditProduct = (id: string) => {
        setEditProductId(id);
        setEditDialogOpen(true);
    };

    const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
        await updateProduct(id, updates);
    };

    // Quick stock adjustment functions
    const openStockAdjustDialog = (product: Product) => {
        setStockAdjustProduct(product);
        setStockAdjustments({ gudang: 0, toko: 0, lainnya: 0 });
        setStockAdjustDialog(true);
    };

    const handleQuickStockAdjust = async () => {
        if (!stockAdjustProduct) return;

        const newStock = {
            gudang: Math.max(0, stockAdjustProduct.stock.gudang + stockAdjustments.gudang),
            toko: Math.max(0, stockAdjustProduct.stock.toko + stockAdjustments.toko),
            lainnya: Math.max(0, stockAdjustProduct.stock.lainnya + stockAdjustments.lainnya),
        };

        await updateProduct(stockAdjustProduct.id, { stock: newStock });
        toast({
            title: 'Stok diperbarui',
            description: `Stok ${stockAdjustProduct.name} berhasil diperbarui`,
        });
        setStockAdjustDialog(false);
    };

    const editProduct = editProductId ? products.find(p => p.id === editProductId) || null : null;

    // Stats for hero section
    const stats = {
        total: products.length,
        lowStock: products.filter(p => p.stock.gudang < 10 || p.stock.toko < 5).length,
        totalGudang: products.reduce((acc, p) => acc + p.stock.gudang, 0),
        totalToko: products.reduce((acc, p) => acc + p.stock.toko, 0),
    };

    const columns = [
        {
            header: 'Produk',
            accessorKey: 'name' as keyof Product,
            className: 'min-w-[200px]',
            cell: (item: Product) => (
                <div className="flex items-center gap-3">
                    {item.image_url ? (
                        <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-muted border border-border"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <Package className="w-5 h-5" />
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.barcode}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Harga',
            accessorKey: 'price' as keyof Product,
            cell: (item: Product) => (
                <span className="font-medium text-foreground">Rp {item.price?.toLocaleString('id-ID')}</span>
            )
        },
        {
            header: 'Gudang',
            accessorKey: 'stock_gudang' as any,
            sortKey: 'stock.gudang',
            className: 'text-center',
            cell: (item: Product) => (
                <div className="text-center">
                    <Badge variant={item.stock.gudang < 10 ? 'destructive' : 'secondary'} className="rounded-full">
                        {item.stock.gudang}
                    </Badge>
                </div>
            )
        },
        {
            header: 'Toko',
            accessorKey: 'stock_toko' as any,
            sortKey: 'stock.toko',
            className: 'text-center',
            cell: (item: Product) => (
                <div className="text-center">
                    <Badge variant={item.stock.toko < 5 ? 'destructive' : 'secondary'} className="rounded-full">
                        {item.stock.toko}
                    </Badge>
                </div>
            )
        },
        {
            header: 'Total Stok',
            sortable: false,
            cell: (item: Product) => {
                const total = item.stock.gudang + item.stock.toko + item.stock.lainnya;
                return (
                    <span className={`font-bold ${total < 5 ? 'text-destructive' : 'text-green-600'}`}>
                        {total} Unit
                    </span>
                )
            }
        },
        {
            header: '',
            sortable: false,
            cell: (item: Product) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-border shadow-lg w-48">
                        {canAdjustStock && (
                            <>
                                <DropdownMenuItem
                                    onClick={() => openStockAdjustDialog(item)}
                                    className="gap-2 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> Sesuaikan Stok
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        {canEditProduct && (
                            <DropdownMenuItem
                                onClick={() => handleEditProduct(item.id)}
                                className="gap-2 cursor-pointer"
                            >
                                <Pencil className="w-4 h-4" /> Edit Produk
                            </DropdownMenuItem>
                        )}
                        {canDeleteProduct && (
                            <DropdownMenuItem
                                onClick={() => handleDeleteProduct(item.id)}
                                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                            >
                                <Trash2 className="w-4 h-4" /> Hapus
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ];

    return (
        <MainLayout
            title="Manajemen Produk"
            subtitle="Kelola inventaris produk, pantau stok, dan atur harga"
            actions={
                <div className="flex gap-2 flex-wrap">
                    {(role === 'warehouse' || role === 'admin' || role === 'cashier') && (
                        <Button variant="outline" className="rounded-xl text-xs sm:text-sm" onClick={() => setStockInDialog(true)}>
                            <ArrowDownToLine className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Stok Masuk</span>
                        </Button>
                    )}
                    {canAddProduct && (
                        <AddProductDialog
                            onAdd={handleAddProduct}
                            getProductByBarcode={getProductByBarcode}
                            userRole={role}
                        />
                    )}
                </div>
            }
        >
            <div className="space-y-6">
                {/* Stats Cards */}
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Produk"
                        value={stats.total}
                        icon={<Package className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Stok Rendah"
                        value={stats.lowStock}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        subtitle={stats.lowStock > 0 ? "perlu restock" : undefined}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Stok Gudang"
                        value={stats.totalGudang.toLocaleString()}
                        icon={<Warehouse className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Stok Toko"
                        value={stats.totalToko.toLocaleString()}
                        icon={<Store className="w-5 h-5" />}
                    />
                </StatsGrid>

                {/* Search Bar */}
                <div className="flex-1 max-w-md">
                    <BarcodeScanner onScan={handleBarcodeScanned} placeholder="Scan barcode produk..." />
                </div>

                {/* Products Table */}
                <BeautifulTable
                    data={products}
                    columns={columns}
                    title="Daftar Produk"
                    emptyState={{
                        icon: <Package className="w-10 h-10" />,
                        title: "Belum Ada Produk",
                        description: "Mulai kelola inventaris dengan menambahkan produk pertama."
                    }}
                />
            </div>

            {/* Edit Product Dialog */}
            <EditProductDialog
                product={editProduct}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onUpdate={handleUpdateProduct}
                products={products}
                userRole={role}
            />

            {/* Quick Stock Adjustment Dialog */}
            <Dialog open={stockAdjustDialog} onOpenChange={setStockAdjustDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Sesuaikan Stok</DialogTitle>
                    </DialogHeader>
                    {stockAdjustProduct && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                                {stockAdjustProduct.image_url ? (
                                    <img src={stockAdjustProduct.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Package className="w-6 h-6 text-primary" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold">{stockAdjustProduct.name}</p>
                                    <p className="text-xs text-muted-foreground">{stockAdjustProduct.barcode}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* Gudang */}
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <Label className="text-sm">Gudang</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Saat ini: {stockAdjustProduct.stock.gudang}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => setStockAdjustments(prev => ({ ...prev, gudang: prev.gudang - 1 }))}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>
                                        <Input
                                            type="number"
                                            value={stockAdjustments.gudang}
                                            onChange={(e) => setStockAdjustments(prev => ({ ...prev, gudang: parseInt(e.target.value) || 0 }))}
                                            className="w-20 text-center h-8 rounded-lg"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => setStockAdjustments(prev => ({ ...prev, gudang: prev.gudang + 1 }))}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Toko */}
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <Label className="text-sm">Toko</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Saat ini: {stockAdjustProduct.stock.toko}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => setStockAdjustments(prev => ({ ...prev, toko: prev.toko - 1 }))}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>
                                        <Input
                                            type="number"
                                            value={stockAdjustments.toko}
                                            onChange={(e) => setStockAdjustments(prev => ({ ...prev, toko: parseInt(e.target.value) || 0 }))}
                                            className="w-20 text-center h-8 rounded-lg"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => setStockAdjustments(prev => ({ ...prev, toko: prev.toko + 1 }))}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Lainnya */}
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <Label className="text-sm">Lainnya</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Saat ini: {stockAdjustProduct.stock.lainnya}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => setStockAdjustments(prev => ({ ...prev, lainnya: prev.lainnya - 1 }))}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>
                                        <Input
                                            type="number"
                                            value={stockAdjustments.lainnya}
                                            onChange={(e) => setStockAdjustments(prev => ({ ...prev, lainnya: parseInt(e.target.value) || 0 }))}
                                            className="w-20 text-center h-8 rounded-lg"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => setStockAdjustments(prev => ({ ...prev, lainnya: prev.lainnya + 1 }))}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Preview new stock values */}
                            <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                                <p className="text-xs text-muted-foreground mb-2">Stok baru setelah penyesuaian:</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Gudang</p>
                                        <p className="font-bold text-primary">
                                            {Math.max(0, stockAdjustProduct.stock.gudang + stockAdjustments.gudang)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Toko</p>
                                        <p className="font-bold text-primary">
                                            {Math.max(0, stockAdjustProduct.stock.toko + stockAdjustments.toko)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Lainnya</p>
                                        <p className="font-bold text-primary">
                                            {Math.max(0, stockAdjustProduct.stock.lainnya + stockAdjustments.lainnya)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStockAdjustDialog(false)} className="rounded-xl">
                            Batal
                        </Button>
                        <Button onClick={handleQuickStockAdjust} className="rounded-xl">
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Stock In Modal */}
            <Dialog open={stockInDialog} onOpenChange={(open) => {
                setStockInDialog(open);
                if (!open) {
                    setStockInProduct(null);
                    setStockInQuantity(1);
                    setStockInConfirmed(false);
                }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowDownToLine className="w-5 h-5" />
                            Stok Masuk
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-[30px]">
                        <div>
                            <Label>Scan Barcode Produk</Label>
                            <BarcodeScanner onScan={handleStockInBarcodeScanned} placeholder="Scan atau masukkan barcode..." />
                        </div>

                        {stockInProduct && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                                    {stockInProduct.image_url ? (
                                        <img src={stockInProduct.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Package className="w-6 h-6 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold">{stockInProduct.name}</p>
                                        <p className="text-xs text-muted-foreground">{stockInProduct.barcode}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 bg-muted/30 rounded-lg">
                                        <p className="text-lg font-bold">{stockInProduct.stock.gudang}</p>
                                        <p className="text-xs text-muted-foreground">Gudang</p>
                                    </div>
                                    <div className="p-2 bg-muted/30 rounded-lg">
                                        <p className="text-lg font-bold">{stockInProduct.stock.toko}</p>
                                        <p className="text-xs text-muted-foreground">Toko</p>
                                    </div>
                                    <div className="p-2 bg-muted/30 rounded-lg">
                                        <p className="text-lg font-bold">{stockInProduct.stock.lainnya}</p>
                                        <p className="text-xs text-muted-foreground">Lainnya</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Jumlah Masuk</Label>
                                        <Input
                                            type="number"
                                            value={stockInQuantity}
                                            onChange={(e) => setStockInQuantity(parseInt(e.target.value) || 0)}
                                            min={1}
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Lokasi</Label>
                                        <Select value={stockInLocation} onValueChange={(v: Location) => setStockInLocation(v)}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="gudang">Gudang</SelectItem>
                                                <SelectItem value="toko">Toko</SelectItem>
                                                <SelectItem value="lainnya">Lainnya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={stockInConfirmed}
                                            onChange={(e) => setStockInConfirmed(e.target.checked)}
                                            className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm">
                                            Konfirmasi: tambahkan <strong>{stockInQuantity}</strong> unit ke <strong className="capitalize">{stockInLocation}</strong>
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {!stockInProduct && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Scan barcode produk untuk memulai</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStockInDialog(false)} className="rounded-xl">
                            Batal
                        </Button>
                        <Button
                            onClick={handleAddStock}
                            disabled={!stockInProduct || !stockInConfirmed || stockInQuantity <= 0}
                            className="rounded-xl"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Tambah Stok
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

import { useState } from 'react';
import { Package, MoreHorizontal, Pencil, Trash2, Plus, AlertTriangle, Warehouse, Store, ArrowDownToLine } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import { AddProductDialog, EditProductDialog, StockAdjustDialog, StockInDialog } from '@/components/products';
import { useData } from '@/contexts/DataContext';
import { useRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types';
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
import { STOCK_THRESHOLDS } from '@/constants';

export default function Products() {
    const { products, addProduct, updateProduct, deleteProduct, getProductByBarcode, addStock, loading } = useData();
    const role = useRole();
    const { toast } = useToast();

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editProductId, setEditProductId] = useState<string | null>(null);

    // Quick stock adjustment state
    const [stockAdjustDialog, setStockAdjustDialog] = useState(false);
    const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);

    // Stock In modal state
    const [stockInDialog, setStockInDialog] = useState(false);

    // Role permissions
    const canAddProduct = role === 'admin' || role === 'warehouse' || role === 'cashier';
    const canEditProduct = role === 'admin' || role === 'warehouse' || role === 'cashier' || role === 'auditor';
    const canDeleteProduct = role === 'admin' || role === 'auditor';
    const canAdjustStock = role === 'admin' || role === 'auditor';

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
            toast({
                title: 'Produk ditemukan',
                description: product.name,
            });
        } else {
            toast({
                title: 'Produk tidak ditemukan',
                description: 'Barcode: ' + barcode,
                variant: 'destructive',
            });
        }
    };

    const handleAddProduct = async (product: {
        name: string;
        barcode: string;
        price: number;
        stock: { gudang: number; toko: number };
        image_url?: string;
    }): Promise<boolean> => {
        const success = await addProduct(product);
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

    // Stock adjustment handlers
    const openStockAdjustDialog = (product: Product) => {
        setStockAdjustProduct(product);
        setStockAdjustDialog(true);
    };

    const handleStockAdjustSave = async (productId: string, newStock: { gudang: number; toko: number }) => {
        await updateProduct(productId, { stock: newStock });
        toast({
            title: 'Stok diperbarui',
            description: `Stok ${stockAdjustProduct?.name} berhasil diperbarui`,
        });
    };

    const editProduct = editProductId ? products.find(p => p.id === editProductId) || null : null;

    // Stats for hero section
    const stats = {
        total: products.length,
        lowStock: products.filter(p =>
            p.stock.gudang < STOCK_THRESHOLDS.LOW_STOCK_GUDANG ||
            p.stock.toko < STOCK_THRESHOLDS.LOW_STOCK_TOKO
        ).length,
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
                    <Badge variant={item.stock.gudang < STOCK_THRESHOLDS.LOW_STOCK_GUDANG ? 'destructive' : 'secondary'} className="rounded-full">
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
                    <Badge variant={item.stock.toko < STOCK_THRESHOLDS.LOW_STOCK_TOKO ? 'destructive' : 'secondary'} className="rounded-full">
                        {item.stock.toko}
                    </Badge>
                </div>
            )
        },
        {
            header: 'Total Stok',
            sortable: false,
            cell: (item: Product) => {
                const total = item.stock.gudang + item.stock.toko;
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
                        gradient="blue"
                        animationDelay={0}
                    />
                    <StatsCard
                        title="Stok Rendah"
                        value={stats.lowStock}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        subtitle={stats.lowStock > 0 ? "perlu restock" : undefined}
                        subtitleType="warning"
                        gradient="orange"
                        animationDelay={100}
                    />
                    <StatsCard
                        title="Stok Gudang"
                        value={stats.totalGudang.toLocaleString()}
                        icon={<Warehouse className="w-5 h-5" />}
                        gradient="amber"
                        animationDelay={200}
                    />
                    <StatsCard
                        title="Stok Toko"
                        value={stats.totalToko.toLocaleString()}
                        icon={<Store className="w-5 h-5" />}
                        gradient="emerald"
                        animationDelay={300}
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

            {/* Stock Adjustment Dialog */}
            <StockAdjustDialog
                product={stockAdjustProduct}
                open={stockAdjustDialog}
                onOpenChange={setStockAdjustDialog}
                onSave={handleStockAdjustSave}
            />

            {/* Stock In Dialog */}
            <StockInDialog
                open={stockInDialog}
                onOpenChange={setStockInDialog}
                onAddStock={addStock}
                getProductByBarcode={getProductByBarcode}
            />
        </MainLayout>
    );
}

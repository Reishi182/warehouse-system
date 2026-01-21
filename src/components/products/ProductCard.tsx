import { Package, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Product } from '@/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
    product: Product;
    canManage: boolean;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function ProductCard({ product, canManage, onEdit, onDelete }: ProductCardProps) {
    const total = product.stock.gudang + product.stock.toko;
    const lowStock = product.stock.gudang < 20 || product.stock.toko < 10;

    return (
        <div className={cn('glass-card rounded-3xl p-4 animate-slide-up', lowStock && 'border border-warning/30 bg-warning/5')}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border flex-shrink-0"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-semibold truncate">{product.name}</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded inline-block mt-1">
                            {product.barcode}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">Rp {product.price.toLocaleString('id-ID')}</p>
                        {lowStock && (
                            <div className="mt-1">
                                <span className="text-xs text-warning">Stok Rendah</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-primary">{total}</p>
                </div>
            </div>

            {canManage && (
                <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="w-full" onClick={() => onEdit(product.id)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                        </Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Hapus
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Produk <span className="font-medium">{product.name}</span> akan dihapus permanen.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => onDelete(product.id)}
                                    >
                                        Hapus
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-lg bg-muted/30 p-2 text-center">
                    <p className={cn('text-sm font-semibold', product.stock.gudang < 20 && 'text-warning')}>
                        {product.stock.gudang}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Gudang</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2 text-center">
                    <p className={cn('text-sm font-semibold', product.stock.toko < 10 && 'text-warning')}>
                        {product.stock.toko}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Toko</p>
                </div>
            </div>
        </div>
    );
}

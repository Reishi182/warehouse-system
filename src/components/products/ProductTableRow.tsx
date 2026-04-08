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

interface ProductTableRowProps {
    product: Product;
    canManage: boolean;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function ProductTableRow({ product, canManage, onEdit, onDelete }: ProductTableRowProps) {
    const total = product.stock.gudang + product.stock.toko;
    const lowStock = product.stock.gudang < 20 || product.stock.toko < 10;

    return (
        <tr className={cn(lowStock && 'bg-warning/5')}>
            <td>
                <div className="flex items-center gap-3">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover border"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <div className="flex flex-col gap-1 items-start mt-1">
                            <p className="font-medium text-sm leading-none">{product.name}</p>
                            <div className="flex gap-2 items-center flex-wrap mt-1">
                                {lowStock && (
                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Stok Rendah</span>
                                )}
                                {product.has_multi_unit && (
                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        📦 {(product.main_unit || 'box').toUpperCase()}/{(product.sell_unit || 'pcs').toUpperCase()}
                                    </span>
                                )}
                                {product.sell_by_quantity && (
                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        📏 per {product.sell_unit}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                    {product.barcode}
                </code>
            </td>
            <td className="text-right font-semibold">
                <div className="flex flex-col items-end">
                    <span>Rp {product.price.toLocaleString('id-ID')}</span>
                    {product.sell_by_quantity && (
                        <span className="text-[10px] font-normal text-muted-foreground mt-0.5">/{product.sell_unit}</span>
                    )}
                </div>
            </td>
            <td className="text-center">
                <span className={cn(
                    'font-medium',
                    product.stock.gudang < 20 && 'text-warning'
                )}>
                    {product.stock.gudang}
                </span>
            </td>
            <td className="text-center">
                <span className={cn(
                    'font-medium',
                    product.stock.toko < 10 && 'text-warning'
                )}>
                    {product.stock.toko}
                </span>
            </td>
            <td className="text-center">
                <span className="font-bold text-primary">{total}</span>
            </td>
            {canManage && (
                <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(product.id)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
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
                </td>
            )}
        </tr>
    );
}

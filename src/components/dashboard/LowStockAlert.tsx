import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types';

interface LowStockAlertProps {
    products: Product[];
}

export default function LowStockAlert({ products }: LowStockAlertProps) {
    if (products.length === 0) return null;

    return (
        <div className="glass-card rounded-3xl p-4 mb-6 border-warning/50 bg-warning/5 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <h3 className="font-semibold text-warning">Stok Rendah</h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {products.map(product => (
                    <Link
                        key={product.id}
                        to="/products"
                        className="px-3 py-1.5 bg-background rounded-lg text-sm hover:bg-muted transition-colors"
                    >
                        {product.name}
                    </Link>
                ))}
            </div>
        </div>
    );
}

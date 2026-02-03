import { useState, useCallback, useMemo } from 'react';
import { Product, Location, Sale } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';

export type CartItem = {
    product: Product;
    quantity: number;
    discount: number;
    isManualEntry?: boolean; // true for quick sale items (no product_id)
};

export interface UsePOSCartOptions {
    stockLocation: Location;
}

export interface UsePOSCartReturn {
    items: CartItem[];
    stockLocation: Location;
    setStockLocation: (location: Location) => void;
    orderDiscount: number;
    setOrderDiscount: (discount: number) => void;
    addToCart: (product: Product) => void;
    addToCartWithQuantity: (product: Product, quantity: number) => void; // For variable unit products
    addManualItem: (name: string, price: number, quantity: number) => void; // For quick sale items
    updateQuantity: (productId: string, quantity: number) => void;
    updateItemDiscount: (productId: string, discount: number) => void;
    removeItem: (productId: string) => void;
    clearCart: () => void;
    loadFromSale: (sale: Sale) => void;
    subtotal: number;
    totalAmount: number;
    itemCount: number;
}

export function usePOSCart(initialLocation: Location = 'toko'): UsePOSCartReturn {
    const { toast } = useToast();
    const [items, setItems] = useState<CartItem[]>([]);
    const [stockLocation, setStockLocation] = useState<Location>(initialLocation);
    const [orderDiscount, setOrderDiscount] = useState(0);

    const addToCart = useCallback((product: Product) => {
        const availableStock = product.stock[stockLocation];

        // Skip stock validation for variable unit products - will check in addToCartWithQuantity
        if (!product.sell_by_quantity && availableStock <= 0) {
            toast({
                title: 'Stok habis',
                description: `${product.name} tidak tersedia di ${stockLocation}`,
                variant: 'destructive'
            });
            return;
        }

        setItems((prev) => {
            const idx = prev.findIndex((it) => it.product.id === product.id);
            if (idx >= 0) {
                const next = [...prev];
                const newQty = next[idx].quantity + 1;
                // Skip stock check for variable unit products
                if (!product.sell_by_quantity && newQty > availableStock) {
                    toast({
                        title: 'Stok tidak cukup',
                        description: `Maksimal ${availableStock} unit tersedia`,
                        variant: 'destructive'
                    });
                    return prev;
                }
                next[idx] = { ...next[idx], quantity: newQty };
                return next;
            }
            return [...prev, { product, quantity: 1, discount: 0 }];
        });
    }, [stockLocation, toast]);

    // Add to cart with specific quantity (for variable unit products like meters/kg)
    const addToCartWithQuantity = useCallback((product: Product, quantity: number) => {
        if (quantity <= 0) return;

        const availableStock = product.stock[stockLocation];
        if (quantity > availableStock) {
            toast({
                title: 'Stok tidak cukup',
                description: `Stok tersedia: ${availableStock} ${product.sell_unit || 'pcs'}`,
                variant: 'destructive'
            });
            return;
        }

        setItems((prev) => {
            const idx = prev.findIndex((it) => it.product.id === product.id);
            if (idx >= 0) {
                // Replace existing quantity for variable unit products
                const next = [...prev];
                const newQty = next[idx].quantity + quantity;
                if (newQty > availableStock) {
                    toast({
                        title: 'Stok tidak cukup',
                        description: `Stok tersedia: ${availableStock} ${product.sell_unit || 'pcs'}`,
                        variant: 'destructive'
                    });
                    return prev;
                }
                next[idx] = { ...next[idx], quantity: newQty };
                return next;
            }
            return [...prev, { product, quantity, discount: 0 }];
        });
    }, [stockLocation, toast]);

    // Add manual item (Quick Sale) - no product in database
    const addManualItem = useCallback((name: string, price: number, quantity: number) => {
        if (!name.trim() || price <= 0 || quantity <= 0) {
            toast({
                title: 'Data tidak valid',
                description: 'Nama, harga, dan jumlah harus diisi dengan benar',
                variant: 'destructive'
            });
            return;
        }

        // Create a pseudo-product for manual entry
        const manualProductId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const manualProduct: Product = {
            id: manualProductId,
            name: name.trim(),
            barcode: '', // No barcode for manual items
            price: price,
            stock: { gudang: 9999, toko: 9999 }, // Unlimited stock for manual items
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        setItems((prev) => [...prev, {
            product: manualProduct,
            quantity,
            discount: 0,
            isManualEntry: true
        }]);

        toast({
            title: '✅ Item ditambahkan',
            description: `${name} x${quantity} - Rp ${(price * quantity).toLocaleString('id-ID')}`,
        });
    }, [toast]);

    const updateQuantity = useCallback((productId: string, qty: number) => {
        if (qty < 0) return;
        setItems((prev) =>
            prev
                .map((it) => (it.product.id === productId ? { ...it, quantity: qty } : it))
                .filter((it) => it.quantity > 0),
        );
    }, []);

    const updateItemDiscount = useCallback((productId: string, discount: number) => {
        setItems((prev) =>
            prev.map((it) =>
                it.product.id === productId
                    ? { ...it, discount: Math.max(0, discount) } // discount is now nominal Rupiah
                    : it
            ),
        );
    }, []);

    const removeItem = useCallback((productId: string) => {
        setItems((prev) => prev.filter((it) => it.product.id !== productId));
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setOrderDiscount(0);
    }, []);

    const { products } = useData();

    // Load items from an existing sale into the cart (for exchange/return)
    const loadFromSale = useCallback((sale: Sale) => {
        if (!sale.items || sale.items.length === 0) {
            toast({
                title: 'Tidak ada item',
                description: 'Transaksi ini tidak memiliki item',
                variant: 'destructive'
            });
            return;
        }

        // Set stock location from original sale
        if (sale.stock_location) {
            setStockLocation(sale.stock_location);
        }

        // Convert sale items to cart items
        // Override stock with high value to allow quantity changes during exchange
        const cartItems: CartItem[] = sale.items.map(saleItem => {
            // Find product from products list
            const product = products.find(p => p.id === saleItem.product_id);

            if (!product) {
                // Create a temporary product object from sale item data
                return {
                    product: {
                        id: saleItem.product_id,
                        name: saleItem.product_name,
                        barcode: saleItem.barcode,
                        price: saleItem.price,
                        stock: { gudang: 9999, toko: 9999 }, // Allow any qty for exchange
                        created_at: '',
                        updated_at: '',
                    },
                    quantity: saleItem.quantity,
                    discount: saleItem.discount || 0,
                };
            }

            // Override stock with high value for exchange mode
            // This allows modifying quantity without stock validation errors
            return {
                product: {
                    ...product,
                    stock: {
                        gudang: Math.max(9999, product.stock.gudang + saleItem.quantity),
                        toko: Math.max(9999, product.stock.toko + saleItem.quantity)
                    }
                },
                quantity: saleItem.quantity,
                discount: saleItem.discount || 0,
            };
        });

        setItems(cartItems);
        // Set order discount if applicable
        setOrderDiscount(sale.order_discount || 0);

        toast({
            title: 'Item dimuat',
            description: `${cartItems.length} item dari ${sale.sale_number} siap untuk diganti`,
        });
    }, [products, toast]);

    const subtotal = useMemo(() => {
        return items.reduce((acc, it) => {
            const itemTotal = it.product.price * it.quantity;
            // discount is now a fixed amount in Rupiah per item
            const itemDiscount = it.discount * it.quantity;
            return acc + (itemTotal - itemDiscount);
        }, 0);
    }, [items]);

    const totalAmount = useMemo(() => {
        // orderDiscount is now a fixed amount in Rupiah
        return Math.max(0, subtotal - orderDiscount);
    }, [subtotal, orderDiscount]);

    const itemCount = useMemo(() => {
        return items.reduce((acc, it) => acc + it.quantity, 0);
    }, [items]);

    return {
        items,
        stockLocation,
        setStockLocation,
        orderDiscount,
        setOrderDiscount: (discount: number) => setOrderDiscount(Math.max(0, discount)),
        addToCart,
        addToCartWithQuantity,
        addManualItem,
        updateQuantity,
        updateItemDiscount,
        removeItem,
        clearCart,
        loadFromSale,
        subtotal,
        totalAmount,
        itemCount,
    };
}

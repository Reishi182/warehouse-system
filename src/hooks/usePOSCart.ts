import { useState, useCallback, useMemo } from 'react';
import { Product, Location } from '@/types';
import { useToast } from '@/hooks/use-toast';

export type CartItem = {
    product: Product;
    quantity: number;
    discount: number;
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
    updateQuantity: (productId: string, quantity: number) => void;
    updateItemDiscount: (productId: string, discount: number) => void;
    removeItem: (productId: string) => void;
    clearCart: () => void;
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

        if (availableStock <= 0) {
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
                if (newQty > availableStock) {
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
                    ? { ...it, discount: Math.min(100, Math.max(0, discount)) }
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

    const subtotal = useMemo(() => {
        return items.reduce((acc, it) => {
            const itemTotal = it.product.price * it.quantity;
            const itemDiscount = itemTotal * (it.discount / 100);
            return acc + (itemTotal - itemDiscount);
        }, 0);
    }, [items]);

    const totalAmount = useMemo(() => {
        const discountAmount = subtotal * (orderDiscount / 100);
        return subtotal - discountAmount;
    }, [subtotal, orderDiscount]);

    const itemCount = useMemo(() => {
        return items.reduce((acc, it) => acc + it.quantity, 0);
    }, [items]);

    return {
        items,
        stockLocation,
        setStockLocation,
        orderDiscount,
        setOrderDiscount: (discount: number) => setOrderDiscount(Math.min(100, Math.max(0, discount))),
        addToCart,
        updateQuantity,
        updateItemDiscount,
        removeItem,
        clearCart,
        subtotal,
        totalAmount,
        itemCount,
    };
}

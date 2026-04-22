import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, Location } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { broadcastTableChange } from '@/lib/broadcastSync';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

// Transform database row to Product type
function transformProduct(row: any): Product {
    return {
        id: row.id,
        name: row.name,
        barcode: row.barcode,
        price: row.price || 0,
        image_url: row.image_url,
        stock: {
            gudang: row.stock_gudang || 0,
            toko: row.stock_toko || 0,
        },
        sell_by_quantity: row.sell_by_quantity || false,
        sell_unit: row.sell_unit || 'pcs',
        has_multi_unit: row.has_multi_unit || false,
        main_unit: row.main_unit ?? null,
        pcs_per_box: row.pcs_per_box ?? null,
        box_price: row.box_price ?? null,
        category_id: row.category_id ?? null,
        hpp: row.hpp ?? 0,
        min_stock_gudang: row.min_stock_gudang ?? 0,
        min_stock_toko: row.min_stock_toko ?? 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

// Fetch all products (paginated to bypass Supabase 1000-row default limit)
async function fetchProducts(): Promise<Product[]> {
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name', { ascending: true })
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        allData = allData.concat(data || []);
        if (!data || data.length < PAGE_SIZE) {
            hasMore = false;
        } else {
            from += PAGE_SIZE;
        }
    }

    return allData.map(transformProduct);
}

// Hook to get all products (data is managed centrally by DataContext and cached by react-query)
export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: fetchProducts,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Helper function to broadcast product updates (call this after mutations)
export async function broadcastProductUpdate() {
    await supabase.channel('products-broadcast').send({
        type: 'broadcast',
        event: 'products-updated',
        payload: { timestamp: Date.now() },
    });
}

// Hook to find product by barcode
export function useProductByBarcode(products: Product[], barcode: string) {
    return products.find(p => p.barcode === barcode) || null;
}

// Hook to add a product
export function useAddProduct() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (product: {
            name: string;
            barcode: string;
            price: number;
            stock: { gudang: number; toko: number };
            image_url?: string;
            sell_by_quantity?: boolean;
            sell_unit?: string;
            has_multi_unit?: boolean;
            main_unit?: string | null;
            pcs_per_box?: number | null;
            box_price?: number | null;
            category_id?: string | null;
            hpp?: number;
            min_stock_gudang?: number;
            min_stock_toko?: number;
        }) => {
            const { data, error } = await supabase
                .from('products')
                .insert({
                    name: product.name,
                    barcode: product.barcode,
                    price: product.price,
                    stock_gudang: product.stock.gudang,
                    stock_toko: product.stock.toko,
                    image_url: product.image_url,
                    sell_by_quantity: product.sell_by_quantity || false,
                    sell_unit: product.sell_unit || 'pcs',
                    has_multi_unit: product.has_multi_unit || false,
                    main_unit: product.main_unit ?? null,
                    pcs_per_box: product.pcs_per_box ?? null,
                    box_price: product.box_price ?? null,
                    category_id: product.category_id ?? null,
                    hpp: product.hpp ?? 0,
                    min_stock_gudang: product.min_stock_gudang ?? 0,
                    min_stock_toko: product.min_stock_toko ?? 0,
                })
                .select()
                .single();

            if (error) throw error;
            return transformProduct(data);
        },
        onSuccess: async () => {
            invalidateAndBroadcast(queryClient, ['products']);
            broadcastTableChange('products', 'INSERT', ['products']);
            // Broadcast to other devices/tabs
            await broadcastProductUpdate();
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menambahkan produk',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook to update a product
export function useUpdateProduct() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.barcode !== undefined) updateData.barcode = updates.barcode;
            if (updates.price !== undefined) updateData.price = updates.price;
            if (updates.image_url !== undefined) updateData.image_url = updates.image_url;
            if (updates.sell_by_quantity !== undefined) updateData.sell_by_quantity = updates.sell_by_quantity;
            if (updates.sell_unit !== undefined) updateData.sell_unit = updates.sell_unit;
            if (updates.has_multi_unit !== undefined) updateData.has_multi_unit = updates.has_multi_unit;
            if (updates.main_unit !== undefined) updateData.main_unit = updates.main_unit;
            if (updates.pcs_per_box !== undefined) updateData.pcs_per_box = updates.pcs_per_box;
            if (updates.box_price !== undefined) updateData.box_price = updates.box_price;
            if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
            if (updates.hpp !== undefined) updateData.hpp = updates.hpp;
            if (updates.min_stock_gudang !== undefined) updateData.min_stock_gudang = updates.min_stock_gudang;
            if (updates.min_stock_toko !== undefined) updateData.min_stock_toko = updates.min_stock_toko;
            if (updates.stock) {
                if (updates.stock.gudang !== undefined) updateData.stock_gudang = updates.stock.gudang;
                if (updates.stock.toko !== undefined) updateData.stock_toko = updates.stock.toko;
            }

            const { error } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: async () => {
            invalidateAndBroadcast(queryClient, ['products']);
            broadcastTableChange('products', 'UPDATE', ['products']);
            // Broadcast to other devices/tabs
            await broadcastProductUpdate();
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal memperbarui produk',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook to delete a product
export function useDeleteProduct() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: async () => {
            invalidateAndBroadcast(queryClient, ['products', 'activity-logs']);
            broadcastTableChange('products', 'DELETE', ['products', 'activity-logs']);
            // Broadcast to other devices/tabs
            await broadcastProductUpdate();
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menghapus produk',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook to add stock
export function useAddStock() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            productId,
            quantity,
            location,
            userId,
        }: {
            productId: string;
            quantity: number;
            location: Location;
            userId?: string;
        }) => {
            // Fetch current stock before atomic increment for logging
            const stockField = `stock_${location}`;
            const { data: prodData } = await supabase
                .from('products')
                .select(stockField)
                .eq('id', productId)
                .single();
            const stockBefore = (prodData as any)?.[stockField] || 0;

            // Atomic increment — no read-then-write race condition
            const { error: incrementError } = await supabase.rpc('atomic_increment_stock', {
                p_product_id: productId,
                p_quantity: quantity,
                p_location: location,
            });

            if (incrementError) throw incrementError;

            // Log the stock addition
            const { error: logError } = await supabase.from('stock_logs').insert({
                product_id: productId,
                type: 'in',
                quantity,
                location,
                user_id: userId,
                note: `Penambahan stok di ${location}`,
                stock_before: stockBefore,
                stock_after: stockBefore + quantity,
            });

            if (logError) throw logError;
        },
        onSuccess: async () => {
            invalidateAndBroadcast(queryClient, ['products', 'stock-logs']);
            broadcastTableChange('products', 'UPDATE', ['products', 'stock-logs']);
            // Broadcast to other devices/tabs
            await broadcastProductUpdate();
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menambahkan stok',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}
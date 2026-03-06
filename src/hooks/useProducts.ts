import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, Location } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

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

// Hook to get all products with realtime updates
export function useProducts() {
    const queryClient = useQueryClient();

    // Set up realtime subscription with broadcast fallback
    useEffect(() => {
        // Method 1: Subscribe to postgres_changes (may be blocked by RLS)
        const pgChannel = supabase
            .channel('products-pg-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                (payload) => {
                    console.log('[Realtime PG] Products changed:', payload.eventType);
                    queryClient.invalidateQueries({ queryKey: ['products'] });
                }
            )
            .subscribe((status) => {
                console.log('[Realtime Products PG] Status:', status);
            });

        // Method 2: Subscribe to broadcast channel (not affected by RLS)
        const broadcastChannel = supabase
            .channel('products-broadcast')
            .on('broadcast', { event: 'products-updated' }, () => {
                console.log('[Realtime Broadcast] Products updated signal received');
                queryClient.invalidateQueries({ queryKey: ['products'] });
            })
            .subscribe((status) => {
                console.log('[Realtime Broadcast] Status:', status);
            });

        return () => {
            supabase.removeChannel(pgChannel);
            supabase.removeChannel(broadcastChannel);
        };
    }, [queryClient]);

    return useQuery({
        queryKey: ['products'],
        queryFn: fetchProducts,
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
                })
                .select()
                .single();

            if (error) throw error;
            return transformProduct(data);
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
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
            queryClient.invalidateQueries({ queryKey: ['products'] });
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
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
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
            });

            if (logError) throw logError;
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
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
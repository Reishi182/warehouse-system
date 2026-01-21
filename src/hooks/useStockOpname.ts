import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockOpname, StockOpnameStatus, Location } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Transform database row to StockOpname type
function transformOpname(row: any): StockOpname {
    return {
        id: row.id,
        product_id: row.product_id,
        product: row.products ? {
            id: row.products.id,
            name: row.products.name,
            barcode: row.products.barcode,
            price: row.products.price,
            image_url: row.products.image_url,
            stock: {
                gudang: row.products.stock_gudang || 0,
                toko: row.products.stock_toko || 0,
            },
            created_at: row.products.created_at,
            updated_at: row.products.updated_at,
        } : undefined,
        location: row.location as Location,
        system_stock: row.system_stock,
        actual_stock: row.actual_stock,
        difference: row.difference,
        note: row.note,
        counted_by: row.counted_by,
        counted_by_name: row.counted_by_name,
        status: row.status as StockOpnameStatus,
        approved_by: row.approved_by,
        approved_by_name: row.approved_by_name,
        approved_at: row.approved_at,
        rejected_reason: row.rejected_reason,
        created_at: row.created_at,
    };
}

// Fetch all stock opname records
async function fetchStockOpname(): Promise<StockOpname[]> {
    const { data, error } = await supabase
        .from('stock_opname')
        .select(`
      *,
      products:product_id (
        id, name, barcode, price, image_url,
        stock_gudang, stock_toko, stock_other,
        created_at, updated_at
      )
    `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformOpname);
}

// Hook to get all stock opname records
export function useStockOpname() {
    return useQuery({
        queryKey: ['stock-opname'],
        queryFn: fetchStockOpname,
    });
}

// Hook to create stock opname record
export function useCreateStockOpname() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            productId,
            location,
            systemStock,
            actualStock,
            note,
            countedBy,
            countedByName,
        }: {
            productId: string;
            location: Location;
            systemStock: number;
            actualStock: number;
            note?: string;
            countedBy?: string;
            countedByName: string;
        }) => {
            const { data, error } = await supabase
                .from('stock_opname')
                .insert({
                    product_id: productId,
                    location,
                    system_stock: systemStock,
                    actual_stock: actualStock,
                    note,
                    counted_by: countedBy,
                    counted_by_name: countedByName,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
            toast({
                title: 'Stok opname dicatat',
                description: 'Menunggu persetujuan auditor untuk penyesuaian stok',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal mencatat stok opname',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook to approve stock opname (and adjust stock)
export function useApproveStockOpname() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            opnameId,
            approverId,
            approverName,
        }: {
            opnameId: string;
            approverId?: string;
            approverName: string;
        }) => {
            // Get the opname record
            const { data: opname, error: fetchError } = await supabase
                .from('stock_opname')
                .select('*, products:product_id (*)')
                .eq('id', opnameId)
                .single();

            if (fetchError) throw fetchError;

            // Update opname status
            const { error: updateError } = await supabase
                .from('stock_opname')
                .update({
                    status: 'approved',
                    approved_by: approverId,
                    approved_by_name: approverName,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', opnameId);

            if (updateError) throw updateError;

            // Adjust the actual stock in products table
            const stockField = opname.location === 'gudang' ? 'stock_gudang'
                : opname.location === 'toko' ? 'stock_toko'
                    : 'stock_other';

            const { error: stockError } = await supabase
                .from('products')
                .update({ [stockField]: opname.actual_stock })
                .eq('id', opname.product_id);

            if (stockError) throw stockError;

            // Log the adjustment
            const { error: logError } = await supabase
                .from('stock_logs')
                .insert({
                    product_id: opname.product_id,
                    type: 'adjustment',
                    quantity: opname.difference,
                    location: opname.location,
                    user_id: approverId,
                    note: `Stok opname: ${opname.system_stock} → ${opname.actual_stock} (${opname.note || 'tanpa catatan'})`,
                });

            if (logError) console.error('Failed to log adjustment:', logError);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
            toast({
                title: 'Stok opname disetujui',
                description: 'Stok produk berhasil disesuaikan',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menyetujui stok opname',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook to reject stock opname
export function useRejectStockOpname() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            opnameId,
            reason,
            approverId,
            approverName,
        }: {
            opnameId: string;
            reason: string;
            approverId?: string;
            approverName: string;
        }) => {
            const { error } = await supabase
                .from('stock_opname')
                .update({
                    status: 'rejected',
                    approved_by: approverId,
                    approved_by_name: approverName,
                    approved_at: new Date().toISOString(),
                    rejected_reason: reason,
                })
                .eq('id', opnameId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
            toast({
                title: 'Stok opname ditolak',
                description: 'Penyesuaian stok dibatalkan',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menolak stok opname',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

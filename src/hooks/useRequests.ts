import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockOutRequest, Location, RequestStatus, Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

// Transform database row to StockOutRequest type
function transformRequest(row: any, products: Product[]): StockOutRequest {
    const product = products.find(p => p.id === row.product_id);
    return {
        id: row.id,
        product_id: row.product_id,
        product,
        quantity: row.quantity,
        from_location: row.from_location as Location,
        to_location: row.to_location as Location,
        to_location_name: row.to_location_name,
        status: row.status as RequestStatus,
        requested_by: row.requested_by,
        requested_at: row.requested_at,
        surat_jalan_id: row.surat_jalan_id,
        approved_by: row.approved_by,
        approved_at: row.approved_at,
        rejected_reason: row.rejected_reason,
    };
}

// Fetch all requests
async function fetchRequests(products: Product[]): Promise<StockOutRequest[]> {
    const { data, error } = await supabase
        .from('stock_out_requests')
        .select('*')
        .order('requested_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => transformRequest(row, products));
}

// Hook to get all requests
export function useRequests(products: Product[]) {
    return useQuery({
        queryKey: ['requests', products.length],
        queryFn: () => fetchRequests(products),
        enabled: products.length > 0,
    });
}

// Hook to create a stock request
export function useCreateRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: {
            productId: string;
            quantity: number;
            fromLocation: Location;
            toLocation: Location;
            toLocationName?: string | null;
            requestedBy?: string;
        }) => {
            const { error } = await supabase.from('stock_out_requests').insert({
                product_id: data.productId,
                quantity: data.quantity,
                from_location: data.fromLocation,
                to_location: data.toLocation,
                to_location_name: data.toLocationName,
                requested_by: data.requestedBy,
                status: 'pending',
            });

            if (error) throw error;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['requests']);
            toast({
                title: 'Permintaan dibuat',
                description: 'Permintaan stok berhasil dibuat',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal membuat permintaan',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook to update request status
export function useUpdateRequestStatus() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            id,
            status,
            reason,
            approvedBy,
        }: {
            id: string;
            status: RequestStatus;
            reason?: string;
            approvedBy?: string;
        }) => {
            const updateData: any = { status };
            if (status === 'rejected' && reason) {
                updateData.rejected_reason = reason;
            }
            if (status === 'approved' && approvedBy) {
                updateData.approved_by = approvedBy;
                updateData.approved_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('stock_out_requests')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['requests']);
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal memperbarui status',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

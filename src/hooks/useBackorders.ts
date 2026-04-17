import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Backorder, BackorderStatus, Location } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

// Fetch all backorders
export function useBackorders(statusFilter?: BackorderStatus | BackorderStatus[]) {
    return useQuery({
        queryKey: ['backorders', statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('backorders')
                .select('*, product:products(*)')
                .order('created_at', { ascending: false });

            if (statusFilter) {
                if (Array.isArray(statusFilter)) {
                    query = query.in('status', statusFilter);
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Backorder[];
        },
    });
}

// Fetch pending backorders for a specific product
export function usePendingBackordersForProduct(productId: string) {
    return useQuery({
        queryKey: ['backorders', 'pending', productId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('backorders')
                .select('*')
                .eq('product_id', productId)
                .in('status', ['pending', 'partial'])
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as Backorder[];
        },
        enabled: !!productId,
    });
}

interface CreateBackorderInput {
    customerName: string;
    customerPhone?: string;
    productId: string;
    productName: string;
    barcode?: string;
    quantityOrdered: number;
    unitPrice: number;
    stockLocation: Location;
    originalSaleId?: string;
    notes?: string;
    createdBy: string;
    createdByName: string;
}

export function useCreateBackorder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: CreateBackorderInput) => {
            // Generate backorder number
            const { data: boNumber, error: numError } = await supabase
                .rpc('generate_backorder_number');

            let backorderNumber = boNumber;
            if (numError) {
                // Fallback
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
                backorderNumber = `BO-${dateStr}-${randomNum}`;
            }

            const { data, error } = await supabase
                .from('backorders')
                .insert([{
                    backorder_number: backorderNumber,
                    customer_name: input.customerName,
                    customer_phone: input.customerPhone || null,
                    product_id: input.productId,
                    product_name: input.productName,
                    barcode: input.barcode || null,
                    quantity_ordered: input.quantityOrdered,
                    quantity_fulfilled: 0,
                    unit_price: input.unitPrice,
                    status: 'pending',
                    stock_location: input.stockLocation,
                    original_sale_id: input.originalSaleId || null,
                    notes: input.notes || null,
                    created_by: input.createdBy,
                    created_by_name: input.createdByName,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            invalidateAndBroadcast(queryClient, ['backorders']);
            toast({
                title: 'Backorder Dibuat',
                description: `Backorder ${data.backorder_number} untuk ${data.quantity_ordered} ${data.product_name} berhasil dicatat.`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

interface FulfillBackorderInput {
    backorderId: string;
    quantityToFulfill: number;
    fulfilledSaleId?: string;
    fulfilledBy: string;
    fulfilledByName: string;
}

export function useFulfillBackorder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: FulfillBackorderInput) => {
            // Get current backorder
            const { data: bo, error: boError } = await supabase
                .from('backorders')
                .select('*')
                .eq('id', input.backorderId)
                .single();

            if (boError) throw boError;

            const newFulfilled = (bo.quantity_fulfilled || 0) + input.quantityToFulfill;
            const remaining = bo.quantity_ordered - newFulfilled;
            const newStatus: BackorderStatus = remaining <= 0 ? 'fulfilled' : 'partial';

            const { data, error } = await supabase
                .from('backorders')
                .update({
                    quantity_fulfilled: newFulfilled,
                    status: newStatus,
                    fulfilled_sale_id: input.fulfilledSaleId || bo.fulfilled_sale_id,
                    fulfilled_by: input.fulfilledBy,
                    fulfilled_by_name: input.fulfilledByName,
                    fulfilled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.backorderId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            invalidateAndBroadcast(queryClient, ['backorders', 'products']);
            toast({
                title: data.status === 'fulfilled' ? 'Backorder Selesai' : 'Partial Fulfill',
                description: `${data.quantity_fulfilled}/${data.quantity_ordered} ${data.product_name} telah dipenuhi.`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

interface CancelBackorderInput {
    backorderId: string;
    reason: string;
    cancelledBy: string;
    cancelledByName: string;
}

export function useCancelBackorder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: CancelBackorderInput) => {
            const { data, error } = await supabase
                .from('backorders')
                .update({
                    status: 'cancelled',
                    cancelled_by: input.cancelledBy,
                    cancelled_by_name: input.cancelledByName,
                    cancelled_at: new Date().toISOString(),
                    cancelled_reason: input.reason,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.backorderId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['backorders']);
            toast({
                title: 'Backorder Dibatalkan',
                description: 'Backorder berhasil dibatalkan.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

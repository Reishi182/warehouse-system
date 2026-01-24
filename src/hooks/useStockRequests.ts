
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NewStockRequest, NewStockRequestItem, NewRequestStatus } from '@/types';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';

export function useStockRequests() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all requests (filtered by RLS on backend)
    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['stock-requests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_requests')
                .select(`
          *,
          items:stock_request_items(
            *,
            product:products(*)
          )
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching stock requests:', error);
                throw error;
            }

            return data as NewStockRequest[];
        },
    });

    // Create Request
    const createRequest = useMutation({
        mutationFn: async (data: {
            cashierId: string;
            cashierName: string;
            reason: string;
            items: { productId: string; quantity: number; unit: string; note?: string }[];
        }) => {
            // 1. Create Request Header
            const { data: request, error: reqError } = await supabase
                .from('stock_requests')
                .insert({
                    cashier_id: data.cashierId,
                    cashier_name: data.cashierName,
                    reason: data.reason,
                    status: 'pending_main_office'
                })
                .select()
                .single();

            if (reqError) throw reqError;

            // 2. Create Request Items
            const itemsToInsert = data.items.map(item => ({
                stock_request_id: request.id,
                product_id: item.productId,
                quantity: item.quantity,
                unit: item.unit,
                note: item.note
            }));

            // 3. Reserve Stock with rollback support
            const reservedItems: { productId: string; quantity: number }[] = [];
            try {
                for (const item of data.items) {
                    const { error: reserveError } = await supabase.rpc('reserve_stock', {
                        p_product_id: item.productId,
                        p_quantity: item.quantity
                    });

                    if (reserveError) throw reserveError;
                    reservedItems.push({ productId: item.productId, quantity: item.quantity });
                }

                const { error: itemsError } = await supabase
                    .from('stock_request_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            } catch (error) {
                // Rollback: release any reserved stock
                for (const reserved of reservedItems) {
                    await supabase.rpc('release_stock_reservation', {
                        p_product_id: reserved.productId,
                        p_quantity: reserved.quantity
                    });
                }
                // Delete the request header if items failed
                await supabase.from('stock_requests').delete().eq('id', request.id);
                throw error;
            }

            return request;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            toast({ title: 'Permintaan Berhasil', description: 'Permintaan stok telah dikirim ke Main Office' });

            // Notify main_office about new stock request
            sendNotificationToRole('main_office', {
                title: 'Permintaan Stok Baru',
                message: 'Ada permintaan stok baru dari kasir yang perlu diproses',
                type: 'info',
                link: '/requests/approval',
            });
        },
        onError: (error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });

    // Approve Request (Main Office)
    const approveRequest = useMutation({
        mutationFn: async (data: {
            requestId: string;
            mainOfficeId: string;
            mainOfficeName: string;
        }) => {
            // 1. Get next document number
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'PMB' });

            if (fnError) throw fnError;

            const { error } = await supabase
                .from('stock_requests')
                .update({
                    status: 'pending_gudang', // Move to Gudang
                    main_office_id: data.mainOfficeId,
                    main_office_name: data.mainOfficeName,
                    main_office_approved_at: new Date().toISOString(),
                    request_number: docNum as string
                })
                .eq('id', data.requestId);

            if (error) throw error;
            return docNum;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            toast({ title: 'Permintaan Disetujui', description: 'Permintaan diteruskan ke Gudang' });

            // Notify warehouse about approved request
            sendNotificationToRole('warehouse', {
                title: 'Permintaan Stok Baru',
                message: 'Ada permintaan stok yang disetujui Main Office, siap untuk diproses',
                type: 'info',
                link: '/requests/shipments',
            });
        },
        onError: (error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });

    // Reject Request (Main Office / Common)
    const rejectRequest = useMutation({
        mutationFn: async (data: {
            requestId: string;
            reason: string;
        }) => {
            const { error } = await supabase
                .from('stock_requests')
                .update({
                    status: 'rejected',
                    rejected_reason: data.reason
                })
                .eq('id', data.requestId);

            if (error) throw error;

            // RELEASE STOCK RESERVATION
            // 1. Fetch Items
            const { data: items, error: itemsError } = await supabase
                .from('stock_request_items')
                .select('*')
                .eq('stock_request_id', data.requestId);

            if (itemsError) throw itemsError;

            // 2. Release Stock
            for (const item of items || []) {
                const { error: releaseError } = await supabase.rpc('release_stock_reservation', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity
                });
                if (releaseError) throw releaseError;
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            toast({ title: 'Permintaan Ditolak', description: 'Status berubah menjadi Ditolak' });

            // Get the request to notify the cashier
            supabase
                .from('stock_requests')
                .select('cashier_id, request_number')
                .eq('id', variables.requestId)
                .single()
                .then(({ data: req }) => {
                    if (req?.cashier_id) {
                        sendNotificationToUser(req.cashier_id, {
                            title: 'Permintaan Ditolak',
                            message: `Permintaan stok ${req.request_number || ''} telah ditolak`,
                            type: 'error',
                            link: '/requests',
                        });
                    }
                });
        },
    });

    // Resubmit Request (Cashier)
    const resubmitRequest = useMutation({
        mutationFn: async (requestId: string) => {
            const { error } = await supabase
                .from('stock_requests')
                .update({
                    status: 'pending_main_office',
                    rejected_reason: null
                })
                .eq('id', requestId);

            if (error) throw error;

            // RE-RESERVE STOCK
            // 1. Fetch Items
            const { data: items, error: itemsError } = await supabase
                .from('stock_request_items')
                .select('*')
                .eq('stock_request_id', requestId);

            if (itemsError) throw itemsError;

            // 2. Reserve Stock
            for (const item of items || []) {
                const { error: releaseError } = await supabase.rpc('reserve_stock', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity
                });
                if (releaseError) throw releaseError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            toast({ title: 'Permintaan Diajukan Ulang', description: 'Status kembali ke Pending Main Office' });
        },
    });

    // Cancel Request (Cashier - for pending requests only)
    const cancelRequest = useMutation({
        mutationFn: async (requestId: string) => {
            // First check if the request is still pending
            const { data: request, error: fetchError } = await supabase
                .from('stock_requests')
                .select('status')
                .eq('id', requestId)
                .single();

            if (fetchError) throw fetchError;

            // Only allow cancellation for pending_main_office status
            if (request.status !== 'pending_main_office') {
                throw new Error('Hanya permintaan yang masih pending yang dapat dibatalkan');
            }

            // Update status to cancelled
            const { error } = await supabase
                .from('stock_requests')
                .update({
                    status: 'cancelled'
                })
                .eq('id', requestId);

            if (error) throw error;

            // RELEASE STOCK RESERVATION
            // 1. Fetch Items
            const { data: items, error: itemsError } = await supabase
                .from('stock_request_items')
                .select('*')
                .eq('stock_request_id', requestId);

            if (itemsError) throw itemsError;

            // 2. Release Stock
            for (const item of items || []) {
                const { error: releaseError } = await supabase.rpc('release_stock_reservation', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity
                });
                if (releaseError) throw releaseError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Permintaan Dibatalkan', description: 'Permintaan stok telah dibatalkan' });
        },
        onError: (error) => {
            toast({ title: 'Gagal Membatalkan', description: error.message, variant: 'destructive' });
        },
    });

    return {
        requests,
        isLoading,
        createRequest,
        approveRequest,
        rejectRequest,
        resubmitRequest,
        cancelRequest
    };
}

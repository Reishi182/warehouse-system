import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StockReturn } from '@/types';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';

export function useStockReturns() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all stock returns
    const { data: returns = [], isLoading } = useQuery({
        queryKey: ['stock-returns'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_returns')
                .select(`
                    *,
                    items:stock_return_items(
                        *,
                        product:products(*)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching stock returns:', error);
                throw error;
            }

            return data as StockReturn[];
        },
    });

    // Create Stock Return Request (Kasir)
    const createReturn = useMutation({
        mutationFn: async (data: {
            cashierId: string;
            cashierName: string;
            reason: string;
            items: { productId: string; quantity: number; unit: string; note?: string }[];
        }) => {
            // 1. Get next document number immediately
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'RTR' });
            if (fnError) throw fnError;

            // 2. Create Return Header
            const { data: returnData, error: returnError } = await supabase
                .from('stock_returns')
                .insert({
                    cashier_id: data.cashierId,
                    cashier_name: data.cashierName,
                    reason: data.reason,
                    status: 'pending_gudang',
                    return_number: docNum as string
                })
                .select()
                .single();

            if (returnError) throw returnError;

            // 3. Create Return Items
            const itemsToInsert = data.items.map(item => ({
                stock_return_id: returnData.id,
                product_id: item.productId,
                quantity: item.quantity,
                unit: item.unit,
                note: item.note
            }));

            const { error: itemsError } = await supabase
                .from('stock_return_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return returnData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-returns'] });
            toast({ title: 'Berhasil', description: 'Pengajuan retur diteruskan langsung ke Gudang' });

            // Notify warehouse about new stock return
            sendNotificationToRole('warehouse', {
                title: 'Retur Stok Baru',
                message: 'Ada pengajuan retur barang dari toko ke gudang yang siap diproses',
                type: 'info',
                link: '/stock-return/approval',
            });
        },
        onError: (error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });

    // Approve/Process Return (Gudang)
    const approveReturn = useMutation({
        mutationFn: async (data: {
            returnId: string;
            mainOfficeId: string;
            mainOfficeName: string;
        }) => {
            // 1. Get return details
            const { data: retData, error: fetchError } = await supabase
                .from('stock_returns')
                .select('return_number')
                .eq('id', data.returnId)
                .single();

            if (fetchError) throw fetchError;
            const docNum = retData.return_number;

            // 2. Get return items to update stock
            const { data: items, error: itemsError } = await supabase
                .from('stock_return_items')
                .select('product_id, quantity')
                .eq('stock_return_id', data.returnId);

            if (itemsError) throw itemsError;

            // 3. Update stock: decrease toko, increase gudang (atomic)
            for (const item of items || []) {
                const { error: transferError } = await supabase.rpc('atomic_transfer_stock', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity,
                    p_from: 'toko',
                    p_to: 'gudang',
                });

                if (transferError) throw transferError;

                await supabase.from('stock_logs').insert({
                    product_id: item.product_id,
                    type: 'out',
                    quantity: item.quantity,
                    location: 'toko',
                    user_id: data.mainOfficeId,
                    note: `Akses cepat - Retur ke gudang - ${docNum}`,
                    reference_type: 'stock_return',
                    reference_id: data.returnId
                });

                await supabase.from('stock_logs').insert({
                    product_id: item.product_id,
                    type: 'in',
                    quantity: item.quantity,
                    location: 'gudang',
                    user_id: data.mainOfficeId,
                    note: `Akses cepat - Terima retur dari toko - ${docNum}`,
                    reference_type: 'stock_return',
                    reference_id: data.returnId
                });
            }

            // 4. Update return status directly to completed
            const { error } = await supabase
                .from('stock_returns')
                .update({
                    status: 'completed',
                    main_office_id: data.mainOfficeId,
                    main_office_name: data.mainOfficeName,
                    approved_at: new Date().toISOString()
                })
                .eq('id', data.returnId);

            if (error) throw error;
            return docNum;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['stock-returns'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Retur Selesai', description: 'Stok telah berhasil ditarik dari Toko ke Gudang' });

            // Notify cashier
            supabase
                .from('stock_returns')
                .select('cashier_id, return_number')
                .eq('id', variables.returnId)
                .single()
                .then(({ data: ret }) => {
                    if (ret?.cashier_id) {
                        sendNotificationToUser(ret.cashier_id, {
                            title: 'Retur Disetujui & Selesai',
                            message: `Pengajuan retur ${ret.return_number || ''} telah ditarik dan diproses Gudang`,
                            type: 'success',
                            link: '/stock-return',
                        });
                    }
                });

            // Notify main office for history
            sendNotificationToRole('main_office', {
                title: 'Retur Stok Selesai',
                message: 'Ada retur barang dari toko ke gudang yang baru saja diselesaikan secara instan.',
                type: 'info',
                link: '/stock-return/approval',
            });
            sendNotificationToRole('auditor', {
                title: 'Retur Stok Selesai',
                message: 'Ada retur barang dari toko ke gudang yang baru saja diselesaikan.',
                type: 'info',
                link: '/stock-return/approval',
            });
        },
        onError: (error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });

    // Reject Return (Main Office)
    const rejectReturn = useMutation({
        mutationFn: async (data: {
            returnId: string;
            reason: string;
        }) => {
            const { error } = await supabase
                .from('stock_returns')
                .update({
                    status: 'rejected',
                    rejected_reason: data.reason
                })
                .eq('id', data.returnId);

            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['stock-returns'] });
            toast({ title: 'Retur Ditolak', description: 'Status berubah menjadi Ditolak' });

            // Notify cashier
            supabase
                .from('stock_returns')
                .select('cashier_id, return_number')
                .eq('id', variables.returnId)
                .single()
                .then(({ data: ret }) => {
                    if (ret?.cashier_id) {
                        sendNotificationToUser(ret.cashier_id, {
                            title: 'Retur Ditolak',
                            message: `Pengajuan retur ${ret.return_number || ''} telah ditolak`,
                            type: 'error',
                            link: '/stock-return',
                        });
                    }
                });
        },
        onError: (error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });

    // Cancel Return (Cashier - for pending requests only)
    const cancelReturn = useMutation({
        mutationFn: async (returnId: string) => {
            const { data: ret, error: fetchError } = await supabase
                .from('stock_returns')
                .select('status')
                .eq('id', returnId)
                .single();

            if (fetchError) throw fetchError;

            // Only allow cancellation for pending_gudang status
            if (ret.status !== 'pending_gudang') {
                throw new Error('Hanya pengajuan retur yang masih diproses Gudang yang dapat dibatalkan');
            }

            const { error } = await supabase
                .from('stock_returns')
                .update({
                    status: 'cancelled'
                })
                .eq('id', returnId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-returns'] });
            toast({ title: 'Retur Dibatalkan', description: 'Pengajuan retur stok telah dibatalkan' });
        },
        onError: (error) => {
            toast({ title: 'Gagal Membatalkan', description: error.message, variant: 'destructive' });
        },
    });

    // Edit Return
    const editReturn = useMutation({
        mutationFn: async (data: {
            returnId: string;
            reason: string;
            items: { productId: string; quantity: number; unit: string; note?: string }[];
        }) => {
            const { data: ret, error: fetchError } = await supabase
                .from('stock_returns')
                .select('status')
                .eq('id', data.returnId)
                .single();

            if (fetchError) throw fetchError;

            if (ret.status !== 'pending_gudang') {
                throw new Error('Hanya pengajuan retur yang belum diproses Gudang yang dapat diedit');
            }

            const { error: deleteError } = await supabase
                .from('stock_return_items')
                .delete()
                .eq('stock_return_id', data.returnId);
                
            if (deleteError) throw deleteError;

            const { error: updateError } = await supabase
                .from('stock_returns')
                .update({ reason: data.reason })
                .eq('id', data.returnId);
                
            if (updateError) throw updateError;

            const itemsToInsert = data.items.map(item => ({
                stock_return_id: data.returnId,
                product_id: item.productId,
                quantity: item.quantity,
                unit: item.unit,
                note: item.note
            }));

            const { error: newItemsError } = await supabase
                .from('stock_return_items')
                .insert(itemsToInsert);

            if (newItemsError) throw newItemsError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-returns'] });
            toast({ title: 'Retur Diperbarui', description: 'Pengajuan retur stok berhasil diubah' });
        },
        onError: (error) => {
            toast({ title: 'Gagal Memperbarui', description: error.message, variant: 'destructive' });
        },
    });

    return {
        returns,
        isLoading,
        createReturn,
        approveReturn,
        rejectReturn,
        cancelReturn,
        editReturn
    };
}
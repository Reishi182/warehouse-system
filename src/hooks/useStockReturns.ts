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
            // 1. Create Return Header
            const { data: returnData, error: returnError } = await supabase
                .from('stock_returns')
                .insert({
                    cashier_id: data.cashierId,
                    cashier_name: data.cashierName,
                    reason: data.reason,
                    status: 'pending_main_office'
                })
                .select()
                .single();

            if (returnError) throw returnError;

            // 2. Create Return Items
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
            toast({ title: 'Berhasil', description: 'Pengajuan retur ke gudang telah dikirim ke Main Office' });

            // Notify main_office about new stock return
            sendNotificationToRole('main_office', {
                title: 'Pengajuan Retur Baru',
                message: 'Ada pengajuan retur barang ke gudang dari kasir yang perlu diproses',
                type: 'info',
                link: '/stock-return/approval',
            });
        },
        onError: (error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });

    // Approve Return (Main Office)
    const approveReturn = useMutation({
        mutationFn: async (data: {
            returnId: string;
            mainOfficeId: string;
            mainOfficeName: string;
        }) => {
            // 1. Get next document number
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'RTR' });

            if (fnError) throw fnError;

            // 2. Get return items to update stock
            const { data: items, error: itemsError } = await supabase
                .from('stock_return_items')
                .select('product_id, quantity')
                .eq('stock_return_id', data.returnId);

            if (itemsError) throw itemsError;

            // 3. Update stock: decrease toko, increase gudang
            for (const item of items || []) {
                // Bug fix #2: Read fresh stock per-field and update separately
                // to avoid overwriting concurrent changes
                const { data: tokoData, error: tokoErr } = await supabase
                    .from('products').select('stock_toko').eq('id', item.product_id).single();
                if (tokoErr) throw tokoErr;

                const { data: gudangData, error: gudangErr } = await supabase
                    .from('products').select('stock_gudang').eq('id', item.product_id).single();
                if (gudangErr) throw gudangErr;

                const newToko = Math.max(0, (tokoData.stock_toko || 0) - item.quantity);
                const newGudang = (gudangData.stock_gudang || 0) + item.quantity;

                const { error: updateError } = await supabase
                    .from('products')
                    .update({ stock_toko: newToko, stock_gudang: newGudang })
                    .eq('id', item.product_id);

                if (updateError) throw updateError;

                // Bug fix #4: Add user_id to stock_logs
                await supabase.from('stock_logs').insert({
                    product_id: item.product_id,
                    type: 'out',
                    quantity: item.quantity,
                    location: 'toko',
                    user_id: data.mainOfficeId,
                    note: `Retur ke gudang - ${docNum}`
                });

                await supabase.from('stock_logs').insert({
                    product_id: item.product_id,
                    type: 'in',
                    quantity: item.quantity,
                    location: 'gudang',
                    user_id: data.mainOfficeId,
                    note: `Retur dari toko - ${docNum}`
                });
            }

            // 4. Update return status
            const { error } = await supabase
                .from('stock_returns')
                .update({
                    status: 'approved',
                    main_office_id: data.mainOfficeId,
                    main_office_name: data.mainOfficeName,
                    approved_at: new Date().toISOString(),
                    return_number: docNum as string
                })
                .eq('id', data.returnId);

            if (error) throw error;
            return docNum;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['stock-returns'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Retur Disetujui', description: 'Stok telah dipindahkan dari Toko ke Gudang' });

            // Notify cashier
            supabase
                .from('stock_returns')
                .select('cashier_id, return_number')
                .eq('id', variables.returnId)
                .single()
                .then(({ data: ret }) => {
                    if (ret?.cashier_id) {
                        sendNotificationToUser(ret.cashier_id, {
                            title: 'Retur Disetujui',
                            message: `Pengajuan retur ${ret.return_number || ''} telah disetujui`,
                            type: 'success',
                            link: '/stock-return',
                        });
                    }
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

    return {
        returns,
        isLoading,
        createReturn,
        approveReturn,
        rejectReturn
    };
}
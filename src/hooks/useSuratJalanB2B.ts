
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useSuratJalanB2B() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all B2B Surat Jalan
    const { data: suratJalans = [], isLoading } = useQuery({
        queryKey: ['surat-jalan-b2b'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('surat_jalan')
                .select(`
                    *,
                    items:surat_jalan_items(
                        *,
                        product:products(*)
                    ),
                    issue_note:goods_issue_notes(*)
                `)
                .eq('type', 'B2B')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    // Create Surat Jalan (Main Office) -> RESERVES STOCK
    const createSuratJalan = useMutation({
        mutationFn: async (data: {
            recipientName: string;
            recipientAddress: string;
            recipientPhone?: string;
            recipientEmail?: string;
            items: { productId: string; quantity: number; unit?: string }[];
            userId: string;
        }) => {
            // 1. Get Stock Out Number (SJ)
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'SJ' });
            if (fnError) throw fnError;

            // 2. Create Header (recipient_phone and recipient_email may not exist in DB yet - they'll be null)
            const insertData: Record<string, unknown> = {
                number: docNum as string,
                recipient_name: data.recipientName,
                recipient_address: data.recipientAddress,
                type: 'B2B',
                status: 'pending_warehouse',
                created_by: data.userId
            };

            const { data: sj, error: sjError } = await supabase
                .from('surat_jalan')
                .insert(insertData)
                .select()
                .single();

            if (sjError) throw sjError;

            // 3. Insert Items & Reserve Stock
            const itemsToInsert = data.items.map(item => ({
                surat_jalan_id: sj.id,
                product_id: item.productId,
                quantity: item.quantity,
                from_location: 'gudang',
                to_location: 'customer',
                product_name: '',
                barcode: ''
            }));

            // Fetch product details to fill name/barcode
            for (let i = 0; i < itemsToInsert.length; i++) {
                const { data: prod } = await supabase.from('products').select('*').eq('id', itemsToInsert[i].product_id).single();
                if (prod) {
                    itemsToInsert[i].product_name = prod.name;
                    itemsToInsert[i].barcode = prod.barcode;
                }

                // RESERVE STOCK
                const { error: reserveError } = await supabase.rpc('reserve_stock', {
                    p_product_id: itemsToInsert[i].product_id,
                    p_quantity: itemsToInsert[i].quantity
                });
                if (reserveError) throw reserveError;
            }

            const { error: itemsError } = await supabase
                .from('surat_jalan_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return sj;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({ title: 'Surat Jalan Dibuat', description: 'Stok telah di-reserved & order dikirim ke Gudang' });
        }
    });

    // Create Goods Issue Note (Warehouse)
    const createIssueNote = useMutation({
        mutationFn: async (data: {
            suratJalanId: string;
            issuedBy: string;
        }) => {
            // 1. Get SP Number
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'SP' });
            if (fnError) throw fnError;

            // 2. Create Note
            const { error } = await supabase
                .from('goods_issue_notes')
                .insert({
                    issue_number: docNum as string,
                    surat_jalan_id: data.suratJalanId,
                    issued_by: data.issuedBy,
                    status: 'pending_auditor'
                });

            if (error) throw error;

            // 3. Update SJ Status
            await supabase.from('surat_jalan').update({ status: 'processing' }).eq('id', data.suratJalanId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({ title: 'Surat Pengeluaran Dibuat', description: 'Menunggu verifikasi Auditor' });
        }
    });

    // Verify Issue Note (Auditor) -> COMMIT STOCK
    const verifyIssueNote = useMutation({
        mutationFn: async (data: {
            issueNoteId: string;
            suratJalanId: string;
            auditorId: string;
        }) => {
            // 1. Update Note Status
            const { error: updateError } = await supabase
                .from('goods_issue_notes')
                .update({
                    status: 'approved',
                    auditor_id: data.auditorId,
                    verified_at: new Date().toISOString()
                })
                .eq('id', data.issueNoteId);

            if (updateError) throw updateError;

            // 2. Update SJ Status
            await supabase.from('surat_jalan').update({ status: 'completed' }).eq('id', data.suratJalanId);

            // 3. COMMIT STOCK (Deduct Gudang, Release Reservation)
            const { data: items } = await supabase.from('surat_jalan_items').select('*').eq('surat_jalan_id', data.suratJalanId);

            for (const item of items || []) {
                const { error: commitError } = await supabase.rpc('commit_stock_issue', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity
                });
                if (commitError) throw commitError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({ title: 'Verifikasi Berhasil', description: 'Stok telah dikurangi dari Gudang' });
        }
    });

    // Cancel Surat Jalan (Main Office) -> RELEASE RESERVATION
    const cancelSuratJalan = useMutation({
        mutationFn: async (suratJalanId: string) => {
            // 1. Release Reservation
            const { data: items } = await supabase.from('surat_jalan_items').select('*').eq('surat_jalan_id', suratJalanId);

            for (const item of items || []) {
                const { error: releaseError } = await supabase.rpc('release_stock_reservation', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity
                });
                if (releaseError) throw releaseError;
            }

            // 2. Update Status
            await supabase.from('surat_jalan').update({ status: 'cancelled' }).eq('id', suratJalanId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({ title: 'Order Dibatalkan', description: 'Stok reservation telah dilepas' });
        }
    });

    return {
        suratJalans,
        isLoading,
        createSuratJalan,
        createIssueNote,
        verifyIssueNote,
        cancelSuratJalan
    };
}

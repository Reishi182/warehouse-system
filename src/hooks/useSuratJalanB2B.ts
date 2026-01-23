
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
            sourceLocation?: 'gudang' | 'toko';
            customNumber?: string; // Custom document number
            customerPoUrl?: string; // Optional customer PO attachment
        }) => {
            const location = data.sourceLocation || 'gudang';

            // 1. Get Stock Out Number (SJ) - use custom or auto-generate
            let docNum = data.customNumber;
            if (!docNum) {
                const { data: autoNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'SJ' });
                if (fnError) throw fnError;
                docNum = autoNum as string;
            }

            // 2. Create Header with source_location and customer PO
            const insertData: Record<string, unknown> = {
                number: docNum,
                recipient_name: data.recipientName,
                recipient_address: data.recipientAddress || '',
                recipient_phone: data.recipientPhone || null,
                recipient_email: data.recipientEmail || null,
                type: 'B2B',
                status: 'pending', // Both gudang and toko go to warehouse/auditor approval
                created_by: data.userId,
                source_location: location,
            };

            // Only add customer_po_url if provided (column may not exist in older schemas)
            if (data.customerPoUrl) {
                insertData.customer_po_url = data.customerPoUrl;
            }

            const { data: sj, error: sjError } = await supabase
                .from('surat_jalan')
                .insert(insertData)
                .select()
                .single();

            if (sjError) {
                console.error('Surat Jalan insert error:', sjError);
                throw new Error(`Gagal membuat Surat Jalan: ${sjError.message}`);
            }

            // 3. Insert Items & Reserve Stock from correct location
            const itemsToInsert = data.items.map(item => ({
                surat_jalan_id: sj.id,
                product_id: item.productId,
                quantity: item.quantity,
                from_location: location,
                to_location: 'customer',
                product_name: '',
                barcode: ''
            }));

            // Fetch product details to fill name/barcode and reserve stock
            for (let i = 0; i < itemsToInsert.length; i++) {
                const { data: prod } = await supabase.from('products').select('*').eq('id', itemsToInsert[i].product_id).single();
                if (prod) {
                    itemsToInsert[i].product_name = prod.name;
                    itemsToInsert[i].barcode = prod.barcode;
                }

                // RESERVE STOCK from correct location
                if (location === 'gudang') {
                    const { error: reserveError } = await supabase.rpc('reserve_stock', {
                        p_product_id: itemsToInsert[i].product_id,
                        p_quantity: itemsToInsert[i].quantity
                    });
                    if (reserveError) throw reserveError;
                } else {
                    // For toko, also use reservation system (to be deducted on auditor approval)
                    // We'll track reserved_toko separately or directly deduct on approval
                    // For now, just validate stock is available
                    const { data: prodStock } = await supabase
                        .from('products')
                        .select('stock_toko')
                        .eq('id', itemsToInsert[i].product_id)
                        .single();

                    if (prodStock && (prodStock.stock_toko || 0) < itemsToInsert[i].quantity) {
                        throw new Error(`Stok toko tidak cukup untuk ${itemsToInsert[i].product_name}`);
                    }
                }
            }

            const { error: itemsError } = await supabase
                .from('surat_jalan_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return sj;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({ title: 'Surat Jalan Dibuat', description: 'Menunggu approval gudang & auditor' });
        }
    });

    // Process Order (Warehouse/Cashier) -> COMMIT STOCK + COMPLETE
    // Combines Issue Note creation + Verification
    const processOrder = useMutation({
        mutationFn: async (data: {
            suratJalanId: string;
            processedBy: string; // warehouse or cashier id
            sourceLocation: 'gudang' | 'toko';
        }) => {
            const { suratJalanId, processedBy, sourceLocation } = data;

            // 1. Get Stock Out Number (SP) - Generate Issue Note Number
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'SP' });
            if (fnError) throw fnError;

            // 2. Create Goods Issue Note (Auto Approved)
            const { error: noteError } = await supabase
                .from('goods_issue_notes')
                .insert({
                    issue_number: docNum as string,
                    surat_jalan_id: suratJalanId,
                    issued_by: processedBy,
                    status: 'approved', // Auto approved
                    auditor_id: processedBy, // Self-approved? or leave null? Let's use processor id or null.
                    verified_at: new Date().toISOString()
                });

            if (noteError) throw noteError;

            // 3. Update SJ Status to Completed
            await supabase.from('surat_jalan').update({ status: 'completed' }).eq('id', suratJalanId);

            // 4. COMMIT STOCK based on source location
            const { data: items } = await supabase.from('surat_jalan_items').select('*').eq('surat_jalan_id', suratJalanId);

            for (const item of items || []) {
                if (sourceLocation === 'gudang') {
                    // Gudang: use RPC to commit stock (deduct gudang, release reservation)
                    const { error: commitError } = await supabase.rpc('commit_stock_issue', {
                        p_product_id: item.product_id,
                        p_quantity: item.quantity
                    });
                    if (commitError) throw commitError;
                } else {
                    // Toko: directly deduct stock_toko
                    const { data: prod } = await supabase
                        .from('products')
                        .select('stock_toko')
                        .eq('id', item.product_id)
                        .single();

                    if (prod) {
                        const newStock = Math.max(0, (prod.stock_toko || 0) - item.quantity);
                        await supabase.from('products')
                            .update({ stock_toko: newStock })
                            .eq('id', item.product_id);

                        // Also log movement if possible (optional but good practice)
                    }
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({ title: 'Pesanan Selesai', description: 'Stok telah dikurangi dan surat jalan selesai.' });
        }
    });

    // Cancel Surat Jalan (Main Office) -> RELEASE RESERVATION
    const cancelSuratJalan = useMutation({
        mutationFn: async (suratJalanId: string) => {
            // 1. Release Reservation (only if gudang? or check reserved?)
            // Assumption: logic inside release_stock_reservation likely checks or handles it.
            // But wait, for Toko we didn't reserve.
            // So we should check source location of SJ before calling release.

            const { data: sj } = await supabase.from('surat_jalan').select('source_location').eq('id', suratJalanId).single();
            const isGudang = !sj?.source_location || sj.source_location === 'gudang';

            if (isGudang) {
                const { data: items } = await supabase.from('surat_jalan_items').select('*').eq('surat_jalan_id', suratJalanId);
                for (const item of items || []) {
                    const { error: releaseError } = await supabase.rpc('release_stock_reservation', {
                        p_product_id: item.product_id,
                        p_quantity: item.quantity
                    });
                    if (releaseError) throw releaseError;
                }
            }

            // 2. Update Status
            await supabase.from('surat_jalan').update({ status: 'cancelled' }).eq('id', suratJalanId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({ title: 'Order Dibatalkan', description: 'Status diperbarui' });
        }
    });

    return {
        suratJalans,
        isLoading,
        createSuratJalan,
        processOrder,
        cancelSuratJalan
    };
}

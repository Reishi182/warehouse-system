
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Status flow: pending_review -> approved/rejected -> processing -> completed
export type SuratJalanB2BStatus = 'pending_review' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';

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

    // Create Surat Jalan (Cashier) -> Status: pending_review
    const createSuratJalan = useMutation({
        mutationFn: async (data: {
            recipientName: string;
            recipientAddress: string;
            recipientPhone?: string;
            recipientEmail?: string;
            items: { productId: string; quantity: number; unit?: string }[];
            userId: string;
            sourceLocation?: 'gudang' | 'toko';
            customNumber?: string;
            customerPoUrl?: string;
        }) => {
            const location = data.sourceLocation || 'toko'; // Default to toko for cashier

            // 1. Get Stock Out Number (SJ) - use custom or auto-generate
            let docNum = data.customNumber;
            if (!docNum) {
                const { data: autoNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'SJ' });
                if (fnError) throw fnError;
                docNum = autoNum as string;
            }

            // 2. Create Header - status is pending_review (waiting for Main Office approval)
            const insertData: Record<string, unknown> = {
                number: docNum,
                recipient_name: data.recipientName,
                recipient_address: data.recipientAddress || '',
                recipient_phone: data.recipientPhone || null,
                recipient_email: data.recipientEmail || null,
                type: 'B2B',
                status: 'pending_review', // NEW: Waiting for Main Office review
                created_by: data.userId,
                source_location: location,
            };

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

            // 3. Insert Items (no stock reservation yet - done after processing)
            const itemsToInsert = data.items.map(item => ({
                surat_jalan_id: sj.id,
                product_id: item.productId,
                quantity: item.quantity,
                from_location: location,
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

                // Validate stock is available
                const stockField = location === 'gudang' ? 'stock_gudang' : 'stock_toko';
                const { data: prodStock } = await supabase
                    .from('products')
                    .select(stockField)
                    .eq('id', itemsToInsert[i].product_id)
                    .single();

                if (prodStock && ((prodStock as any)[stockField] || 0) < itemsToInsert[i].quantity) {
                    throw new Error(`Stok ${location} tidak cukup untuk ${itemsToInsert[i].product_name}`);
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
            toast({ title: 'Surat Jalan Dibuat', description: 'Menunggu review dari Main Office' });
        }
    });

    // Review Surat Jalan (Main Office) -> Status: approved or rejected
    const reviewSuratJalan = useMutation({
        mutationFn: async (data: {
            suratJalanId: string;
            reviewedBy: string;
            approved: boolean;
            notes?: string;
        }) => {
            const { suratJalanId, reviewedBy, approved, notes } = data;

            const updateData: Record<string, unknown> = {
                status: approved ? 'approved' : 'rejected',
                reviewed_by: reviewedBy,
                reviewed_at: new Date().toISOString(),
            };

            if (notes) {
                updateData.review_notes = notes;
            }

            const { error } = await supabase
                .from('surat_jalan')
                .update(updateData)
                .eq('id', suratJalanId);

            if (error) throw error;

            // If approved and source is gudang, reserve stock
            if (approved) {
                const { data: sj } = await supabase.from('surat_jalan').select('source_location').eq('id', suratJalanId).single();
                if (sj?.source_location === 'gudang') {
                    const { data: items } = await supabase.from('surat_jalan_items').select('*').eq('surat_jalan_id', suratJalanId);
                    for (const item of items || []) {
                        const { error: reserveError } = await supabase.rpc('reserve_stock', {
                            p_product_id: item.product_id,
                            p_quantity: item.quantity
                        });
                        if (reserveError) console.warn('Reserve stock warning:', reserveError);
                    }
                }
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({
                title: variables.approved ? 'Surat Jalan Disetujui' : 'Surat Jalan Ditolak',
                description: variables.approved ? 'Kasir dapat memproses pesanan' : 'Surat jalan telah ditolak'
            });
        }
    });

    // Process Order (Cashier after approval) -> Status: processing
    const processOrder = useMutation({
        mutationFn: async (data: {
            suratJalanId: string;
            processedBy: string;
        }) => {
            const { suratJalanId, processedBy } = data;

            // Update status to processing
            const { error } = await supabase
                .from('surat_jalan')
                .update({
                    status: 'processing',
                    processed_by: processedBy,
                    processed_at: new Date().toISOString()
                })
                .eq('id', suratJalanId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({ title: 'Pesanan Diproses', description: 'Menunggu gudang menyelesaikan pengiriman' });
        }
    });

    // Complete Order (Warehouse) -> Status: completed with proofs
    const completeOrder = useMutation({
        mutationFn: async (data: {
            suratJalanId: string;
            completedBy: string;
            deliveryPhotoUrl: string;
            receiverSignatureUrl: string;
            senderSignatureUrl: string;
            receiverName: string;
            senderName: string;
        }) => {
            const { suratJalanId, completedBy, deliveryPhotoUrl, receiverSignatureUrl, senderSignatureUrl, receiverName, senderName } = data;

            // Get source location first
            const { data: sj } = await supabase.from('surat_jalan').select('source_location').eq('id', suratJalanId).single();
            const sourceLocation = sj?.source_location || 'gudang';

            // 1. Generate Issue Note Number
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'SP' });
            if (fnError) throw fnError;

            // 2. Create Goods Issue Note
            const { error: noteError } = await supabase
                .from('goods_issue_notes')
                .insert({
                    issue_number: docNum as string,
                    surat_jalan_id: suratJalanId,
                    issued_by: completedBy,
                    status: 'approved',
                    auditor_id: completedBy,
                    verified_at: new Date().toISOString()
                });

            if (noteError) throw noteError;

            // 3. Update SJ with completion data
            await supabase.from('surat_jalan').update({
                status: 'completed',
                completed_by: completedBy,
                completed_at: new Date().toISOString(),
                delivery_photo_url: deliveryPhotoUrl,
                receiver_signature_url: receiverSignatureUrl,
                sender_signature_url: senderSignatureUrl,
                receiver_name: receiverName,
                sender_name: senderName
            }).eq('id', suratJalanId);

            // 4. Commit Stock
            const { data: items } = await supabase.from('surat_jalan_items').select('*').eq('surat_jalan_id', suratJalanId);

            for (const item of items || []) {
                if (sourceLocation === 'gudang') {
                    // Gudang: use RPC to commit stock
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
                    }
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Pesanan Selesai', description: 'Pengiriman berhasil diselesaikan dengan bukti' });
        }
    });

    // Cancel Surat Jalan
    const cancelSuratJalan = useMutation({
        mutationFn: async (suratJalanId: string) => {
            // Release reservation if any
            const { data: sj } = await supabase.from('surat_jalan').select('source_location, status').eq('id', suratJalanId).single();

            // Only release if approved and from gudang
            if (sj?.status === 'approved' && sj?.source_location === 'gudang') {
                const { data: items } = await supabase.from('surat_jalan_items').select('*').eq('surat_jalan_id', suratJalanId);
                for (const item of items || []) {
                    await supabase.rpc('release_stock_reservation', {
                        p_product_id: item.product_id,
                        p_quantity: item.quantity
                    });
                }
            }

            await supabase.from('surat_jalan').update({ status: 'cancelled' }).eq('id', suratJalanId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({ title: 'Surat Jalan Dibatalkan', description: 'Status diperbarui' });
        }
    });

    return {
        suratJalans,
        isLoading,
        createSuratJalan,
        reviewSuratJalan,
        processOrder,
        completeOrder,
        cancelSuratJalan
    };
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';

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

            // 2. Create Header - status is approved (no longer needs Main Office review)
            const insertData: Record<string, unknown> = {
                number: docNum,
                recipient_name: data.recipientName,
                recipient_address: data.recipientAddress || '',
                recipient_phone: data.recipientPhone || null,
                recipient_email: data.recipientEmail || null,
                type: 'B2B',
                status: 'completed', // Bypass Main Office review and Warehouse processing
                created_by: data.userId,
                source_location: location,
                reviewed_by: data.userId, // auto review by creator
                reviewed_at: new Date().toISOString(),
                completed_by: data.userId, // auto complete
                completed_at: new Date().toISOString(),
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
                unit: item.unit || null,
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
                const { data: prodData } = await supabase
                    .from('products')
                    .select(`${stockField}, has_multi_unit, main_unit, pcs_per_box, sell_unit`)
                    .eq('id', itemsToInsert[i].product_id)
                    .single();

                const itemUnit = itemsToInsert[i].unit;
                const actualQty = (prodData?.has_multi_unit && itemUnit === prodData?.main_unit) 
                    ? itemsToInsert[i].quantity * (prodData?.pcs_per_box || 1) 
                    : itemsToInsert[i].quantity;

                if (prodData && ((prodData as any)[stockField] || 0) < actualQty) {
                    throw new Error(`Stok ${location} tidak cukup untuk ${itemsToInsert[i].product_name}`);
                }
                
                // Temp store actualQty in the item object so we can use it for reservation later below
                (itemsToInsert[i] as any)._actualQty = actualQty;
            }

            // Strip _actualQty before insert
            const cleanItemsToInsert = itemsToInsert.map(item => {
                const { _actualQty, ...dbItem } = item as any;
                return dbItem;
            });

            const { error: itemsError } = await supabase
                .from('surat_jalan_items')
                .insert(cleanItemsToInsert);

            if (itemsError) throw itemsError;

            // Auto-deduct stock immediately (bypass warehouse)
            if (location === 'gudang') {
                for (const item of itemsToInsert) {
                    const { error: commitError } = await supabase.rpc('commit_stock_issue', {
                        p_product_id: item.product_id,
                        p_quantity: (item as any)._actualQty || item.quantity
                    });
                    if (commitError) throw new Error(`Gagal memotong stok gudang: ${commitError.message}`);

                    // Log stock-out for gudang
                    await supabase.from('stock_logs').insert({
                        product_id: item.product_id,
                        type: 'out',
                        quantity: (item as any)._actualQty || item.quantity,
                        location: 'gudang',
                        user_id: data.userId,
                        note: `Surat Jalan B2B Langsung - ${item.product_name || 'Produk'} (Input: ${item.quantity} ${item.unit || 'pcs'})`,
                    });
                }
            } else {
                // Toko stock deduction
                for (const item of itemsToInsert) {
                    const actualQty = (item as any)._actualQty || item.quantity;
                    const { data: prod } = await supabase
                        .from('products')
                        .select('stock_toko')
                        .eq('id', item.product_id)
                        .single();

                    if (prod) {
                        const currentStock = prod.stock_toko || 0;
                        if (currentStock < actualQty) {
                            throw new Error(`Stok toko tidak cukup untuk ${item.product_name || 'produk'}: tersedia ${currentStock}, dibutuhkan ${actualQty}`);
                        }
                        const newStock = currentStock - actualQty;
                        await supabase.from('products')
                            .update({ stock_toko: newStock })
                            .eq('id', item.product_id);

                        // Log stock-out for toko
                        await supabase.from('stock_logs').insert({
                            product_id: item.product_id,
                            type: 'out',
                            quantity: actualQty,
                            location: 'toko',
                            user_id: data.userId,
                            note: `Surat Jalan B2B Langsung - ${item.product_name || 'Produk'} (Input: ${item.quantity} ${item.unit || 'pcs'})`,
                        });
                    }
                }
            }

            // Generate Goods Issue Note
            const { data: spDocNum, error: spError } = await supabase.rpc('get_next_document_number', { doc_type: 'SP' });
            if (spError) throw spError;

            const { error: noteError } = await supabase
                .from('goods_issue_notes')
                .insert({
                    issue_number: spDocNum as string,
                    surat_jalan_id: sj.id,
                    issued_by: data.userId,
                    status: 'approved',
                    auditor_id: data.userId,
                    verified_at: new Date().toISOString()
                });

            if (noteError) throw noteError;

            return sj;
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Surat Jalan Selesai', description: 'Dokumen dibuat dan stok otomatis terpotong' });
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
                    const { data: items } = await supabase.from('surat_jalan_items')
                        .select('*, product:products(has_multi_unit, main_unit, pcs_per_box)')
                        .eq('surat_jalan_id', suratJalanId);
                        
                    for (const item of items || []) {
                        const actualQty = (item.product?.has_multi_unit && item.unit === item.product?.main_unit) 
                            ? item.quantity * (item.product?.pcs_per_box || 1) 
                            : item.quantity;
                            
                        const { error: reserveError } = await supabase.rpc('reserve_stock', {
                            p_product_id: item.product_id,
                            p_quantity: actualQty
                        });
                        // Bug fix #6: Throw on reserve failure instead of ignoring
                        if (reserveError) throw new Error(`Gagal reservasi stok: ${reserveError.message}`);
                    }
                }
            }
        },
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            toast({
                title: variables.approved ? 'Surat Jalan Disetujui' : 'Surat Jalan Ditolak',
                description: variables.approved ? 'Kasir dapat memproses pesanan' : 'Surat jalan telah ditolak'
            });

            // Get SJ creator and notify them
            const { data: sj } = await supabase
                .from('surat_jalan')
                .select('created_by, number')
                .eq('id', variables.suratJalanId)
                .single();

            if (sj?.created_by) {
                sendNotificationToUser(sj.created_by, {
                    title: variables.approved ? 'SJ B2B Disetujui' : 'SJ B2B Ditolak',
                    message: `Surat Jalan ${sj.number} ${variables.approved ? 'disetujui, silakan proses' : 'ditolak'}`,
                    type: variables.approved ? 'success' : 'error',
                    link: '/surat-jalan-b2b',
                });
            }

            // If approved and from gudang, notify warehouse
            if (variables.approved) {
                const { data: sjData } = await supabase
                    .from('surat_jalan')
                    .select('source_location, number')
                    .eq('id', variables.suratJalanId)
                    .single();

                if (sjData?.source_location === 'gudang') {
                    sendNotificationToRole('warehouse', {
                        title: 'SJ B2B Disetujui',
                        message: `Surat Jalan ${sjData.number} siap untuk diproses`,
                        type: 'info',
                        link: '/surat-jalan-b2b',
                    });
                }
            }
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

            // 4. Commit Stock and log to stock_logs
            const { data: items } = await supabase.from('surat_jalan_items')
                .select('*, product:products(has_multi_unit, main_unit, pcs_per_box)')
                .eq('surat_jalan_id', suratJalanId);

            for (const item of items || []) {
                const actualQty = (item.product?.has_multi_unit && item.unit === item.product?.main_unit) 
                    ? item.quantity * (item.product?.pcs_per_box || 1) 
                    : item.quantity;

                if (sourceLocation === 'gudang') {
                    // Gudang: use RPC to commit stock
                    const { error: commitError } = await supabase.rpc('commit_stock_issue', {
                        p_product_id: item.product_id,
                        p_quantity: actualQty
                    });
                    if (commitError) throw commitError;

                    // Log stock-out for gudang
                    await supabase.from('stock_logs').insert({
                        product_id: item.product_id,
                        type: 'out',
                        quantity: actualQty,
                        location: 'gudang',
                        user_id: completedBy,
                        note: `Surat Jalan B2B - ${item.product_name || 'Produk'} (Input: ${item.quantity} ${item.unit || 'pcs'})`,
                    });
                } else {
                    // Toko: directly deduct stock_toko
                    const { data: prod } = await supabase
                        .from('products')
                        .select('stock_toko')
                        .eq('id', item.product_id)
                        .single();

                    if (prod) {
                        // Bug fix #5: Validate stock before deducting
                        const currentStock = prod.stock_toko || 0;
                        if (currentStock < actualQty) {
                            throw new Error(`Stok toko tidak cukup untuk ${item.product_name || 'produk'}: tersedia ${currentStock}, dibutuhkan ${actualQty}`);
                        }
                        const newStock = currentStock - actualQty;
                        await supabase.from('products')
                            .update({ stock_toko: newStock })
                            .eq('id', item.product_id);

                        // Log stock-out for toko
                        await supabase.from('stock_logs').insert({
                            product_id: item.product_id,
                            type: 'out',
                            quantity: actualQty,
                            location: 'toko',
                            user_id: completedBy,
                            note: `Surat Jalan B2B - ${item.product_name || 'Produk'} (Input: ${item.quantity} ${item.unit || 'pcs'})`,
                        });
                    }
                }
            }
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalan-b2b'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Pesanan Selesai', description: 'Pengiriman berhasil diselesaikan dengan bukti' });

            // Notify about completed order
            await supabase.from('notifications').insert({
                title: 'Pengiriman B2B Selesai',
                message: 'Pengiriman surat jalan B2B telah selesai dengan bukti',
                type: 'success',
                link: '/surat-jalan-b2b',
            });
        }
    });

    // Cancel Surat Jalan
    const cancelSuratJalan = useMutation({
        mutationFn: async (suratJalanId: string) => {
            // Release reservation if any
            const { data: sj } = await supabase.from('surat_jalan').select('source_location, status').eq('id', suratJalanId).single();

            // Only release if approved and from gudang
            if (sj?.status === 'approved' && sj?.source_location === 'gudang') {
                const { data: items } = await supabase.from('surat_jalan_items')
                    .select('*, product:products(has_multi_unit, main_unit, pcs_per_box)')
                    .eq('surat_jalan_id', suratJalanId);
                    
                for (const item of items || []) {
                    const actualQty = (item.product?.has_multi_unit && item.unit === item.product?.main_unit) 
                        ? item.quantity * (item.product?.pcs_per_box || 1) 
                        : item.quantity;
                        
                    await supabase.rpc('release_stock_reservation', {
                        p_product_id: item.product_id,
                        p_quantity: actualQty
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

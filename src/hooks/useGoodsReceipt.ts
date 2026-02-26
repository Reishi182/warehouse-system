
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole } from '@/hooks/useRealtimeNotifications';

interface ReceivedItem {
    productId: string;
    productName: string;
    quantityShipped: number;
    quantityReceived: number;
    quantityDamaged: number;
}

export function useGoodsReceipt() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Receive Goods (Kasir) -> ADD STOCK TO TOKO based on ACTUAL RECEIVED
    const receiveGoods = useMutation({
        mutationFn: async (data: {
            requestId: string;
            shipmentId: string;
            receivedBy: string;
            receivedByName: string;
            photoFile: File;
            note?: string;
            signatureDataUrl?: string;
            items: ReceivedItem[];
        }) => {
            // 1. Upload Photo
            const fileExt = data.photoFile.name.split('.').pop();
            const fileName = `${data.requestId}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, data.photoFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);

            // 2. Upload Signature if provided
            let signatureUrl: string | null = null;
            if (data.signatureDataUrl) {
                const signatureBlob = await fetch(data.signatureDataUrl).then(r => r.blob());
                const signaturePath = `signatures/${data.requestId}-${Date.now()}.png`;

                const { error: sigError } = await supabase.storage
                    .from('receipts')
                    .upload(signaturePath, signatureBlob);

                if (!sigError) {
                    const { data: sigPublic } = supabase.storage
                        .from('receipts')
                        .getPublicUrl(signaturePath);
                    signatureUrl = sigPublic.publicUrl;
                }
            }

            // 3. Calculate discrepancy
            let totalShipped = 0;
            let totalReceived = 0;
            let totalDamaged = 0;
            const discrepancyItems: { product: string; shipped: number; received: number; damaged: number }[] = [];

            for (const item of data.items) {
                totalShipped += item.quantityShipped;
                totalReceived += item.quantityReceived;
                totalDamaged += item.quantityDamaged;

                if (item.quantityReceived !== item.quantityShipped || item.quantityDamaged > 0) {
                    discrepancyItems.push({
                        product: item.productName,
                        shipped: item.quantityShipped,
                        received: item.quantityReceived,
                        damaged: item.quantityDamaged,
                    });
                }
            }

            const hasDiscrepancy = discrepancyItems.length > 0;

            // 4. Add Stock to Toko based on RECEIVED quantity (not shipped)
            // Bug fix #8: Track stock updates for rollback
            const stockUpdated: { productId: string; goodQty: number }[] = [];

            for (const item of data.items) {
                const { data: product, error: prodError } = await supabase
                    .from('products')
                    .select('stock_toko')
                    .eq('id', item.productId)
                    .single();

                if (prodError) throw prodError;

                // Add only received qty (good condition) to stock
                const goodQty = item.quantityReceived - item.quantityDamaged;
                if (goodQty > 0) {
                    await supabase.from('products')
                        .update({ stock_toko: (product.stock_toko || 0) + goodQty })
                        .eq('id', item.productId);

                    stockUpdated.push({ productId: item.productId, goodQty });

                    // Log stock-in to stock_logs for stock history tracking
                    await supabase.from('stock_logs').insert({
                        product_id: item.productId,
                        type: 'in',
                        quantity: goodQty,
                        location: 'toko',
                        user_id: data.receivedBy,
                        note: `Terima barang dari gudang - ${item.productName}`,
                    });
                }
            }

            // 5. Get document number
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'BPB' });
            if (fnError) throw fnError;

            // 6. Create Goods Receipt Record with discrepancy info
            const { error: receiptError } = await supabase
                .from('goods_receipts')
                .insert({
                    receipt_number: docNum as string,
                    stock_request_id: data.requestId,
                    stock_shipment_id: data.shipmentId,
                    received_by: data.receivedBy,
                    photo_url: publicUrl,
                    signature_url: signatureUrl,
                    note: data.note,
                    has_discrepancy: hasDiscrepancy,
                    discrepancy_details: hasDiscrepancy ? JSON.stringify(discrepancyItems) : null,
                    total_shipped: totalShipped,
                    total_received: totalReceived,
                    total_damaged: totalDamaged,
                });

            // Bug fix #8: Rollback stock if receipt record fails
            if (receiptError) {
                for (const updated of stockUpdated) {
                    const { data: curr } = await supabase
                        .from('products')
                        .select('stock_toko')
                        .eq('id', updated.productId)
                        .single();
                    if (curr) {
                        await supabase.from('products')
                            .update({ stock_toko: Math.max(0, (curr.stock_toko || 0) - updated.goodQty) })
                            .eq('id', updated.productId);
                    }
                }
                throw receiptError;
            }

            // 7. Update Request Status
            const finalStatus = hasDiscrepancy ? 'completed_with_discrepancy' : 'completed';
            const { error: updateReqError } = await supabase
                .from('stock_requests')
                .update({ status: finalStatus })
                .eq('id', data.requestId);

            if (updateReqError) throw updateReqError;

            // 8. Notify main_office if discrepancy
            if (hasDiscrepancy) {
                const discrepancySummary = discrepancyItems
                    .map(d => `${d.product}: kirim ${d.shipped}, terima ${d.received}, rusak ${d.damaged}`)
                    .join('; ');

                await sendNotificationToRole('main_office', {
                    title: '⚠️ Selisih Penerimaan Stok',
                    message: `Penerimaan oleh ${data.receivedByName}: ${discrepancySummary}`,
                    type: 'warning',
                    link: '/requests/receipt',
                });

                await sendNotificationToRole('auditor', {
                    title: '⚠️ Selisih Penerimaan Stok',
                    message: `Penerimaan oleh ${data.receivedByName} memiliki selisih`,
                    type: 'warning',
                    link: '/requests/receipt',
                });
            }

            return { docNum, hasDiscrepancy };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            queryClient.invalidateQueries({ queryKey: ['stock-shipments'] });
            queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });

            if (result.hasDiscrepancy) {
                toast({
                    title: 'Barang Diterima (Ada Selisih)',
                    description: `Bukti ${result.docNum} dibuat. Main Office telah dinotifikasi.`,
                    variant: 'destructive'
                });
            } else {
                toast({
                    title: 'Barang Diterima',
                    description: `Bukti ${result.docNum} berhasil dibuat. Stok toko bertambah.`
                });
            }
        },
        onError: (error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        }
    });

    return { receiveGoods };
}

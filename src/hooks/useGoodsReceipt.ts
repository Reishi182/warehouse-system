
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GoodsReceipt } from '@/types';

export function useGoodsReceipt() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Receieve Goods (Kasir) -> ADD STOCK TO TOKO
    const receiveGoods = useMutation({
        mutationFn: async (data: {
            requestId: string; // to update request status
            shipmentId: string;
            receivedBy: string;
            photoFile: File;
            note?: string;
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

            // 2. Get Shipment Items to Add Stock to Toko
            const { data: shipmentItems, error: itemsError } = await supabase
                .from('stock_shipment_items')
                .select('*')
                .eq('stock_shipment_id', data.shipmentId);

            if (itemsError) throw itemsError;

            // Add Stock to Toko
            for (const item of shipmentItems || []) {
                const { data: product, error: prodError } = await supabase
                    .from('products')
                    .select('stock_toko')
                    .eq('id', item.product_id)
                    .single();

                if (prodError) throw prodError;

                await supabase.from('products')
                    .update({ stock_toko: (product.stock_toko || 0) + item.quantity_shipped })
                    .eq('id', item.product_id);
            }

            // 3. Get document number
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'BPB' });
            if (fnError) throw fnError;

            // 4. Create Goods Receipt Record
            const { error: receiptError } = await supabase
                .from('goods_receipts')
                .insert({
                    receipt_number: docNum as string,
                    stock_request_id: data.requestId,
                    stock_shipment_id: data.shipmentId,
                    received_by: data.receivedBy,
                    photo_url: publicUrl,
                    note: data.note
                });

            if (receiptError) throw receiptError;

            // 5. Update Request Status to Completed
            const { error: updateReqError } = await supabase
                .from('stock_requests')
                .update({ status: 'completed' })
                .eq('id', data.requestId);

            if (updateReqError) throw updateReqError;

            return docNum;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            queryClient.invalidateQueries({ queryKey: ['goods-receipts'] }); // if exists
            toast({ title: 'Barang Diterima', description: `Bukti ${data} berhasil dibuat. Stok toko bertambah.` });
        },
        onError: (error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        }
    });

    return { receiveGoods };
}

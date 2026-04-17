
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StockShipment } from '@/types';
import { sendNotificationToUser } from '@/hooks/useRealtimeNotifications';
import { broadcastTableChange } from '@/lib/broadcastSync';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

export function useStockShipments() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch shipments
    const { data: shipments = [], isLoading } = useQuery({
        queryKey: ['stock-shipments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_shipments')
                .select(`
          *,
          items:stock_shipment_items(
            *,
            product:products(*)
          ),
          request:stock_requests(*)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as StockShipment[];
        },
    });

    // Create Shipment (Gudang) - Bypasses Auditor now
    const createShipment = useMutation({
        mutationFn: async (data: {
            requestId: string;
            shippedBy: string;
            items: { productId: string; quantity: number; unit?: string }[];
        }) => {
            // Create shipment header
            const { data: shipment, error: shipError } = await supabase
                .from('stock_shipments')
                .insert({
                    stock_request_id: data.requestId,
                    shipped_by: data.shippedBy,
                    status: 'approved', // Auto-approve
                    auditor_id: null,
                    auditor_approved_at: new Date().toISOString()
                })
                .select()
                .single();

            if (shipError) throw shipError;

            // Insert Items
            const itemsToInsert = data.items.map(item => ({
                stock_shipment_id: shipment.id,
                product_id: item.productId,
                quantity_shipped: item.quantity,
                unit: item.unit || null
            }));

            const { error: itemsError } = await supabase
                .from('stock_shipment_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // Reduce Stock in Gudang AND Release Reservation
            for (const item of itemsToInsert) {
                // NEW: Get current stock gudang before deduction
                const { data: gudangData } = await supabase
                    .from('products')
                    .select('stock_gudang')
                    .eq('id', item.product_id)
                    .single();
                const stockGudangBefore = gudangData?.stock_gudang || 0;

                // Reduce Stock in Gudang AND Release Reservation
                const { error: commitError } = await supabase.rpc('commit_stock_issue', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity_shipped
                });

                if (commitError) throw commitError;

                // NEW: Auto-log stock history for Gudang
                await supabase.from('stock_logs').insert({
                    product_id: item.product_id,
                    type: 'out',
                    quantity: item.quantity_shipped,
                    location: 'gudang',
                    user_id: data.shippedBy,
                    note: `Akses cepat - kirim barang otomatis ke toko`,
                    reference_type: 'stock_request',
                    reference_id: data.requestId,
                    stock_before: stockGudangBefore,
                    stock_after: stockGudangBefore - item.quantity_shipped
                });

                // NEW: Get current stock toko before increment for accurate logging
                const { data: prodData } = await supabase
                    .from('products')
                    .select('stock_toko, name')
                    .eq('id', item.product_id)
                    .single();
                    
                const stockBefore = prodData?.stock_toko || 0;

                // NEW: Auto-increment Toko Stock
                const { error: incrementError } = await supabase.rpc('atomic_increment_stock', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity_shipped,
                    p_location: 'toko',
                });

                if (incrementError) throw incrementError;

                // NEW: Auto-log stock history for Toko
                await supabase.from('stock_logs').insert({
                    product_id: item.product_id,
                    type: 'in',
                    quantity: item.quantity_shipped,
                    location: 'toko',
                    user_id: data.shippedBy,
                    note: `Akses cepat - terima barang otomatis dari gudang`,
                    reference_type: 'stock_request',
                    reference_id: data.requestId,
                    stock_before: stockBefore,
                    stock_after: stockBefore + item.quantity_shipped
                });
            }

            // Update request status directly to completed
            const { error: reqUpdateError } = await supabase
                .from('stock_requests')
                .update({ status: 'completed' })
                .eq('id', data.requestId);

            if (reqUpdateError) throw reqUpdateError;

            return shipment;
        },
        onSuccess: (_data, variables) => {
            invalidateAndBroadcast(queryClient, ['stock-shipments', 'stock-requests']);
            broadcastTableChange('stock_shipments', 'INSERT', ['stock-shipments', 'stock-requests', 'products']);
            toast({ title: 'Proses Selesai', description: 'Stok gudang dikurangi & stok toko otomatis bertambah seketika' });

            // Notify Cashier about the completion
            supabase
                .from('stock_requests')
                .select('cashier_id, request_number')
                .eq('id', variables.requestId)
                .single()
                .then(({ data: req }) => {
                    if (req?.cashier_id) {
                        sendNotificationToUser(req.cashier_id, {
                            title: 'Permintaan Selesai Ditambah',
                            message: `Permintaan ${req.request_number || ''} diproses Gudang. Stok Toko telah BERHASIL DITAMBAH.`,
                            type: 'success',
                            link: '/requests',
                        });
                    }
                });
        }
    });

    // Approve Shipment (Auditor) -> REDUCE STOCK HERE
    const approveShipment = useMutation({
        mutationFn: async (data: {
            shipmentId: string;
            requestId: string;
            auditorId: string;
        }) => {
            // 1. Get shipment items to reduce stock
            const { data: shipmentItems, error: fetchError } = await supabase
                .from('stock_shipment_items')
                .select('*')
                .eq('stock_shipment_id', data.shipmentId);

            if (fetchError) throw fetchError;
            if (!shipmentItems) throw new Error("No items found");

            // 2. Reduce Stock in Gudang AND Release Reservation (Atomic Commit)
            for (const item of shipmentItems) {
                const { error: commitError } = await supabase.rpc('commit_stock_issue', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity_shipped
                });

                if (commitError) throw commitError;
            }

            // 3. Update Shipment Status
            const { error: shipUpdateError } = await supabase
                .from('stock_shipments')
                .update({
                    status: 'approved',
                    auditor_id: data.auditorId,
                    auditor_approved_at: new Date().toISOString()
                })
                .eq('id', data.shipmentId);

            if (shipUpdateError) throw shipUpdateError;

            // 4. Update Request Status to pending_receipt
            const { error: reqUpdateError } = await supabase
                .from('stock_requests')
                .update({ status: 'pending_receipt' })
                .eq('id', data.requestId);

            if (reqUpdateError) throw reqUpdateError;
        },
        onSuccess: (_data, variables) => {
            invalidateAndBroadcast(queryClient, ['stock-shipments', 'stock-requests']);
            broadcastTableChange('stock_shipments', 'UPDATE', ['stock-shipments', 'stock-requests', 'products']);
            toast({ title: 'Pengiriman Disetujui', description: 'Stok gudang telah dikurangi' });

            // Get the request to notify the cashier
            supabase
                .from('stock_requests')
                .select('cashier_id, request_number')
                .eq('id', variables.requestId)
                .single()
                .then(({ data: req }) => {
                    if (req?.cashier_id) {
                        sendNotificationToUser(req.cashier_id, {
                            title: 'Stok Dalam Perjalanan',
                            message: `Permintaan ${req.request_number || ''} telah disetujui dan barang dalam perjalanan`,
                            type: 'success',
                            link: '/stock-request/receipt',
                        });
                    }
                });
        }
    });

    // Request Revision (Auditor)
    const requestRevision = useMutation({
        mutationFn: async (data: { shipmentId: string; note: string }) => {
            const { error } = await supabase
                .from('stock_shipments')
                .update({
                    status: 'needs_revision',
                    revision_note: data.note
                })
                .eq('id', data.shipmentId);

            if (error) throw error;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['stock-shipments']);
            broadcastTableChange('stock_shipments', 'UPDATE', ['stock-shipments']);
            toast({ title: 'Revisi Diminta', description: 'Gudang perlu memperbaiki pengiriman ini' });
        }
    });

    return {
        shipments,
        isLoading,
        createShipment,
        approveShipment,
        requestRevision
    };
}

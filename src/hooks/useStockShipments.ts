
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StockShipment, StockShipmentItem } from '@/types';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';

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

    // Create Shipment (Gudang)
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
                    status: 'pending_auditor',
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

            // Update request status
            const { error: reqUpdateError } = await supabase
                .from('stock_requests')
                .update({ status: 'pending_auditor' })
                .eq('id', data.requestId);

            if (reqUpdateError) throw reqUpdateError;

            return shipment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-shipments'] });
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            toast({ title: 'Pengiriman Dibuat', description: 'Menunggu verifikasi Auditor' });

            // Notify auditor about new shipment
            sendNotificationToRole('auditor', {
                title: 'Pengiriman Baru',
                message: 'Ada pengiriman stok baru dari Gudang yang perlu diverifikasi',
                type: 'info',
                link: '/stock-request/shipments',
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
            queryClient.invalidateQueries({ queryKey: ['stock-shipments'] });
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
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
            queryClient.invalidateQueries({ queryKey: ['stock-shipments'] });
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

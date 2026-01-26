import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SuratJalan, SuratJalanItem, RequestStatus, Location } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';

// Transform database rows to SuratJalan type
function transformSuratJalan(row: any, items: any[]): SuratJalan {
    return {
        id: row.id,
        number: row.number,
        status: row.status as RequestStatus,
        created_by: row.created_by,
        created_at: row.created_at,
        approved_by: row.approved_by,
        approved_at: row.approved_at,
        rejected_reason: row.rejected_reason,
        items: items
            .filter(item => item.surat_jalan_id === row.id)
            .map(item => ({
                id: item.id,
                surat_jalan_id: item.surat_jalan_id,
                product_id: item.product_id,
                product_name: item.product_name,
                barcode: item.barcode,
                image_url: item.image_url,
                quantity: item.quantity,
                from_location: item.from_location as Location,
                to_location: item.to_location as Location,
            })),
    };
}

// Fetch all surat jalans
async function fetchSuratJalans(): Promise<SuratJalan[]> {
    const { data: suratJalans, error: sjError } = await supabase
        .from('surat_jalan')
        .select('*')
        .order('created_at', { ascending: false });

    if (sjError) throw sjError;

    const { data: items, error: itemsError } = await supabase
        .from('surat_jalan_items')
        .select('*');

    if (itemsError) throw itemsError;

    return (suratJalans || []).map(row => transformSuratJalan(row, items || []));
}

// Hook to get all surat jalans
export function useSuratJalans() {
    return useQuery({
        queryKey: ['surat-jalans'],
        queryFn: fetchSuratJalans,
    });
}

// Hook to create a surat jalan
export function useCreateSuratJalan() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            requestIds,
            requests,
            createdBy,
        }: {
            requestIds: string[];
            requests: any[];
            createdBy?: string;
        }) => {
            // Generate unique number
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const number = `SJ-${timestamp}-${randomSuffix}`;

            // Create surat jalan
            const { data: sj, error: sjError } = await supabase
                .from('surat_jalan')
                .insert({
                    number,
                    status: 'pending',
                    created_by: createdBy,
                })
                .select()
                .single();

            if (sjError) throw sjError;

            // Create items
            const selectedRequests = requests.filter(r => requestIds.includes(r.id));
            const itemsToInsert = selectedRequests.map(request => ({
                surat_jalan_id: sj.id,
                product_id: request.product_id,
                product_name: request.product?.name || 'Produk',
                barcode: request.product?.barcode || '',
                image_url: request.product?.image_url,
                quantity: request.quantity,
                from_location: request.from_location,
                to_location: request.to_location,
            }));

            const { error: itemsError } = await supabase
                .from('surat_jalan_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // Update requests with surat_jalan_id
            const { error: updateError } = await supabase
                .from('stock_out_requests')
                .update({ surat_jalan_id: sj.id })
                .in('id', requestIds);

            if (updateError) throw updateError;

            return sj;
        },
        onSuccess: (sj) => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalans'] });
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            toast({
                title: 'Surat Jalan dibuat',
                description: 'Surat jalan berhasil dibuat',
            });

            // Notify auditor for approval
            sendNotificationToRole('auditor', {
                title: '📦 Surat Jalan Baru',
                message: `Surat Jalan ${sj.number} menunggu persetujuan`,
                type: 'info',
                link: '/surat-jalan/approval',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal membuat surat jalan',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook to update surat jalan status
export function useUpdateSuratJalanStatus() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            id,
            status,
            reason,
            approvedBy,
            suratJalan,
        }: {
            id: string;
            status: RequestStatus;
            reason?: string;
            approvedBy?: string;
            suratJalan?: SuratJalan;
        }) => {
            const updateData: any = { status };
            if (status === 'rejected' && reason) {
                updateData.rejected_reason = reason;
            }
            if ((status === 'approved' || status === 'completed') && approvedBy) {
                updateData.approved_by = approvedBy;
                updateData.approved_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('surat_jalan')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // If approved, process stock movement
            if (status === 'approved' && suratJalan) {
                for (const item of suratJalan.items) {
                    // Decrease from source
                    const fromField = `stock_${item.from_location}`;
                    const { data: product } = await supabase
                        .from('products')
                        .select('*')
                        .eq('id', item.product_id)
                        .single();

                    if (product) {
                        const fromStock = Math.max(0, (product[fromField] || 0) - item.quantity);
                        const updateData: any = { [fromField]: fromStock };

                        // Only increase destination stock if it's an internal location
                        if (['gudang', 'toko'].includes(item.to_location)) {
                            const toField = `stock_${item.to_location}`;
                            const toStock = (product[toField] || 0) + item.quantity;
                            updateData[toField] = toStock;
                        }

                        await supabase
                            .from('products')
                            .update(updateData)
                            .eq('id', item.product_id);

                        // Log the movement
                        await supabase.from('stock_logs').insert([
                            {
                                product_id: item.product_id,
                                type: 'out',
                                quantity: item.quantity,
                                location: item.from_location,
                                note: `Transfer ke ${item.to_location} via ${suratJalan.number}`,
                            },
                            {
                                product_id: item.product_id,
                                type: 'in',
                                quantity: item.quantity,
                                location: item.to_location,
                                note: `Transfer dari ${item.from_location} via ${suratJalan.number}`,
                            },
                        ]);
                    }
                }
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['surat-jalans'] });
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-logs'] });

            const statusText = variables.status === 'approved' ? 'disetujui' :
                variables.status === 'rejected' ? 'ditolak' :
                    'diperbarui';
            toast({
                title: `Surat Jalan ${statusText}`,
                description: `Status surat jalan berhasil ${statusText}`,
            });

            // Notify the creator about approval/rejection
            if (variables.suratJalan?.created_by) {
                if (variables.status === 'approved') {
                    sendNotificationToUser(variables.suratJalan.created_by, {
                        title: '✅ Surat Jalan Disetujui',
                        message: `Surat Jalan ${variables.suratJalan.number} telah disetujui`,
                        type: 'success',
                        link: '/surat-jalan',
                    });
                } else if (variables.status === 'rejected') {
                    sendNotificationToUser(variables.suratJalan.created_by, {
                        title: '❌ Surat Jalan Ditolak',
                        message: `Surat Jalan ${variables.suratJalan.number} ditolak: ${variables.reason || 'Tidak ada alasan'}`,
                        type: 'error',
                        link: '/surat-jalan',
                    });
                }
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal memperbarui status',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

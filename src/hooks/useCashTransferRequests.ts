import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CashTransferRequest, CashTransferRequestStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole, sendNotificationToUser } from '@/hooks/useRealtimeNotifications';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

// Transform database row to CashTransferRequest type
function transformRequest(row: any): CashTransferRequest {
    return {
        id: row.id,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        amount: parseFloat(row.amount),
        note: row.note,
        status: row.status as CashTransferRequestStatus,
        requested_at: row.requested_at,
        auditor_id: row.auditor_id,
        auditor_name: row.auditor_name,
        processed_at: row.processed_at,
        rejected_reason: row.rejected_reason,
        created_at: row.created_at,
    };
}

// Fetch all cash transfer requests
async function fetchCashTransferRequests(): Promise<CashTransferRequest[]> {
    const { data, error } = await supabase
        .from('cash_transfer_requests')
        .select('*')
        .order('requested_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformRequest);
}

// Hook to get all cash transfer requests
export function useCashTransferRequests() {
    return useQuery({
        queryKey: ['cash-transfer-requests'],
        queryFn: fetchCashTransferRequests,
    });
}

// Hook to create a cash transfer request (Cashier)
export function useCreateCashTransferRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            amount,
            note,
            cashierId,
            cashierName,
        }: {
            amount: number;
            note?: string | null;
            cashierId?: string;
            cashierName: string;
        }) => {
            const { data, error } = await supabase
                .from('cash_transfer_requests')
                .insert({
                    cashier_id: cashierId,
                    cashier_name: cashierName,
                    amount,
                    note,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) throw error;
            return transformRequest(data);
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['cash-transfer-requests']);
            toast({
                title: 'Permintaan setoran dibuat',
                description: 'Menunggu persetujuan Auditor',
            });

            // Notify auditor about new cash transfer request
            sendNotificationToRole('auditor', {
                title: 'Setoran Kas Baru',
                message: 'Ada permintaan setoran kas baru yang perlu diproses',
                type: 'info',
                link: '/cash-transfer',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal membuat permintaan',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook to approve a cash transfer request (Auditor)
export function useApproveCashTransferRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            requestId,
            auditorId,
            auditorName,
        }: {
            requestId: string;
            auditorId?: string;
            auditorName: string;
        }) => {
            // Get the request details first
            const { data: request, error: fetchError } = await supabase
                .from('cash_transfer_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (fetchError) throw fetchError;

            // Bug fix #16: Step 1 — Update request status
            const { error: updateError } = await supabase
                .from('cash_transfer_requests')
                .update({
                    status: 'approved',
                    auditor_id: auditorId,
                    auditor_name: auditorName,
                    processed_at: new Date().toISOString(),
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Step 2: Create the actual cash transfer record
            const today = new Date().toISOString().slice(0, 10);
            const { error: transferError } = await supabase
                .from('cash_transfers')
                .insert({
                    cashier_id: request.cashier_id,
                    cashier_name: request.cashier_name,
                    amount: request.amount,
                    transfer_date: today,
                    note: request.note ? `${request.note} (Diterima oleh ${auditorName})` : `Diterima oleh ${auditorName}`,
                });

            if (transferError) {
                // Rollback: revert request status to pending
                await supabase
                    .from('cash_transfer_requests')
                    .update({ status: 'pending', auditor_id: null, auditor_name: null, processed_at: null } as any)
                    .eq('id', requestId);
                throw transferError;
            }

            // Step 3: Auto-create entry in other_transactions (Transaksi Umum)
            const { error: otherTransactionError } = await supabase
                .from('other_transactions')
                .insert({
                    transaction_date: today,
                    type: 'income',
                    category: 'Setoran Kas',
                    amount: request.amount,
                    description: `Setoran kas dari ${request.cashier_name}${request.note ? ` - ${request.note}` : ''}`,
                    created_by: auditorId,
                    created_by_name: auditorName,
                });

            // Don't throw on other_transaction error — cash transfer already created
            if (otherTransactionError) {
                console.error('[CashTransferRequest] Failed to create other_transaction:', otherTransactionError);
            }
        },
        onSuccess: (_data, variables) => {
            invalidateAndBroadcast(queryClient, ['cash-transfer-requests', 'cash-transfers', 'other_transactions']);
            toast({
                title: 'Setoran diterima',
                description: 'Setoran berhasil dikonfirmasi dan dicatat ke transaksi umum',
            });

            // Get the request to notify the cashier
            supabase
                .from('cash_transfer_requests')
                .select('cashier_id, amount')
                .eq('id', variables.requestId)
                .single()
                .then(({ data: req }) => {
                    if (req?.cashier_id) {
                        sendNotificationToUser(req.cashier_id, {
                            title: 'Setoran Disetujui',
                            message: `Setoran kas Rp ${req.amount?.toLocaleString('id-ID')} telah disetujui`,
                            type: 'success',
                            link: '/cash-transfer',
                        });
                    }
                });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menerima setoran',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook to reject a cash transfer request (Auditor)
export function useRejectCashTransferRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            requestId,
            reason,
            auditorId,
            auditorName,
        }: {
            requestId: string;
            reason: string;
            auditorId?: string;
            auditorName: string;
        }) => {
            const { error } = await supabase
                .from('cash_transfer_requests')
                .update({
                    status: 'rejected',
                    auditor_id: auditorId,
                    auditor_name: auditorName,
                    processed_at: new Date().toISOString(),
                    rejected_reason: reason,
                })
                .eq('id', requestId);

            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            invalidateAndBroadcast(queryClient, ['cash-transfer-requests']);
            toast({
                title: 'Setoran ditolak',
                description: 'Permintaan setoran berhasil ditolak',
            });

            // Get the request to notify the cashier
            supabase
                .from('cash_transfer_requests')
                .select('cashier_id, amount')
                .eq('id', variables.requestId)
                .single()
                .then(({ data: req }) => {
                    if (req?.cashier_id) {
                        sendNotificationToUser(req.cashier_id, {
                            title: 'Setoran Ditolak',
                            message: `Setoran kas Rp ${req.amount?.toLocaleString('id-ID')} ditolak`,
                            type: 'error',
                            link: '/cash-transfer',
                        });
                    }
                });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menolak setoran',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

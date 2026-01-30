import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CashTransfer } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cashTransferValidation, validateNote } from '@/lib/validation';
import { enforceRateLimit } from '@/lib/rateLimiter';

// Transform database row to CashTransfer type
function transformCashTransfer(row: any): CashTransfer {
    return {
        id: row.id,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        amount: row.amount,
        transfer_date: row.transfer_date,
        created_at: row.created_at,
        note: row.note,
    };
}

// Fetch all cash transfers
async function fetchCashTransfers(): Promise<CashTransfer[]> {
    const { data, error } = await supabase
        .from('cash_transfers')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformCashTransfer);
}

// Hook to get all cash transfers
export function useCashTransfers() {
    return useQuery({
        queryKey: ['cash-transfers'],
        queryFn: fetchCashTransfers,
    });
}

// Hook to create a cash transfer
export function useCreateCashTransfer() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            amount,
            transferDate,
            note,
            cashierId,
            cashierName,
        }: {
            amount: number;
            transferDate?: string;
            note?: string | null;
            cashierId?: string;
            cashierName: string;
        }) => {
            // Security: Rate limiting
            enforceRateLimit('cashTransfer', 'Terlalu banyak request, coba lagi nanti');

            // Security: Validate inputs
            if (!cashTransferValidation.validateAmount(amount)) {
                throw new Error('Jumlah transfer tidak valid (harus > 0 dan <= 1 miliar)');
            }
            if (transferDate && !cashTransferValidation.validateDate(transferDate)) {
                throw new Error('Format tanggal tidak valid');
            }

            // Sanitize note
            const sanitizedNote = validateNote(note);

            const today = new Date().toISOString().slice(0, 10);

            const { data, error } = await supabase
                .from('cash_transfers')
                .insert({
                    cashier_id: cashierId,
                    cashier_name: cashierName,
                    amount,
                    transfer_date: transferDate || today,
                    note,
                })
                .select()
                .single();

            if (error) throw error;
            return transformCashTransfer(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-transfers'] });
            toast({
                title: 'Setoran berhasil',
                description: 'Setoran cash berhasil dicatat',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal mencatat setoran',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

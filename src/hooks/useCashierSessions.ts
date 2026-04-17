import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CashierSession } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

function transformSession(row: any): CashierSession {
    return {
        id: row.id,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        opening_cash: row.opening_cash,
        session_date: row.session_date,
        note: row.note,
        created_at: row.created_at,
    };
}

async function fetchCashierSessions(date?: string): Promise<CashierSession[]> {
    let query = supabase
        .from('cashier_sessions')
        .select('*')
        .order('created_at', { ascending: false });

    if (date) {
        query = query.eq('session_date', date);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(transformSession);
}

export function useCashierSessions(date?: string) {
    return useQuery({
        queryKey: ['cashier-sessions', date],
        queryFn: () => fetchCashierSessions(date),
    });
}

export function useCreateCashierSession() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: {
            cashier_id?: string;
            cashier_name: string;
            opening_cash: number;
            session_date?: string;
            note?: string;
        }) => {
            if (input.opening_cash < 0) {
                throw new Error('Modal awal tidak boleh negatif');
            }

            const today = new Date().toISOString().slice(0, 10);

            const { data, error } = await supabase
                .from('cashier_sessions')
                .insert({
                    cashier_id: input.cashier_id,
                    cashier_name: input.cashier_name,
                    opening_cash: input.opening_cash,
                    session_date: input.session_date || today,
                    note: input.note || null,
                })
                .select()
                .single();

            if (error) throw error;
            return transformSession(data);
        },
        onSuccess: (data) => {
            invalidateAndBroadcast(queryClient, ['cashier-sessions', 'cash-flow']);
            toast({
                title: 'Modal awal dicatat',
                description: `Modal Rp ${data.opening_cash.toLocaleString('id-ID')} untuk ${data.cashier_name}`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal mencatat modal awal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

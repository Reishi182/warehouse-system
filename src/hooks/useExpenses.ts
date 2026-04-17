import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Expense, ExpenseCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

function transformExpense(row: any): Expense {
    return {
        id: row.id,
        category: row.category as ExpenseCategory,
        amount: row.amount,
        description: row.description,
        expense_date: row.expense_date,
        payment_method: row.payment_method,
        created_by: row.created_by,
        created_by_name: row.created_by_name,
        created_at: row.created_at,
    };
}

async function fetchExpenses(startDate?: string, endDate?: string): Promise<Expense[]> {
    let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

    if (startDate) {
        query = query.gte('expense_date', startDate);
    }
    if (endDate) {
        query = query.lte('expense_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(transformExpense);
}

export function useExpenses(startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['expenses', startDate, endDate],
        queryFn: () => fetchExpenses(startDate, endDate),
    });
}

export function useCreateExpense() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: {
            category: ExpenseCategory;
            amount: number;
            description?: string;
            expense_date?: string;
            payment_method: 'cash' | 'transfer';
            created_by?: string;
            created_by_name: string;
        }) => {
            if (input.amount <= 0) {
                throw new Error('Jumlah harus lebih dari 0');
            }

            const today = new Date().toISOString().slice(0, 10);

            const { data, error } = await supabase
                .from('expenses')
                .insert({
                    category: input.category,
                    amount: input.amount,
                    description: input.description || null,
                    expense_date: input.expense_date || today,
                    payment_method: input.payment_method,
                    created_by: input.created_by,
                    created_by_name: input.created_by_name,
                })
                .select()
                .single();

            if (error) throw error;
            return transformExpense(data);
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['expenses', 'cash-flow']);
            toast({
                title: 'Pengeluaran dicatat',
                description: 'Pengeluaran berhasil ditambahkan',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal mencatat pengeluaran',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

export function useDeleteExpense() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidateAndBroadcast(queryClient, ['expenses', 'cash-flow']);
            toast({
                title: 'Pengeluaran dihapus',
                description: 'Data pengeluaran berhasil dihapus',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menghapus',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

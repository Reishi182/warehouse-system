import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OtherTransaction } from '@/types';
import { useToast } from './use-toast';

export const useOtherTransactions = () => {
    return useQuery({
        queryKey: ['other_transactions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('other_transactions')
                .select('*')
                .order('transaction_date', { ascending: false });

            if (error) throw error;
            return data as OtherTransaction[];
        },
    });
};

export const useCreateOtherTransaction = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (transaction: {
            type: 'income' | 'expense';
            category: string;
            amount: number;
            description?: string;
            proof_url?: string;
            created_by: string;
            created_by_name: string;
            transaction_date: string;
        }) => {
            const { data, error } = await supabase
                .from('other_transactions')
                .insert([transaction])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['other_transactions'] });
            toast({
                title: 'Transaksi berhasil disimpan',
                description: 'Data transaksi telah ditambahkan ke sistem',
            });
        },
        onError: (error) => {
            console.error('Error creating transaction:', error);
            toast({
                title: 'Gagal menyimpan transaksi',
                description: 'Terjadi kesalahan saat menyimpan data',
                variant: 'destructive',
            });
        },
    });
};

export const useDeleteOtherTransaction = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('other_transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['other_transactions'] });
            toast({
                title: 'Transaksi dihapus',
                description: 'Data transaksi berhasil dihapus',
            });
        },
        onError: (error) => {
            console.error('Error deleting transaction:', error);
            toast({
                title: 'Gagal menghapus transaksi',
                description: 'Terjadi kesalahan saat menghapus data',
                variant: 'destructive',
            });
        },
    });
};

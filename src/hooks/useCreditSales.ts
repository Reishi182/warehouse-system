import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sale, PaymentMethod } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Fetch credit sales (unsettled)
async function fetchCreditSales(): Promise<Sale[]> {
    const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('is_credit', true)
        .is('credit_settled_at', null)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
        id: row.id,
        sale_number: row.sale_number,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        payment_method: row.payment_method as PaymentMethod,
        stock_location: row.stock_location,
        total_amount: row.total_amount,
        order_discount: row.order_discount || 0,
        amount_paid: row.amount_paid || 0,
        change_amount: row.change_amount || 0,
        is_credit: row.is_credit,
        credit_customer_name: row.credit_customer_name,
        credit_settled_at: row.credit_settled_at,
        credit_payment_method: row.credit_payment_method,
        created_at: row.created_at,
        items: (row.sale_items || []).map((item: any) => ({
            id: item.id,
            sale_id: item.sale_id,
            product_id: item.product_id,
            product_name: item.product_name,
            barcode: item.barcode,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0,
            subtotal: item.subtotal,
        })),
    }));
}

// Hook to get unsettled credit sales
export function useCreditSales() {
    return useQuery({
        queryKey: ['credit-sales'],
        queryFn: fetchCreditSales,
    });
}

// Hook to settle a credit sale
export function useSettleCreditSale() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            saleId,
            paymentMethod,
        }: {
            saleId: string;
            paymentMethod: PaymentMethod;
        }) => {
            // First fetch total_amount so we can set amount_paid correctly
            const { data: saleData, error: fetchError } = await supabase
                .from('sales')
                .select('total_amount')
                .eq('id', saleId)
                .single();

            if (fetchError) throw fetchError;

            const { data, error } = await supabase
                .from('sales')
                .update({
                    credit_settled_at: new Date().toISOString(),
                    credit_payment_method: paymentMethod,
                    // Update amount_paid to match total since it's now paid
                    amount_paid: saleData?.total_amount || 0,
                    change_amount: 0,
                } as any)
                .eq('id', saleId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['credit-sales'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            toast({
                title: 'Piutang dilunasi',
                description: `Piutang ${data.sale_number} atas nama ${data.credit_customer_name} berhasil dilunasi`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal melunasi piutang',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

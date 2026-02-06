import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleItem, PaymentMethod, Location } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { saleValidation, validateUUID } from '@/lib/validation';
import { enforceRateLimit } from '@/lib/rateLimiter';

// Transform database rows to Sale type
function transformSale(row: any, items: SaleItem[]): Sale {
    return {
        id: row.id,
        sale_number: row.sale_number,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        payment_method: row.payment_method as PaymentMethod,
        stock_location: row.stock_location as Location,
        total_amount: row.total_amount,
        order_discount: row.order_discount || 0,
        amount_paid: row.amount_paid || 0,
        change_amount: row.change_amount || 0,
        // Credit transaction fields
        is_credit: row.is_credit || false,
        credit_customer_name: row.credit_customer_name,
        credit_settled_at: row.credit_settled_at,
        credit_payment_method: row.credit_payment_method as PaymentMethod | null,
        created_at: row.created_at,
        items: items.filter(item => item.sale_id === row.id),
    };
}

// Fetch all sales
async function fetchSales(): Promise<Sale[]> {
    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select('*');

    if (itemsError) throw itemsError;

    const saleItems: SaleItem[] = (items || []).map((item: any) => ({
        id: item.id,
        sale_id: item.sale_id,
        product_id: item.product_id,
        product_name: item.product_name,
        barcode: item.barcode,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
        subtotal: item.subtotal,
    }));

    return (sales || []).map(row => transformSale(row, saleItems));
}

// Hook to get all sales
export function useSales() {
    return useQuery({
        queryKey: ['sales'],
        queryFn: fetchSales,
    });
}

// Hook to create a sale
export function useCreateSale() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            paymentMethod,
            stockLocation,
            items,
            cashierId,
            cashierName,
            products,
            isCredit,
            creditCustomerName,
        }: {
            paymentMethod: PaymentMethod;
            stockLocation: Location;
            items: Array<{ productId: string; quantity: number }>;
            cashierId?: string;
            cashierName: string;
            products: any[];
            isCredit?: boolean;
            creditCustomerName?: string;
        }) => {
            // Security: Rate limiting
            enforceRateLimit('createSale', 'Terlalu banyak transaksi, coba lagi nanti');

            // Security: Validate inputs
            if (!saleValidation.validatePaymentMethod(paymentMethod)) {
                throw new Error('Metode pembayaran tidak valid');
            }
            if (!saleValidation.validateStockLocation(stockLocation)) {
                throw new Error('Lokasi stok tidak valid');
            }
            if (!saleValidation.validateItems(items)) {
                throw new Error('Jumlah item tidak valid (min 1, max 100)');
            }
            for (const item of items) {
                if (!validateUUID(item.productId)) {
                    throw new Error('ID produk tidak valid');
                }
                if (!saleValidation.validateQuantity(item.quantity)) {
                    throw new Error(`Kuantitas tidak valid: ${item.quantity}`);
                }
            }

            // Generate sale number
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const saleNumber = `INV-${timestamp}-${randomSuffix}`;

            // Calculate items with prices
            const saleItems = items.map(item => {
                const product = products.find(p => p.id === item.productId);
                const price = product?.price || 0;
                return {
                    product_id: item.productId,
                    product_name: product?.name || 'Produk',
                    barcode: product?.barcode || '',
                    quantity: item.quantity,
                    price,
                    subtotal: price * item.quantity,
                };
            });

            const totalAmount = saleItems.reduce((acc, item) => acc + item.subtotal, 0);

            // Create sale
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    sale_number: saleNumber,
                    cashier_id: cashierId,
                    cashier_name: cashierName,
                    payment_method: paymentMethod,
                    stock_location: stockLocation,
                    total_amount: totalAmount,
                    is_credit: isCredit || false,
                    credit_customer_name: isCredit ? creditCustomerName : null,
                })
                .select()
                .single();

            if (saleError) throw saleError;

            // Create sale items
            const itemsToInsert = saleItems.map(item => ({
                ...item,
                sale_id: sale.id,
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // Update stock and create logs
            for (const item of items) {
                const stockField = `stock_${stockLocation}`;
                const { data: product } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', item.productId)
                    .single();

                if (product) {
                    const newStock = Math.max(0, (product[stockField] || 0) - item.quantity);
                    await supabase
                        .from('products')
                        .update({ [stockField]: newStock })
                        .eq('id', item.productId);

                    await supabase.from('stock_logs').insert({
                        product_id: item.productId,
                        type: 'out',
                        quantity: item.quantity,
                        location: stockLocation,
                        user_id: cashierId,
                        note: `Penjualan ${saleNumber}`,
                    });
                }
            }

            return sale;
        },
        onSuccess: (sale: any) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
            queryClient.invalidateQueries({ queryKey: ['credit-sales'] });
            toast({
                title: sale.is_credit ? 'Piutang berhasil dicatat' : 'Penjualan berhasil',
                description: sale.is_credit
                    ? `Piutang atas nama ${sale.credit_customer_name} sebesar Rp ${sale.total_amount.toLocaleString('id-ID')}`
                    : 'Transaksi penjualan berhasil dicatat',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal mencatat penjualan',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

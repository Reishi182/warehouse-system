import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CustomerExchange, Location, ItemCondition, Sale } from '@/types';
import { sendNotificationToRole } from '@/hooks/useRealtimeNotifications';

interface ReturnedItemInput {
    productId: string;
    productName: string;
    barcode?: string;
    quantity: number;
    originalPrice: number;
    condition: ItemCondition;
    conditionNote?: string;
}

interface NewItemInput {
    productId: string;
    productName: string;
    barcode?: string;
    quantity: number;
    price: number;
}

interface CreateExchangeInput {
    originalSaleId: string;
    originalSaleNumber: string;
    cashierId: string;
    cashierName: string;
    stockLocation: Location;
    returnedItems: ReturnedItemInput[];
    newItems: NewItemInput[];
    reason?: string;
    note?: string;
    amountPaid: number;
}

export function useCustomerExchange() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all exchanges
    const { data: exchanges = [], isLoading } = useQuery({
        queryKey: ['customer-exchanges'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('customer_exchanges')
                .select(`
                    *,
                    returned_items:exchange_returned_items(
                        *,
                        product:products(*)
                    ),
                    new_items:exchange_new_items(
                        *,
                        product:products(*)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching customer exchanges:', error);
                throw error;
            }

            return data as CustomerExchange[];
        },
    });

    // Search sale by sale number (for finding original transaction)
    const searchSale = async (saleNumber: string): Promise<Sale | null> => {
        // Check if sale is within 1 day
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data, error } = await supabase
            .from('sales')
            .select(`
                *,
                items:sale_items(*)
            `)
            .eq('sale_number', saleNumber)
            .gte('created_at', oneDayAgo.toISOString())
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows found or sale is too old
                return null;
            }
            throw error;
        }

        return data as Sale;
    };

    // Check if a sale item has already been exchanged
    const checkAlreadyExchanged = async (saleId: string, productId: string): Promise<boolean> => {
        const { data, error } = await supabase
            .from('customer_exchanges')
            .select(`
                id,
                returned_items:exchange_returned_items(product_id)
            `)
            .eq('original_sale_id', saleId);

        if (error) throw error;

        // Check if this product was already returned in any exchange
        for (const exchange of data || []) {
            const returnedItems = (exchange as any).returned_items || [];
            if (returnedItems.some((item: any) => item.product_id === productId)) {
                return true;
            }
        }

        return false;
    };

    // Create Exchange
    const createExchange = useMutation({
        mutationFn: async (input: CreateExchangeInput) => {
            // Calculate values
            const originalItemValue = input.returnedItems.reduce(
                (sum, item) => sum + (item.originalPrice * item.quantity), 0
            );
            const newItemValue = input.newItems.reduce(
                (sum, item) => sum + (item.price * item.quantity), 0
            );
            const differenceAmount = newItemValue - originalItemValue;

            // Calculate change
            let changeGiven = 0;
            if (differenceAmount > 0) {
                // Customer needs to pay more
                changeGiven = input.amountPaid - differenceAmount;
            } else {
                // Customer gets refund (difference is negative, so refund = -difference)
                changeGiven = -differenceAmount;
            }

            // 1. Get next document number
            const { data: docNum, error: fnError } = await supabase.rpc('get_next_document_number', { doc_type: 'EXC' });
            if (fnError) throw fnError;

            // 2. Create exchange header
            const { data: exchangeData, error: exchangeError } = await supabase
                .from('customer_exchanges')
                .insert({
                    exchange_number: docNum as string,
                    original_sale_id: input.originalSaleId,
                    original_sale_number: input.originalSaleNumber,
                    cashier_id: input.cashierId,
                    cashier_name: input.cashierName,
                    stock_location: input.stockLocation,
                    original_item_value: originalItemValue,
                    new_item_value: newItemValue,
                    difference_amount: differenceAmount,
                    amount_paid: differenceAmount > 0 ? input.amountPaid : 0,
                    change_given: changeGiven,
                    reason: input.reason,
                    note: input.note
                })
                .select()
                .single();

            if (exchangeError) throw exchangeError;

            // 3. Create returned items
            const returnedItemsToInsert = input.returnedItems.map(item => ({
                exchange_id: exchangeData.id,
                product_id: item.productId,
                product_name: item.productName,
                barcode: item.barcode,
                quantity: item.quantity,
                original_price: item.originalPrice,
                subtotal: item.originalPrice * item.quantity,
                condition: item.condition,
                condition_note: item.conditionNote
            }));

            const { error: returnedError } = await supabase
                .from('exchange_returned_items')
                .insert(returnedItemsToInsert);

            if (returnedError) throw returnedError;

            // 4. Create new items
            const newItemsToInsert = input.newItems.map(item => ({
                exchange_id: exchangeData.id,
                product_id: item.productId,
                product_name: item.productName,
                barcode: item.barcode,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity
            }));

            const { error: newError } = await supabase
                .from('exchange_new_items')
                .insert(newItemsToInsert);

            if (newError) throw newError;

            // 5. Update stock
            // Return items back to stock (increase)
            for (const item of input.returnedItems) {
                const stockColumn = input.stockLocation === 'gudang' ? 'stock_gudang' : 'stock_toko';

                const { data: product, error: prodError } = await supabase
                    .from('products')
                    .select(stockColumn)
                    .eq('id', item.productId)
                    .single();

                if (prodError) throw prodError;

                const currentStock = (product as any)[stockColumn] || 0;

                const { error: updateError } = await supabase
                    .from('products')
                    .update({ [stockColumn]: currentStock + item.quantity })
                    .eq('id', item.productId);

                if (updateError) throw updateError;

                // Log stock in
                await supabase.from('stock_logs').insert({
                    product_id: item.productId,
                    type: 'in',
                    quantity: item.quantity,
                    location: input.stockLocation,
                    note: `Tukar barang - ${docNum} (retur)`
                });
            }

            // Deduct new items from stock (decrease)
            for (const item of input.newItems) {
                const stockColumn = input.stockLocation === 'gudang' ? 'stock_gudang' : 'stock_toko';

                const { data: product, error: prodError } = await supabase
                    .from('products')
                    .select(stockColumn)
                    .eq('id', item.productId)
                    .single();

                if (prodError) throw prodError;

                const currentStock = (product as any)[stockColumn] || 0;

                const { error: updateError } = await supabase
                    .from('products')
                    .update({ [stockColumn]: Math.max(0, currentStock - item.quantity) })
                    .eq('id', item.productId);

                if (updateError) throw updateError;

                // Log stock out
                await supabase.from('stock_logs').insert({
                    product_id: item.productId,
                    type: 'out',
                    quantity: item.quantity,
                    location: input.stockLocation,
                    note: `Tukar barang - ${docNum} (pengganti)`
                });
            }

            // 6. Mark sale items as exchanged
            for (const item of input.returnedItems) {
                // Find the sale_item by product_id and sale_id
                const { data: saleItems, error: findError } = await supabase
                    .from('sale_items')
                    .select('id, exchanged_qty')
                    .eq('sale_id', input.originalSaleId)
                    .eq('product_id', item.productId);

                if (findError) throw findError;

                if (saleItems && saleItems.length > 0) {
                    const saleItem = saleItems[0];
                    const newExchangedQty = (saleItem.exchanged_qty || 0) + item.quantity;

                    const { error: updateError } = await supabase
                        .from('sale_items')
                        .update({
                            exchanged: true,
                            exchanged_qty: newExchangedQty,
                            exchange_id: exchangeData.id
                        })
                        .eq('id', saleItem.id);

                    if (updateError) throw updateError;
                }
            }

            // 7. Update has_exchange flag on the parent sale
            const { error: saleUpdateError } = await supabase
                .from('sales')
                .update({ has_exchange: true })
                .eq('id', input.originalSaleId);

            if (saleUpdateError) throw saleUpdateError;

            return { ...exchangeData, exchange_number: docNum };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['customer-exchanges'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            toast({
                title: 'Berhasil',
                description: `Tukar barang ${data.exchange_number} berhasil diproses`
            });

            // Notify auditor and main_office for audit trail
            sendNotificationToRole(['auditor', 'main_office'], {
                title: '🔄 Tukar Barang Diproses',
                message: `Pertukaran barang ${data.exchange_number} telah diproses oleh kasir`,
                type: 'info',
                link: '/exchange',
            });
        },
        onError: (error) => {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        },
    });

    return {
        exchanges,
        isLoading,
        searchSale,
        checkAlreadyExchanged,
        createExchange
    };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    CustomerTab,
    TabTransaction,
    TabTransactionItem,
    TabStatus,
    Location,
    PaymentMethod,
} from '@/types';
import { useToast } from '@/hooks/use-toast';

// ========================================
// Fetch Functions
// ========================================

async function fetchTabs(status?: TabStatus): Promise<CustomerTab[]> {
    let query = supabase
        .from('customer_tabs')
        .select('*')
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as CustomerTab[];
}

async function fetchTabWithTransactions(tabId: string): Promise<CustomerTab | null> {
    // Fetch tab
    const { data: tab, error: tabError } = await supabase
        .from('customer_tabs')
        .select('*')
        .eq('id', tabId)
        .single();

    if (tabError) throw tabError;
    if (!tab) return null;

    // Fetch transactions
    const { data: transactions, error: txError } = await supabase
        .from('tab_transactions')
        .select('*')
        .eq('tab_id', tabId)
        .order('created_at', { ascending: true });

    if (txError) throw txError;

    // Fetch items for each transaction
    const txIds = (transactions || []).map((t: TabTransaction) => t.id);
    let items: TabTransactionItem[] = [];

    if (txIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
            .from('tab_transaction_items')
            .select('*')
            .in('transaction_id', txIds);

        if (itemsError) throw itemsError;
        items = itemsData || [];
    }

    // Map items to transactions
    const transactionsWithItems = (transactions || []).map((tx: TabTransaction) => ({
        ...tx,
        items: items.filter(item => item.transaction_id === tx.id),
    }));

    return {
        ...tab,
        transactions: transactionsWithItems,
    } as CustomerTab;
}

// ========================================
// Hooks
// ========================================

export function useTabs(status?: TabStatus) {
    return useQuery({
        queryKey: ['customer-tabs', status],
        queryFn: () => fetchTabs(status),
    });
}

export function useTab(tabId: string) {
    return useQuery({
        queryKey: ['customer-tab', tabId],
        queryFn: () => fetchTabWithTransactions(tabId),
        enabled: !!tabId,
        staleTime: 0, // Always refetch fresh data
    });
}

export function useOpenTabs() {
    return useTabs('open');
}

// Create a new tab
export function useCreateTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            customerName,
            customerPhone,
            stockLocation,
            cashierId,
            cashierName,
        }: {
            customerName: string;
            customerPhone?: string;
            stockLocation: Location;
            cashierId: string;
            cashierName: string;
        }) => {
            // Generate tab number
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const tabNumber = `TAB-${dateStr}-${randomSuffix}`;

            const { data, error } = await supabase
                .from('customer_tabs')
                .insert({
                    tab_number: tabNumber,
                    customer_name: customerName,
                    customer_phone: customerPhone || null,
                    stock_location: stockLocation,
                    cashier_id: cashierId,
                    cashier_name: cashierName,
                    status: 'open',
                    total_amount: 0,
                })
                .select()
                .single();

            if (error) throw error;
            return data as CustomerTab;
        },
        onSuccess: async (data) => {
            // Notify about new tab
            await supabase.from('notifications').insert({
                title: 'Tab Baru Dibuat',
                message: `Tab ${data.tab_number} untuk ${data.customer_name} dibuat`,
                type: 'info',
                link: '/pos/tabs',
            });

            queryClient.invalidateQueries({ queryKey: ['customer-tabs'] });
            toast({
                title: 'Tab berhasil dibuat',
                description: 'Tab baru untuk pelanggan telah dibuat',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal membuat tab',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Add transaction to a tab
export function useAddTabTransaction() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            tabId,
            tabNumber,
            stockLocation,
            items,
            cashierId,
            cashierName,
            products,
        }: {
            tabId: string;
            tabNumber: string;
            stockLocation: Location;
            items: Array<{ productId: string; quantity: number }>;
            cashierId: string;
            cashierName: string;
            products: Array<{ id: string; name: string; barcode: string; price: number }>;
        }) => {
            // Get current transaction count
            const { count } = await supabase
                .from('tab_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('tab_id', tabId);

            const txNumber = `${tabNumber}-TRX-${(count || 0) + 1}`;

            // Calculate items with prices
            const transactionItems = items.map(item => {
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

            const subtotal = transactionItems.reduce((acc, item) => acc + item.subtotal, 0);

            // Create transaction
            const { data: transaction, error: txError } = await supabase
                .from('tab_transactions')
                .insert({
                    tab_id: tabId,
                    transaction_number: txNumber,
                    subtotal,
                    cashier_id: cashierId,
                    cashier_name: cashierName,
                })
                .select()
                .single();

            if (txError) throw txError;

            // Create transaction items
            const itemsToInsert = transactionItems.map(item => ({
                ...item,
                transaction_id: transaction.id,
            }));

            const { error: itemsError } = await supabase
                .from('tab_transaction_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // Update tab total
            const { data: currentTab } = await supabase
                .from('customer_tabs')
                .select('total_amount')
                .eq('id', tabId)
                .single();

            const newTotal = (currentTab?.total_amount || 0) + subtotal;

            const { error: updateError } = await supabase
                .from('customer_tabs')
                .update({ total_amount: newTotal })
                .eq('id', tabId);

            if (updateError) throw updateError;

            // Update stock (decrease)
            const stockField = `stock_${stockLocation}`;
            for (const item of items) {
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
                        note: `Tab ${tabNumber} - Transaksi ${txNumber}`,
                    });
                }
            }

            return { transaction, subtotal, newTotal };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['customer-tabs'] });
            queryClient.invalidateQueries({ queryKey: ['customer-tab', variables.tabId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
            toast({
                title: 'Transaksi berhasil ditambahkan',
                description: 'Item telah ditambahkan ke tab pelanggan',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menambah transaksi',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Settle (close) a tab
export function useSettleTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            tabId,
            paymentMethod,
            amountPaid,
            changeAmount,
            settledBy,
            settledByName,
        }: {
            tabId: string;
            paymentMethod: PaymentMethod;
            amountPaid: number;
            changeAmount: number;
            settledBy: string;
            settledByName: string;
        }) => {
            // Fetch tab with all transactions first
            const tabData = await fetchTabWithTransactions(tabId);
            if (!tabData) throw new Error('Tab tidak ditemukan');

            // Generate sale number from tab number
            const saleNumber = `INV-${tabData.tab_number}`;

            // Collect all items from all transactions
            const allItems: Array<{
                product_id: string;
                product_name: string;
                barcode: string;
                quantity: number;
                price: number;
                subtotal: number;
            }> = [];

            for (const tx of tabData.transactions || []) {
                for (const item of tx.items || []) {
                    // Check if product already exists in allItems (consolidate same products)
                    const existingItem = allItems.find(i => i.product_id === item.product_id);
                    if (existingItem) {
                        existingItem.quantity += item.quantity;
                        existingItem.subtotal += item.subtotal;
                    } else {
                        allItems.push({
                            product_id: item.product_id,
                            product_name: item.product_name,
                            barcode: item.barcode || '',
                            quantity: item.quantity,
                            price: item.price,
                            subtotal: item.subtotal,
                        });
                    }
                }
            }

            // Create sale record so it appears in cashier sales
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    sale_number: saleNumber,
                    cashier_id: settledBy,
                    cashier_name: settledByName,
                    payment_method: paymentMethod,
                    stock_location: tabData.stock_location,
                    total_amount: tabData.total_amount,
                })
                .select()
                .single();

            if (saleError) throw saleError;

            // Create sale items
            if (allItems.length > 0) {
                const saleItemsToInsert = allItems.map(item => ({
                    sale_id: sale.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
                }));

                const { error: itemsError } = await supabase
                    .from('sale_items')
                    .insert(saleItemsToInsert);

                if (itemsError) throw itemsError;
            }

            // Update tab status
            const { data, error } = await supabase
                .from('customer_tabs')
                .update({
                    status: 'settled',
                    payment_method: paymentMethod,
                    amount_paid: amountPaid,
                    change_amount: changeAmount,
                    settled_by: settledBy,
                    settled_by_name: settledByName,
                    settled_at: new Date().toISOString(),
                    sale_id: sale.id, // Link to the created sale
                })
                .eq('id', tabId)
                .select()
                .single();

            if (error) throw error;
            return data as CustomerTab;
        },
        onSuccess: async (data, variables) => {
            // Notify about settled tab
            await supabase.from('notifications').insert({
                title: 'Tab Diselesaikan',
                message: `Tab ${data.tab_number} untuk ${data.customer_name} telah dilunasi Rp ${data.total_amount.toLocaleString('id-ID')}`,
                type: 'success',
                link: '/pos/tabs',
            });

            queryClient.invalidateQueries({ queryKey: ['customer-tabs'] });
            queryClient.invalidateQueries({ queryKey: ['customer-tab', variables.tabId] });
            queryClient.invalidateQueries({ queryKey: ['sales'] }); // Refresh sales list
            queryClient.invalidateQueries({ queryKey: ['sale-items'] });
            toast({
                title: 'Tab berhasil ditutup',
                description: 'Pembayaran telah dicatat dan ditambahkan ke daftar penjualan',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menutup tab',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Cancel a tab (return stock)
export function useCancelTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            tabId,
            reason,
            cancelledBy,
            cancelledByName,
        }: {
            tabId: string;
            reason: string;
            cancelledBy: string;
            cancelledByName: string;
        }) => {
            // Fetch tab with transactions to return stock
            const tabData = await fetchTabWithTransactions(tabId);
            if (!tabData) throw new Error('Tab tidak ditemukan');

            const stockLocation = tabData.stock_location;
            const stockField = `stock_${stockLocation}`;

            // Return stock for all items
            for (const tx of tabData.transactions || []) {
                for (const item of tx.items || []) {
                    const { data: product } = await supabase
                        .from('products')
                        .select('*')
                        .eq('id', item.product_id)
                        .single();

                    if (product) {
                        const newStock = (product[stockField] || 0) + item.quantity;
                        await supabase
                            .from('products')
                            .update({ [stockField]: newStock })
                            .eq('id', item.product_id);

                        await supabase.from('stock_logs').insert({
                            product_id: item.product_id,
                            type: 'in',
                            quantity: item.quantity,
                            location: stockLocation,
                            user_id: cancelledBy,
                            note: `Tab ${tabData.tab_number} dibatalkan - stok dikembalikan`,
                        });
                    }
                }
            }

            // Update tab status
            const { data, error } = await supabase
                .from('customer_tabs')
                .update({
                    status: 'cancelled',
                    cancelled_by: cancelledBy,
                    cancelled_reason: reason,
                    cancelled_at: new Date().toISOString(),
                })
                .eq('id', tabId)
                .select()
                .single();

            if (error) throw error;
            return data as CustomerTab;
        },
        onSuccess: async (data, variables) => {
            // Notify about cancelled tab
            await supabase.from('notifications').insert({
                title: 'Tab Dibatalkan',
                message: `Tab ${data.tab_number} untuk ${data.customer_name} dibatalkan, stok dikembalikan`,
                type: 'warning',
                link: '/pos/tabs',
            });

            queryClient.invalidateQueries({ queryKey: ['customer-tabs'] });
            queryClient.invalidateQueries({ queryKey: ['customer-tab', variables.tabId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
            toast({
                title: 'Tab dibatalkan',
                description: 'Stok telah dikembalikan',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal membatalkan tab',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Delete a single transaction from a tab (return stock)
export function useDeleteTabTransaction() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            tabId,
            transactionId,
            deletedBy,
        }: {
            tabId: string;
            transactionId: string;
            deletedBy: string;
        }) => {
            // Fetch the tab data to get stock location
            const tabData = await fetchTabWithTransactions(tabId);
            if (!tabData) throw new Error('Tab tidak ditemukan');
            if (tabData.status !== 'open') throw new Error('Hanya bisa menghapus transaksi dari tab yang masih aktif');

            // Find the transaction to delete
            const transaction = tabData.transactions?.find(tx => tx.id === transactionId);
            if (!transaction) throw new Error('Transaksi tidak ditemukan');

            const stockLocation = tabData.stock_location;
            const stockField = `stock_${stockLocation}`;

            // Return stock for all items in this transaction
            for (const item of transaction.items || []) {
                const { data: product } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', item.product_id)
                    .single();

                if (product) {
                    const newStock = (product[stockField] || 0) + item.quantity;
                    await supabase
                        .from('products')
                        .update({ [stockField]: newStock })
                        .eq('id', item.product_id);

                    await supabase.from('stock_logs').insert({
                        product_id: item.product_id,
                        type: 'in',
                        quantity: item.quantity,
                        location: stockLocation,
                        user_id: deletedBy,
                        note: `Transaksi dihapus dari Tab ${tabData.tab_number} - stok dikembalikan`,
                    });
                }
            }

            // Delete transaction items first
            const { error: itemsDeleteError } = await supabase
                .from('tab_transaction_items')
                .delete()
                .eq('transaction_id', transactionId);

            if (itemsDeleteError) {
                console.error('Failed to delete transaction items:', itemsDeleteError);
                throw new Error('Gagal menghapus item transaksi: ' + itemsDeleteError.message);
            }

            // Delete the transaction
            const { error: txError } = await supabase
                .from('tab_transactions')
                .delete()
                .eq('id', transactionId);

            if (txError) {
                console.error('Failed to delete transaction:', txError);
                throw new Error('Gagal menghapus transaksi: ' + txError.message);
            }

            // Update tab total_amount
            const newTotal = tabData.total_amount - transaction.subtotal;
            const { data, error } = await supabase
                .from('customer_tabs')
                .update({ total_amount: Math.max(0, newTotal) })
                .eq('id', tabId)
                .select()
                .single();

            if (error) throw error;
            return data as CustomerTab;
        },
        onSuccess: async (data, variables) => {
            // Force refetch to ensure UI updates immediately
            await queryClient.refetchQueries({ queryKey: ['customer-tab', variables.tabId] });
            await queryClient.refetchQueries({ queryKey: ['customer-tabs'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
            toast({
                title: 'Transaksi dihapus',
                description: 'Stok telah dikembalikan',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menghapus transaksi',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

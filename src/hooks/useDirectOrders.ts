import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DirectOrder, DirectOrderStatus } from '@/types';
import { sendNotificationToRole } from '@/hooks/useRealtimeNotifications';

interface CreateDirectOrderInput {
    supplier_id: string;
    supplier_name: string;
    customer_id: string;
    customer_name: string;
    delivery_address: string;
    delivery_phone?: string;
    shipping_cost: number;
    notes?: string;
    items: {
        product_name: string;
        quantity: number;
        unit: string;
        price: number;
    }[];
}

// Generate order number
const generateOrderNumber = () => {
    const date = new Date();
    const y = date.getFullYear().toString().slice(-2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `DO-${y}${m}${d}-${rand}`;
};

export function useDirectOrders() {
    return useQuery({
        queryKey: ['direct_orders'],
        queryFn: async () => {
            // Since table may not exist, use localStorage fallback
            const cached = localStorage.getItem('direct_orders');
            if (cached) {
                return JSON.parse(cached) as DirectOrder[];
            }

            try {
                const { data, error } = await supabase
                    .from('direct_orders')
                    .select(`
                        *,
                        items:direct_order_items(*)
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data as DirectOrder[];
            } catch {
                console.log('Direct orders table not found, using localStorage');
                return [];
            }
        },
    });
}

export function useDirectOrder(id: string | undefined) {
    return useQuery({
        queryKey: ['direct_order', id],
        queryFn: async () => {
            if (!id) return null;

            const cached = localStorage.getItem('direct_orders');
            if (cached) {
                const orders = JSON.parse(cached) as DirectOrder[];
                return orders.find(o => o.id === id) || null;
            }

            try {
                const { data, error } = await supabase
                    .from('direct_orders')
                    .select(`
                        *,
                        items:direct_order_items(*)
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                return data as DirectOrder;
            } catch {
                return null;
            }
        },
        enabled: !!id,
    });
}

export function useCreateDirectOrder() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: CreateDirectOrderInput) => {
            const orderNumber = generateOrderNumber();
            const totalItems = input.items.reduce((acc, it) => acc + (it.quantity * it.price), 0);
            const totalAmount = totalItems + input.shipping_cost;

            const newOrder: DirectOrder = {
                id: crypto.randomUUID(),
                order_number: orderNumber,
                supplier_id: input.supplier_id,
                supplier_name: input.supplier_name,
                customer_id: input.customer_id,
                customer_name: input.customer_name,
                delivery_address: input.delivery_address,
                delivery_phone: input.delivery_phone || null,
                status: 'pending',
                shipping_cost: input.shipping_cost,
                total_amount: totalAmount,
                notes: input.notes || null,
                created_by: profile?.user_id || null,
                created_by_name: profile?.name || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                items: input.items.map((it, idx) => ({
                    id: crypto.randomUUID(),
                    direct_order_id: '',
                    product_name: it.product_name,
                    quantity: it.quantity,
                    unit: it.unit,
                    price: it.price,
                    total: it.quantity * it.price,
                    note: null,
                })),
            };

            // Save to localStorage
            const cached = localStorage.getItem('direct_orders');
            const orders = cached ? JSON.parse(cached) as DirectOrder[] : [];
            orders.unshift(newOrder);
            localStorage.setItem('direct_orders', JSON.stringify(orders));

            // Try Supabase (may fail if table doesn't exist)
            try {
                const { error } = await supabase
                    .from('direct_orders')
                    .insert({
                        id: newOrder.id,
                        order_number: newOrder.order_number,
                        supplier_id: newOrder.supplier_id,
                        supplier_name: newOrder.supplier_name,
                        customer_id: newOrder.customer_id,
                        customer_name: newOrder.customer_name,
                        delivery_address: newOrder.delivery_address,
                        delivery_phone: newOrder.delivery_phone,
                        status: newOrder.status,
                        shipping_cost: newOrder.shipping_cost,
                        total_amount: newOrder.total_amount,
                        notes: newOrder.notes,
                        created_by: newOrder.created_by,
                        created_by_name: newOrder.created_by_name,
                    });

                if (!error) {
                    // Insert items
                    await supabase.from('direct_order_items').insert(
                        input.items.map(it => ({
                            direct_order_id: newOrder.id,
                            product_name: it.product_name,
                            quantity: it.quantity,
                            unit: it.unit,
                            price: it.price,
                            total: it.quantity * it.price,
                        }))
                    );
                }
            } catch {
                console.log('Supabase insert failed, using localStorage only');
            }

            // Notify auditor about new direct order
            await sendNotificationToRole('auditor', {
                title: 'Direct Order Baru',
                message: `Order ${orderNumber} dari ${input.supplier_name} ke ${input.customer_name}`,
                type: 'info',
                link: `/direct-orders/${newOrder.id}`,
            });

            return newOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['direct_orders'] });
            toast({
                title: 'Berhasil',
                description: 'Direct order berhasil dibuat',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

export function useUpdateDirectOrderStatus() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            orderId,
            status,
            cancelReason
        }: {
            orderId: string;
            status: DirectOrderStatus;
            cancelReason?: string;
        }) => {
            const now = new Date().toISOString();
            const updates: Partial<DirectOrder> = {
                status,
                updated_at: now,
            };

            if (status === 'confirmed') updates.confirmed_at = now;
            if (status === 'shipped') updates.shipped_at = now;
            if (status === 'delivered') updates.delivered_at = now;
            if (status === 'cancelled') {
                updates.cancelled_at = now;
                updates.cancelled_reason = cancelReason || null;
            }

            // Update localStorage
            const cached = localStorage.getItem('direct_orders');
            if (cached) {
                const orders = JSON.parse(cached) as DirectOrder[];
                const idx = orders.findIndex(o => o.id === orderId);
                if (idx >= 0) {
                    orders[idx] = { ...orders[idx], ...updates };
                    localStorage.setItem('direct_orders', JSON.stringify(orders));
                }
            }

            // Try Supabase
            try {
                await supabase
                    .from('direct_orders')
                    .update(updates)
                    .eq('id', orderId);
            } catch {
                console.log('Supabase update failed');
            }

            // Notify main_office about status change
            await sendNotificationToRole('main_office', {
                title: `Direct Order ${status === 'confirmed' ? 'Dikonfirmasi' : status === 'shipped' ? 'Dikirim' : status === 'delivered' ? 'Terkirim' : 'Dibatalkan'}`,
                message: `Status order diperbarui oleh ${profile?.name || 'User'}`,
                type: status === 'cancelled' ? 'warning' : 'success',
                link: `/direct-orders/${orderId}`,
            });

            return { orderId, status };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['direct_orders'] });
            queryClient.invalidateQueries({ queryKey: ['direct_order', variables.orderId] });

            const statusText: Record<DirectOrderStatus, string> = {
                pending: 'Pending',
                confirmed: 'Dikonfirmasi',
                shipped: 'Dikirim',
                delivered: 'Terkirim',
                cancelled: 'Dibatalkan',
            };

            toast({
                title: 'Status Diperbarui',
                description: `Order berhasil diubah ke ${statusText[variables.status]}`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

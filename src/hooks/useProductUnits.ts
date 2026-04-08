import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductUnit {
    id: string;
    code: string;
    label: string;
    is_active: boolean;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
}

// Fallback units in case DB is not available
const FALLBACK_UNITS: ProductUnit[] = [
    { id: '1', code: 'pcs', label: 'PCS', is_active: true, sort_order: 1 },
    { id: '2', code: 'box', label: 'BOX', is_active: true, sort_order: 2 },
    { id: '3', code: 'kg', label: 'KG', is_active: true, sort_order: 3 },
    { id: '4', code: 'meter', label: 'METER', is_active: true, sort_order: 4 },
    { id: '5', code: 'roll', label: 'ROLL', is_active: true, sort_order: 5 },
    { id: '6', code: 'sak', label: 'SAK', is_active: true, sort_order: 6 },
    { id: '7', code: 'pack', label: 'PACK', is_active: true, sort_order: 7 },
    { id: '8', code: 'lusin', label: 'LUSIN', is_active: true, sort_order: 8 },
];

async function fetchProductUnits(): Promise<ProductUnit[]> {
    const { data, error } = await (supabase
        .from('product_units' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }) as any);

    if (error) {
        console.warn('[useProductUnits] Failed to fetch from DB, using fallback:', error.message);
        return FALLBACK_UNITS;
    }

    if (!data || data.length === 0) {
        return FALLBACK_UNITS;
    }

    return data.map((row: any) => ({
        id: row.id,
        code: row.code,
        label: row.label,
        is_active: row.is_active,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

async function fetchAllProductUnits(): Promise<ProductUnit[]> {
    const { data, error } = await (supabase
        .from('product_units' as any)
        .select('*')
        .order('sort_order', { ascending: true }) as any);

    if (error) {
        console.warn('[useProductUnits] Failed to fetch all from DB:', error.message);
        return FALLBACK_UNITS;
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        code: row.code,
        label: row.label,
        is_active: row.is_active,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

/**
 * Hook to get active product units (for dropdowns in forms)
 */
export function useProductUnits() {
    return useQuery({
        queryKey: ['product-units'],
        queryFn: fetchProductUnits,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to get ALL product units including inactive (for admin management)
 */
export function useAllProductUnits() {
    return useQuery({
        queryKey: ['product-units-all'],
        queryFn: fetchAllProductUnits,
        staleTime: 60 * 1000,
    });
}

/**
 * Hook to add a new unit
 */
export function useAddProductUnit() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (unit: { code: string; label: string }) => {
            const { data: maxOrder } = await (supabase
                .from('product_units' as any)
                .select('sort_order')
                .order('sort_order', { ascending: false })
                .limit(1) as any);

            const nextOrder = (maxOrder?.[0]?.sort_order || 0) + 1;

            const { data, error } = await (supabase
                .from('product_units' as any)
                .insert({
                    code: unit.code.toLowerCase().trim(),
                    label: unit.label.toUpperCase().trim(),
                    sort_order: nextOrder,
                    is_active: true,
                })
                .select()
                .single() as any);

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-units'] });
            queryClient.invalidateQueries({ queryKey: ['product-units-all'] });
            toast({ title: 'Satuan berhasil ditambahkan' });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menambahkan satuan',
                description: error.message.includes('duplicate')
                    ? 'Kode satuan sudah ada'
                    : error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Hook to update a unit (toggle active/inactive)
 */
export function useUpdateProductUnit() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductUnit> }) => {
            const updateData: any = {};
            if (updates.code !== undefined) updateData.code = updates.code.toLowerCase().trim();
            if (updates.label !== undefined) updateData.label = updates.label.toUpperCase().trim();
            if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
            if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;

            const { error } = await (supabase
                .from('product_units' as any)
                .update(updateData)
                .eq('id', id) as any);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-units'] });
            queryClient.invalidateQueries({ queryKey: ['product-units-all'] });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal memperbarui satuan',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Hook to delete a unit
 */
export function useDeleteProductUnit() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase
                .from('product_units' as any)
                .delete()
                .eq('id', id) as any);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-units'] });
            queryClient.invalidateQueries({ queryKey: ['product-units-all'] });
            toast({ title: 'Satuan berhasil dihapus' });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal menghapus satuan',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Helper — convert DB units to the { value, label } format used by form dropdowns
 */
export function unitsToSelectOptions(units: ProductUnit[]): { value: string; label: string }[] {
    return units.map(u => ({ value: u.code, label: u.label }));
}

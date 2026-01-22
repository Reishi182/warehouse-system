import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StoreSettings {
    id: string;
    store_name: string;
    store_address: string;
    store_phone: string;
    store_email: string;
    updated_at: string;
}

const DEFAULT_SETTINGS: Omit<StoreSettings, 'id' | 'updated_at'> = {
    store_name: 'WAREHOUSE SYSTEM',
    store_address: 'Jl. Contoh No. 123',
    store_phone: '021-1234567',
    store_email: 'info@warehouse.com',
};

export function useStoreSettings() {
    return useQuery({
        queryKey: ['store_settings'],
        queryFn: async () => {
            // Try to get from localStorage first (for non-DB approach)
            const cached = localStorage.getItem('store_settings');
            if (cached) {
                return JSON.parse(cached) as StoreSettings;
            }

            // Try to get from Supabase
            const { data, error } = await supabase
                .from('store_settings')
                .select('*')
                .single();

            if (error) {
                // If table doesn't exist or no data, return defaults
                console.log('Store settings not found, using defaults');
                return {
                    id: 'default',
                    ...DEFAULT_SETTINGS,
                    updated_at: new Date().toISOString(),
                } as StoreSettings;
            }

            return data as StoreSettings;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useUpdateStoreSettings() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (settings: Omit<StoreSettings, 'id' | 'updated_at'>) => {
            // Save to localStorage as fallback
            const stored = {
                id: 'local',
                ...settings,
                updated_at: new Date().toISOString(),
            };
            localStorage.setItem('store_settings', JSON.stringify(stored));

            // Try to save to Supabase (upsert)
            try {
                const { error } = await supabase
                    .from('store_settings')
                    .upsert({
                        id: 'default',
                        ...settings,
                        updated_at: new Date().toISOString(),
                    });

                if (error) {
                    console.log('Could not save to Supabase, saved to localStorage only');
                }
            } catch {
                console.log('Supabase save failed, using localStorage');
            }

            return stored;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store_settings'] });
            toast({
                title: 'Berhasil',
                description: 'Pengaturan toko berhasil disimpan',
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

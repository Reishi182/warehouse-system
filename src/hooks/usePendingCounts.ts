import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/AuthContext';

interface PendingCounts {
    suratJalan: number;      // Surat Jalan pending approval
    stockRequests: number;   // Stock requests pending main office
    stockReturns: number;    // Stock returns pending main office
}

/**
 * Hook to fetch pending approval counts for sidebar badges.
 * Only fetches data relevant to the current user's role.
 */
export function usePendingCounts() {
    const role = useRole();
    const queryClient = useQueryClient();

    const { data: counts, isLoading } = useQuery({
        queryKey: ['pending-counts', role],
        queryFn: async (): Promise<PendingCounts> => {
            const result: PendingCounts = {
                suratJalan: 0,
                stockRequests: 0,
                stockReturns: 0,
            };

            console.log('[usePendingCounts] Fetching counts for role:', role);

            // Fetch pending Surat Jalan count
            const { count: sjCount, error: sjError } = await supabase
                .from('surat_jalan')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            console.log('[usePendingCounts] surat_jalan pending:', sjCount, sjError);

            if (!sjError && sjCount !== null) {
                result.suratJalan = sjCount;
            }

            // Fetch pending stock requests count
            const { count: srCount, error: srError } = await supabase
                .from('stock_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending_main_office');

            console.log('[usePendingCounts] stock_requests pending:', srCount, srError);

            if (!srError && srCount !== null) {
                result.stockRequests = srCount;
            }

            // Fetch pending stock returns count
            const { count: returnCount, error: returnError } = await supabase
                .from('stock_returns')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending_main_office');

            console.log('[usePendingCounts] stock_returns pending:', returnCount, returnError);

            if (!returnError && returnCount !== null) {
                result.stockReturns = returnCount;
            }

            console.log('[usePendingCounts] Final counts:', result);
            return result;
        },
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 60, // Refetch every minute
        // Enable for all roles to test - change back later if needed
        enabled: !!role,
    });

    // Subscribe to real-time changes for auto-refresh
    useEffect(() => {
        if (role !== 'main_office' && role !== 'admin') return;

        const channels = [
            supabase
                .channel('pending_surat_jalan')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'surat_jalan' }, () => {
                    queryClient.invalidateQueries({ queryKey: ['pending-counts'] });
                })
                .subscribe(),
            supabase
                .channel('pending_stock_requests')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_requests' }, () => {
                    queryClient.invalidateQueries({ queryKey: ['pending-counts'] });
                })
                .subscribe(),
            supabase
                .channel('pending_stock_returns')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_returns' }, () => {
                    queryClient.invalidateQueries({ queryKey: ['pending-counts'] });
                })
                .subscribe(),
        ];

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [role, queryClient]);

    return {
        counts: counts || { suratJalan: 0, stockRequests: 0, stockReturns: 0 },
        isLoading,
    };
}

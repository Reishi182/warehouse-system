import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockOpnameSession, StockOpnameSessionStatus, Location } from '@/types';

/**
 * Hook to fetch stock opname sessions with filters
 * 
 * **Validates: Requirements 11.1, 11.2, 11.3**
 * 
 * Filters:
 * - status: Filter by session status (draft, pending_approval, approved, rejected, completed)
 * - location: Filter by location (gudang or toko)
 * - dateFrom: Filter sessions created from this date (YYYY-MM-DD)
 * - dateTo: Filter sessions created until this date (YYYY-MM-DD)
 * 
 * Returns sessions with joined items and products, ordered by created_at descending
 */
export function useStockOpnameSessions(filters?: {
  status?: StockOpnameSessionStatus;
  location?: Location;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['stock-opname-sessions', filters],
    queryFn: async () => {
      let query = supabase
        .from('stock_opname_sessions')
        .select(`
          *,
          items:stock_opname_items(
            *,
            product:products(*)
          )
        `)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.location) {
        query = query.eq('location', filters.location);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data as StockOpnameSession[];
    },
  });
}

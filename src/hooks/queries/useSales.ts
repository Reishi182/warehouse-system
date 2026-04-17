import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Sale } from '@/types';

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (salesError) throw salesError;
      if (!sales || sales.length === 0) return [];

      const saleIds = sales.map(s => s.id);
      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .in('sale_id', saleIds);
      
      if (itemsError) throw itemsError;

      return sales.map(sale => ({
        ...sale,
        items: items?.filter(item => item.sale_id === sale.id) || []
      })) as Sale[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

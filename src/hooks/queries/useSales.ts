import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Sale } from '@/types';

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          items:sale_items(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

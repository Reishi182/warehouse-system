import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, barcode, price, image_url, stock_gudang, stock_toko, has_multi_unit, main_unit, pcs_per_box, box_price, sell_by_quantity, sell_unit, bulk_quantity, bulk_price, min_stock_gudang, min_stock_toko, created_at, updated_at')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
  });
}

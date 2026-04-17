import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

async function fetchCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as ProductCategory[];
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAddCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: { name: string; color: string; icon: string }) => {
      const { data, error } = await supabase
        .from('product_categories')
        .insert([cat])
        .select()
        .single();
      if (error) throw error;
      return data as ProductCategory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Kategori ditambahkan');
    },
    onError: (e: Error) => toast.error(`Gagal: ${e.message}`),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductCategory> }) => {
      const { error } = await supabase
        .from('product_categories')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Kategori diperbarui');
    },
    onError: (e: Error) => toast.error(`Gagal: ${e.message}`),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Kategori dihapus');
    },
    onError: (e: Error) => toast.error(`Gagal: ${e.message}`),
  });
}

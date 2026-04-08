import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { useToast } from './use-toast';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  created_at: string;
}

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as unknown as UserProfile[]) || []);
    } catch (error: any) {
      toast({
        title: 'Gagal mengambil data pengguna',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      
      toast({
        title: 'Berhasil',
        description: 'Peran pengguna berhasil diperbarui',
      });
    } catch (error: any) {
      toast({
        title: 'Gagal memperbarui peran',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Note: This only deletes the profile. Auth user deletion requires Admin API
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.user_id !== userId));
      
      toast({
        title: 'Berhasil',
        description: 'Profil pengguna berhasil dihapus',
      });
    } catch (error: any) {
      toast({
        title: 'Gagal menghapus pengguna',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    refreshUsers: fetchUsers,
    updateUserRole,
    deleteUser,
  };
}

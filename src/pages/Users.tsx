import MainLayout from '@/components/layout/MainLayout';
import { Users as UsersIcon } from 'lucide-react';

export default function Users() {
    return (
        <MainLayout title="Pengguna" subtitle="Kelola pengguna sistem">
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <UsersIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Manajemen Pengguna</h2>
                <p className="text-muted-foreground">Halaman ini sedang dalam pengembangan.</p>
            </div>
        </MainLayout>
    );
}

import React from 'react';
import { LogOut, RefreshCw, Clock } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface SessionExpiredDialogProps {
    open: boolean;
    onLogin: () => void;
}

export function SessionExpiredDialog({ open, onLogin }: SessionExpiredDialogProps) {
    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <AlertDialogTitle className="text-xl text-center">
                        Sesi Anda Telah Berakhir
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center space-y-2">
                        <p>
                            Sesi login Anda telah habis karena tidak aktif atau token telah expired.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Silakan login kembali untuk melanjutkan menggunakan aplikasi.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogAction asChild>
                        <Button
                            onClick={onLogin}
                            className="w-full sm:w-auto gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Login Kembali
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default SessionExpiredDialog;

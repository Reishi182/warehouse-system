import { AppModal } from '@/components/ui/app-modal';
import { Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const SHORTCUT_CATEGORIES = [
    {
        title: 'Navigasi',
        shortcuts: [
            { key: 'k', ctrlKey: true, description: 'Pencarian cepat' },
            { key: 'h', ctrlKey: true, description: 'Kembali ke beranda' },
            { key: '/', description: 'Fokus ke kotak pencarian' },
        ],
    },
    {
        title: 'Aksi',
        shortcuts: [
            { key: 'n', ctrlKey: true, description: 'Buat baru / Tambah item' },
            { key: 's', ctrlKey: true, description: 'Simpan perubahan' },
            { key: 'p', ctrlKey: true, description: 'Cetak / Print' },
            { key: 'e', ctrlKey: true, description: 'Export data' },
        ],
    },
    {
        title: 'Stok',
        shortcuts: [
            { key: 'q', ctrlKey: true, description: 'Cek stok cepat (Quick Check)' },
            { key: 'b', ctrlKey: true, description: 'Scan barcode' },
        ],
    },
    {
        title: 'Umum',
        shortcuts: [
            { key: 'Escape', description: 'Tutup dialog / modal' },
            { key: '?', shiftKey: true, description: 'Tampilkan bantuan shortcut' },
        ],
    },
];

/**
 * Keyboard Shortcuts Help Dialog
 */
export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
    return (
        <AppModal
            open={open}
            onClose={() => onOpenChange(false)}
            title="Pintasan Keyboard"
            icon={<Keyboard className="w-4 h-4" />}
            size="sm"
        >
            <div className="space-y-6">
                {SHORTCUT_CATEGORIES.map((category) => (
                    <div key={category.title}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                            {category.title}
                        </h3>
                        <div className="space-y-2">
                            {category.shortcuts.map((shortcut, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <span className="text-sm">{shortcut.description}</span>
                                    <kbd className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted font-mono text-xs font-medium">
                                        {shortcut.ctrlKey && (
                                            <>
                                                <Command className="w-3 h-3" />
                                                <span>+</span>
                                            </>
                                        )}
                                        {shortcut.shiftKey && (
                                            <>
                                                <span>Shift</span>
                                                <span>+</span>
                                            </>
                                        )}
                                        {shortcut.altKey && (
                                            <>
                                                <span>Alt</span>
                                                <span>+</span>
                                            </>
                                        )}
                                        <span>{shortcut.key.toUpperCase()}</span>
                                    </kbd>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="pt-4 mt-2 border-t text-center">
                <p className="text-xs text-muted-foreground">
                    Tekan <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">ESC</kbd> untuk menutup
                </p>
            </div>
        </AppModal>
    );
}

export default KeyboardShortcutsHelp;

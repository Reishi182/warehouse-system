import { useEffect, useCallback, useRef } from 'react';

type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    handler: ShortcutHandler;
    description: string;
    global?: boolean; // If true, works even when input is focused
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
}

/**
 * Hook for managing keyboard shortcuts throughout the application.
 * Supports Ctrl, Shift, Alt modifiers and can work globally or only when not in inputs.
 */
export function useKeyboardShortcuts(
    shortcuts: Shortcut[],
    options: UseKeyboardShortcutsOptions = {}
) {
    const { enabled = true } = options;
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // Check if we're in an input element
        const target = e.target as HTMLElement;
        const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
            target.isContentEditable;

        for (const shortcut of shortcutsRef.current) {
            // Skip non-global shortcuts when in input
            if (isInInput && !shortcut.global) continue;

            const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = !!shortcut.ctrlKey === (e.ctrlKey || e.metaKey);
            const shiftMatch = !!shortcut.shiftKey === e.shiftKey;
            const altMatch = !!shortcut.altKey === e.altKey;

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                e.preventDefault();
                e.stopPropagation();
                shortcut.handler(e);
                break;
            }
        }
    }, [enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Format a shortcut for display (e.g., "Ctrl+K")
 */
export function formatShortcut(shortcut: Omit<Shortcut, 'handler' | 'description'>): string {
    const parts: string[] = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join('+');
}

// Common shortcuts registry for help display
export const COMMON_SHORTCUTS = [
    { key: 'k', ctrlKey: true, description: 'Pencarian cepat' },
    { key: 'n', ctrlKey: true, description: 'Buat baru' },
    { key: 's', ctrlKey: true, description: 'Simpan' },
    { key: 'p', ctrlKey: true, description: 'Cetak' },
    { key: '/', ctrlKey: false, description: 'Fokus pencarian' },
    { key: 'Escape', ctrlKey: false, description: 'Tutup dialog/modal' },
    { key: '?', shiftKey: true, description: 'Tampilkan bantuan shortcut' },
    { key: 'h', ctrlKey: true, description: 'Kembali ke beranda' },
] as const;

export default useKeyboardShortcuts;

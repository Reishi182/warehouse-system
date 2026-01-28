import React, { useState, createContext, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { QuickStockCheck } from '@/components/common/QuickStockCheck';
import { KeyboardShortcutsHelp } from '@/components/common/KeyboardShortcutsHelp';

interface GlobalShortcutsContextType {
    openSearch: () => void;
    openQuickStockCheck: () => void;
    openShortcutsHelp: () => void;
}

const GlobalShortcutsContext = createContext<GlobalShortcutsContextType | null>(null);

export function useGlobalShortcuts() {
    const context = useContext(GlobalShortcutsContext);
    if (!context) {
        throw new Error('useGlobalShortcuts must be used within GlobalShortcutsProvider');
    }
    return context;
}

interface GlobalShortcutsProviderProps {
    children: React.ReactNode;
}

/**
 * Global Shortcuts Provider - Provides keyboard shortcuts throughout the app
 */
export function GlobalShortcutsProvider({ children }: GlobalShortcutsProviderProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [stockCheckOpen, setStockCheckOpen] = useState(false);
    const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
    const navigate = useNavigate();

    const openSearch = useCallback(() => setSearchOpen(true), []);
    const openQuickStockCheck = useCallback(() => setStockCheckOpen(true), []);
    const openShortcutsHelp = useCallback(() => setShortcutsHelpOpen(true), []);

    // Register global keyboard shortcuts
    useKeyboardShortcuts([
        // Ctrl+K - Global Search
        {
            key: 'k',
            ctrlKey: true,
            global: true,
            description: 'Pencarian cepat',
            handler: () => setSearchOpen(true),
        },
        // Ctrl+Q - Quick Stock Check
        {
            key: 'q',
            ctrlKey: true,
            global: true,
            description: 'Cek stok cepat',
            handler: () => setStockCheckOpen(true),
        },
        // Shift+? - Shortcuts Help
        {
            key: '?',
            shiftKey: true,
            global: false,
            description: 'Bantuan shortcut',
            handler: () => setShortcutsHelpOpen(true),
        },
        // Ctrl+H - Go Home
        {
            key: 'h',
            ctrlKey: true,
            global: false,
            description: 'Kembali ke beranda',
            handler: () => navigate('/'),
        },
        // / - Focus search (when not in input)
        {
            key: '/',
            global: false,
            description: 'Fokus pencarian',
            handler: () => {
                const searchInput = document.querySelector('input[placeholder*="Cari"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                } else {
                    setSearchOpen(true);
                }
            },
        },
        // Escape - Close modals (handled by individual dialogs)
    ]);

    const contextValue: GlobalShortcutsContextType = {
        openSearch,
        openQuickStockCheck,
        openShortcutsHelp,
    };

    return (
        <GlobalShortcutsContext.Provider value={contextValue}>
            {children}

            {/* Global Search */}
            <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

            {/* Quick Stock Check */}
            <QuickStockCheck open={stockCheckOpen} onOpenChange={setStockCheckOpen} />

            {/* Keyboard Shortcuts Help */}
            <KeyboardShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
        </GlobalShortcutsContext.Provider>
    );
}

export default GlobalShortcutsProvider;

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface PinnedPage {
    path: string;
    title: string;
    icon?: string;
    pinnedAt: number;
}

const STORAGE_KEY = 'vmb-pinned-pages';
const MAX_PINNED = 5;

/**
 * Hook for managing pinned/favorite pages
 */
export function usePinnedPages() {
    const [pinnedPages, setPinnedPages] = useState<PinnedPage[]>([]);
    const location = useLocation();

    // Load from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setPinnedPages(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load pinned pages:', e);
        }
    }, []);

    // Save to localStorage
    const savePinnedPages = useCallback((pages: PinnedPage[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
            setPinnedPages(pages);
        } catch (e) {
            console.error('Failed to save pinned pages:', e);
        }
    }, []);

    // Check if current page is pinned
    const isCurrentPagePinned = pinnedPages.some(p => p.path === location.pathname);

    // Pin a page
    const pinPage = useCallback((path: string, title: string, icon?: string) => {
        if (pinnedPages.length >= MAX_PINNED) {
            // Remove oldest pinned page
            const sorted = [...pinnedPages].sort((a, b) => a.pinnedAt - b.pinnedAt);
            sorted.shift();
            savePinnedPages([...sorted, { path, title, icon, pinnedAt: Date.now() }]);
        } else {
            savePinnedPages([...pinnedPages, { path, title, icon, pinnedAt: Date.now() }]);
        }
    }, [pinnedPages, savePinnedPages]);

    // Unpin a page
    const unpinPage = useCallback((path: string) => {
        savePinnedPages(pinnedPages.filter(p => p.path !== path));
    }, [pinnedPages, savePinnedPages]);

    // Toggle pin status
    const togglePin = useCallback((path: string, title: string, icon?: string) => {
        if (pinnedPages.some(p => p.path === path)) {
            unpinPage(path);
        } else {
            pinPage(path, title, icon);
        }
    }, [pinnedPages, pinPage, unpinPage]);

    // Check if a specific path is pinned
    const isPagePinned = useCallback((path: string) => {
        return pinnedPages.some(p => p.path === path);
    }, [pinnedPages]);

    return {
        pinnedPages,
        isCurrentPagePinned,
        pinPage,
        unpinPage,
        togglePin,
        isPagePinned,
        maxPinned: MAX_PINNED,
        canPinMore: pinnedPages.length < MAX_PINNED,
    };
}

export default usePinnedPages;

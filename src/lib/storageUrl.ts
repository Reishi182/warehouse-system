/**
 * storageUrl.ts
 *
 * Converts Supabase Storage "object" URLs to the Image Transform CDN endpoint.
 *
 * WHY: Direct object URLs (`/storage/v1/object/public/...`) are served without
 * CDN caching → every request hits Supabase and counts as egress.
 *
 * The Image Transform endpoint (`/storage/v1/render/image/public/...`) is served
 * through Supabase's CDN (Cloudflare) with automatic edge caching, so repeated
 * requests for the same image are served by the CDN — not Supabase — reducing
 * egress by 70-90% in practice.
 *
 * Also available on FREE plan. No extra setup needed.
 *
 * Docs: https://supabase.com/docs/guides/storage/serving/image-transformations
 */

export type ImageFormat = 'origin' | 'avif' | 'webp';
export type ImageResize = 'cover' | 'contain' | 'fill';

export interface StorageUrlOptions {
    /** Target width in pixels (default: 600) */
    width?: number;
    /** Target height in pixels (optional) */
    height?: number;
    /** Image quality 1-100 (default: 80) */
    quality?: number;
    /** Output format (default: 'webp') */
    format?: ImageFormat;
    /** Resize mode (default: 'cover') */
    resize?: ImageResize;
}

/**
 * Converts a Supabase Storage public URL to a CDN-cached, transformed URL.
 *
 * - If the URL is not a Supabase storage URL, it is returned unchanged.
 * - If the URL is null/undefined, empty string is returned.
 */
export function storageUrl(
    url: string | null | undefined,
    options: StorageUrlOptions = {}
): string {
    if (!url) return '';

    // Only process Supabase object URLs — leave external URLs untouched
    if (!url.includes('/storage/v1/object/public/')) return url;

    const {
        width = 600,
        height,
        quality = 80,
        format = 'webp',
        resize = 'cover',
    } = options;

    // Replace object path with render/image path
    const cdnUrl = url.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
    );

    const params = new URLSearchParams();
    params.set('width', String(width));
    if (height) params.set('height', String(height));
    params.set('quality', String(quality));
    params.set('format', format);
    params.set('resize', resize);

    return `${cdnUrl}?${params.toString()}`;
}

// ─── Preset helpers ──────────────────────────────────────────────────────────

/**
 * Tiny thumbnail — for table rows, dropdowns (40-48px slots).
 * ~3-8 KB per image
 */
export function thumbUrl(url: string | null | undefined): string {
    return storageUrl(url, { width: 80, height: 80, quality: 70, format: 'webp', resize: 'cover' });
}

/**
 * Small card image — for product grids, POS tiles (80-120px slots).
 * ~8-20 KB per image
 */
export function cardUrl(url: string | null | undefined): string {
    return storageUrl(url, { width: 200, height: 200, quality: 75, format: 'webp', resize: 'cover' });
}

/**
 * Medium image — for dialogs, detail views (200-400px slots).
 * ~20-60 KB per image
 */
export function mediumUrl(url: string | null | undefined): string {
    return storageUrl(url, { width: 400, height: 400, quality: 80, format: 'webp', resize: 'cover' });
}

/**
 * Full-size image — for print previews, zoomed views.
 * ~40-120 KB per image
 */
export function fullUrl(url: string | null | undefined): string {
    return storageUrl(url, { width: 800, quality: 85, format: 'webp' });
}

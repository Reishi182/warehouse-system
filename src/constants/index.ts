/**
 * Application Constants
 * Centralized constants to eliminate magic numbers and improve maintainability
 */

// Stock threshold constants
export const STOCK_THRESHOLDS = {
    /** Low stock threshold for warehouse (gudang) */
    LOW_STOCK_GUDANG: 10,
    /** Low stock threshold for store (toko) */
    LOW_STOCK_TOKO: 5,
} as const;

// Pagination defaults
export const PAGINATION = {
    /** Default number of items per page */
    DEFAULT_PAGE_SIZE: 10,
    /** Available page size options (-1 means "All") */
    PAGE_SIZE_OPTIONS: [5, 10, 25, 50, -1] as const,
} as const;

// Query cache times (in milliseconds)
export const CACHE_TIMES = {
    /** Stale time for React Query (5 minutes) */
    STALE_TIME: 1000 * 60 * 5,
    /** Garbage collection time (30 minutes) */
    GC_TIME: 1000 * 60 * 30,
} as const;

// File upload limits
export const FILE_LIMITS = {
    /** Maximum avatar file size in bytes (10MB) */
    MAX_AVATAR_SIZE: 10 * 1024 * 1024,
    /** Maximum product image size in bytes (5MB) */
    MAX_PRODUCT_IMAGE_SIZE: 5 * 1024 * 1024,
    /** Allowed image MIME types */
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

// Date format strings
export const DATE_FORMATS = {
    /** Display format for dates */
    DISPLAY: 'dd MMM yyyy',
    /** Display format with time */
    DISPLAY_WITH_TIME: 'dd MMM yyyy HH:mm',
    /** ISO date string format */
    ISO: 'yyyy-MM-dd',
} as const;

// Stock location types
export const LOCATIONS = {
    GUDANG: 'gudang',
    TOKO: 'toko',
} as const;

// Payment methods
export const PAYMENT_METHODS = {
    CASH: 'cash',
    TRANSFER: 'transfer',
} as const;

// Marketplace types
export const MARKETPLACE_TYPES = {
    TOKOPEDIA: 'tokopedia',
    SHOPEE: 'shopee',
    LAZADA: 'lazada',
    BUKALAPAK: 'bukalapak',
    OTHER: 'other',
} as const;

// User roles
export const USER_ROLES = {
    WAREHOUSE: 'warehouse',
    CASHIER: 'cashier',
    MAIN_OFFICE: 'main_office',
    AUDITOR: 'auditor',
    ADMIN: 'admin',
} as const;

// Status colors for consistent styling
export const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
} as const;

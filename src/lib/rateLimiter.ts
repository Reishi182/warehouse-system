/**
 * Rate Limiter Utility
 * 
 * Client-side rate limiting to prevent abuse via DevTools
 * and protect against DoS attacks.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
    blocked: boolean;
}

// In-memory rate limit storage
const rateLimits: Map<string, RateLimitEntry> = new Map();

// Default limits for different actions
const DEFAULT_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
    createSale: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
    cashTransfer: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
    createProduct: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
    updateProduct: { maxRequests: 50, windowMs: 60000 }, // 50 per minute
    deleteProduct: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
    createBackup: { maxRequests: 5, windowMs: 300000 }, // 5 per 5 minutes
    restoreBackup: { maxRequests: 3, windowMs: 600000 }, // 3 per 10 minutes
    login: { maxRequests: 5, windowMs: 300000 }, // 5 per 5 minutes
    default: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
};

/**
 * Check if action is rate limited
 * @param action - The action identifier
 * @param maxRequests - Maximum requests allowed in window (optional, uses defaults)
 * @param windowMs - Time window in milliseconds (optional, uses defaults)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
    action: string,
    maxRequests?: number,
    windowMs?: number
): boolean {
    const now = Date.now();
    const defaults = DEFAULT_LIMITS[action] || DEFAULT_LIMITS.default;
    const max = maxRequests ?? defaults.maxRequests;
    const window = windowMs ?? defaults.windowMs;

    const entry = rateLimits.get(action);

    // First request or window expired
    if (!entry || now > entry.resetAt) {
        rateLimits.set(action, {
            count: 1,
            resetAt: now + window,
            blocked: false,
        });
        return true;
    }

    // Check if blocked
    if (entry.blocked) {
        const remainingMs = entry.resetAt - now;
        if (remainingMs > 0) {
            console.warn(`[RateLimit] ${action} blocked for ${Math.ceil(remainingMs / 1000)}s`);
            return false;
        }
        // Block expired, reset
        rateLimits.set(action, {
            count: 1,
            resetAt: now + window,
            blocked: false,
        });
        return true;
    }

    // Check if limit exceeded
    if (entry.count >= max) {
        entry.blocked = true;
        console.warn(`[RateLimit] ${action} rate limit exceeded (${max} per ${window}ms)`);
        return false;
    }

    // Increment counter
    entry.count++;
    return true;
}

/**
 * Get remaining requests for an action
 */
export function getRemainingRequests(action: string): number {
    const defaults = DEFAULT_LIMITS[action] || DEFAULT_LIMITS.default;
    const entry = rateLimits.get(action);

    if (!entry || Date.now() > entry.resetAt) {
        return defaults.maxRequests;
    }

    return Math.max(0, defaults.maxRequests - entry.count);
}

/**
 * Get time until rate limit resets
 */
export function getResetTime(action: string): number {
    const entry = rateLimits.get(action);
    if (!entry) return 0;

    const remaining = entry.resetAt - Date.now();
    return Math.max(0, remaining);
}

/**
 * Clear rate limit for an action (for testing/admin use)
 */
export function clearRateLimit(action: string): void {
    rateLimits.delete(action);
}

/**
 * Clear all rate limits (for testing/admin use)
 */
export function clearAllRateLimits(): void {
    rateLimits.clear();
}

/**
 * Rate limit decorator for async functions
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
    action: string,
    fn: T,
    errorMessage = 'Terlalu banyak request, coba lagi nanti'
): T {
    return (async (...args: Parameters<T>) => {
        if (!checkRateLimit(action)) {
            const resetTime = getResetTime(action);
            const seconds = Math.ceil(resetTime / 1000);
            throw new Error(`${errorMessage} (${seconds} detik)`);
        }
        return fn(...args);
    }) as T;
}

/**
 * Middleware-style rate limit check that throws on failure
 */
export function enforceRateLimit(
    action: string,
    errorMessage = 'Terlalu banyak request, coba lagi nanti'
): void {
    if (!checkRateLimit(action)) {
        const resetTime = getResetTime(action);
        const seconds = Math.ceil(resetTime / 1000);
        throw new Error(`${errorMessage} (${seconds} detik)`);
    }
}

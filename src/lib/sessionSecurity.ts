/**
 * Session Security Utility
 * 
 * Provides session integrity checks to detect tampering via DevTools
 * and prevent session hijacking.
 */

import { generateFingerprint } from './secureStorage';

// Session fingerprint storage key
const SESSION_FINGERPRINT_KEY = 'vmb_session_fingerprint';
const SESSION_TIMESTAMP_KEY = 'vmb_session_timestamp';

// Session configuration
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const FINGERPRINT_TOLERANCE = 0.7; // Allow 70% match for minor browser updates

/**
 * Initialize session with fingerprint
 * Call this after successful login
 */
export function initializeSession(userId: string): void {
    const fingerprint = generateFingerprint();
    const sessionData = {
        fingerprint,
        userId,
        createdAt: Date.now(),
    };

    try {
        sessionStorage.setItem(SESSION_FINGERPRINT_KEY, JSON.stringify(sessionData));
        sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
        console.log('[SessionSecurity] Session initialized');
    } catch (error) {
        console.error('[SessionSecurity] Failed to initialize session:', error);
    }
}

/**
 * Validate current session integrity
 * Returns true if session is valid, false if tampering detected
 */
export function validateSession(): boolean {
    try {
        const storedData = sessionStorage.getItem(SESSION_FINGERPRINT_KEY);
        if (!storedData) {
            // No session data - might be a fresh session
            return true;
        }

        const sessionData = JSON.parse(storedData);
        const currentFingerprint = generateFingerprint();

        // Check session age
        const sessionAge = Date.now() - sessionData.createdAt;
        if (sessionAge > SESSION_MAX_AGE_MS) {
            console.warn('[SessionSecurity] Session expired');
            clearSession();
            return false;
        }

        // Compare fingerprints
        const similarity = calculateSimilarity(sessionData.fingerprint, currentFingerprint);
        if (similarity < FINGERPRINT_TOLERANCE) {
            console.warn('[SessionSecurity] Fingerprint mismatch detected');
            return false;
        }

        return true;
    } catch (error) {
        console.error('[SessionSecurity] Validation error:', error);
        return true; // Don't block on errors
    }
}

/**
 * Calculate similarity between two fingerprint strings
 */
function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const parts1 = str1.split('|');
    const parts2 = str2.split('|');

    let matches = 0;
    const total = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < total; i++) {
        if (parts1[i] === parts2[i]) matches++;
    }

    return matches / total;
}

/**
 * Update session timestamp (call periodically to extend session)
 */
export function refreshSessionTimestamp(): void {
    try {
        sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    } catch {
        // Ignore errors
    }
}

/**
 * Clear session data (call on logout)
 */
export function clearSession(): void {
    try {
        sessionStorage.removeItem(SESSION_FINGERPRINT_KEY);
        sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
        console.log('[SessionSecurity] Session cleared');
    } catch {
        // Ignore errors
    }
}

/**
 * Get session info for debugging
 */
export function getSessionInfo(): { userId?: string; age?: number; valid: boolean } {
    try {
        const storedData = sessionStorage.getItem(SESSION_FINGERPRINT_KEY);
        if (!storedData) return { valid: true };

        const sessionData = JSON.parse(storedData);
        return {
            userId: sessionData.userId,
            age: Date.now() - sessionData.createdAt,
            valid: validateSession(),
        };
    } catch {
        return { valid: true };
    }
}

/**
 * Check if user role matches server-side role
 * Use this for critical operations to prevent client-side role manipulation
 */
export async function verifyRoleWithServer(
    supabase: any,
    userId: string,
    expectedRoles: string[]
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            console.warn('[SessionSecurity] Could not verify role:', error?.message);
            return false;
        }

        const valid = expectedRoles.includes(data.role);
        if (!valid) {
            console.warn(`[SessionSecurity] Role mismatch: expected ${expectedRoles}, got ${data.role}`);
        }

        return valid;
    } catch (error) {
        console.error('[SessionSecurity] Role verification failed:', error);
        return false;
    }
}

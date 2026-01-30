/**
 * Secure Storage Utility
 * 
 * Provides encrypted localStorage operations using Web Crypto API (AES-GCM)
 * to prevent sensitive data from being read via DevTools.
 */

// Encryption configuration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

// Key derivation cache
let cachedKey: CryptoKey | null = null;
let cachedKeyId: string | null = null;

/**
 * Generate a browser fingerprint for key derivation
 * Combines multiple browser characteristics for device binding
 */
export function generateFingerprint(): string {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width.toString(),
        screen.height.toString(),
        screen.colorDepth.toString(),
        new Date().getTimezoneOffset().toString(),
        navigator.hardwareConcurrency?.toString() || '0',
    ];
    return components.join('|');
}

/**
 * Derive an encryption key from password and salt using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Get or create encryption key for the current session
 * Key is derived from browser fingerprint + optional user ID
 */
async function getEncryptionKey(userId?: string): Promise<CryptoKey> {
    const keyId = `${generateFingerprint()}_${userId || 'anonymous'}`;

    // Return cached key if same identity
    if (cachedKey && cachedKeyId === keyId) {
        return cachedKey;
    }

    // Check for stored salt or generate new one
    const SALT_KEY = 'vmb_security_salt';
    let saltBase64 = localStorage.getItem(SALT_KEY);
    let salt: Uint8Array;

    if (saltBase64) {
        salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
    } else {
        salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)));
    }

    cachedKey = await deriveKey(keyId, salt);
    cachedKeyId = keyId;
    return cachedKey;
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(data: any, userId?: string): Promise<string> {
    try {
        const key = await getEncryptionKey(userId);
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const encoder = new TextEncoder();
        const dataString = JSON.stringify(data);

        const encrypted = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv },
            key,
            encoder.encode(dataString)
        );

        // Combine IV + encrypted data and encode as base64
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);

        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('[SecureStorage] Encryption failed:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(encryptedBase64: string, userId?: string): Promise<any> {
    try {
        const key = await getEncryptionKey(userId);
        const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

        // Extract IV and encrypted data
        const iv = combined.slice(0, IV_LENGTH);
        const encrypted = combined.slice(IV_LENGTH);

        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv },
            key,
            encrypted
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
        console.error('[SecureStorage] Decryption failed:', error);
        return null;
    }
}

/**
 * Get encrypted item from localStorage and decrypt
 */
export async function getSecureItem<T = any>(key: string, userId?: string): Promise<T | null> {
    try {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        // Try to parse as plain JSON first (for migration)
        try {
            const parsed = JSON.parse(encrypted);
            // If it's valid JSON, migrate to encrypted
            console.log(`[SecureStorage] Migrating ${key} to encrypted storage`);
            await setSecureItem(key, parsed, userId);
            return parsed as T;
        } catch {
            // Not plain JSON, try to decrypt
        }

        return await decryptData(encrypted, userId) as T;
    } catch (error) {
        console.error(`[SecureStorage] Failed to get ${key}:`, error);
        return null;
    }
}

/**
 * Encrypt and save item to localStorage
 */
export async function setSecureItem(key: string, data: any, userId?: string): Promise<void> {
    try {
        const encrypted = await encryptData(data, userId);
        localStorage.setItem(key, encrypted);
    } catch (error) {
        console.error(`[SecureStorage] Failed to set ${key}:`, error);
        throw error;
    }
}

/**
 * Remove item from localStorage
 */
export function removeSecureItem(key: string): void {
    localStorage.removeItem(key);
}

/**
 * Calculate SHA-256 checksum of data for integrity verification
 */
export async function calculateChecksum(data: any): Promise<string> {
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate data integrity using checksum
 */
export async function validateChecksum(data: any, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await calculateChecksum(data);
    return actualChecksum === expectedChecksum;
}

/**
 * Clear encryption key cache (call on logout)
 */
export function clearKeyCache(): void {
    cachedKey = null;
    cachedKeyId = null;
}

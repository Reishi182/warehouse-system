/**
 * Input Validation Utility
 * 
 * Centralized validation for all critical mutations to prevent
 * malicious API requests via DevTools Network tab.
 */

// ==========================================
// SALE VALIDATION
// ==========================================

export const saleValidation = {
    /**
     * Validate quantity is a positive integer within reasonable bounds
     */
    validateQuantity: (qty: number): boolean => {
        return (
            typeof qty === 'number' &&
            Number.isFinite(qty) &&
            qty > 0 &&
            qty <= 10000
        );
    },

    /**
     * Validate price is non-negative and within bounds
     */
    validatePrice: (price: number): boolean => {
        return (
            typeof price === 'number' &&
            price >= 0 &&
            price <= 999999999 &&
            Number.isFinite(price)
        );
    },

    /**
     * Validate sale items array
     */
    validateItems: (items: any[]): boolean => {
        return (
            Array.isArray(items) &&
            items.length > 0 &&
            items.length <= 100
        );
    },

    /**
     * Validate payment method
     */
    validatePaymentMethod: (method: string): boolean => {
        const validMethods = ['cash', 'transfer', 'qris', 'debit', 'credit'];
        return validMethods.includes(method);
    },

    /**
     * Validate stock location
     */
    validateStockLocation: (location: string): boolean => {
        const validLocations = ['gudang', 'toko'];
        return validLocations.includes(location);
    },
};

// ==========================================
// CASH TRANSFER VALIDATION
// ==========================================

export const cashTransferValidation = {
    /**
     * Validate transfer amount
     */
    validateAmount: (amount: number): boolean => {
        return (
            typeof amount === 'number' &&
            amount > 0 &&
            amount <= 1000000000 &&
            Number.isFinite(amount)
        );
    },

    /**
     * Validate transfer date format (YYYY-MM-DD)
     */
    validateDate: (date: string): boolean => {
        if (!date) return true; // Optional field
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(date)) return false;
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
    },
};

// ==========================================
// PRODUCT VALIDATION
// ==========================================

export const productValidation = {
    /**
     * Validate product name
     */
    validateName: (name: string): boolean => {
        return (
            typeof name === 'string' &&
            name.trim().length >= 1 &&
            name.trim().length <= 255
        );
    },

    /**
     * Validate barcode format
     */
    validateBarcode: (barcode: string): boolean => {
        if (!barcode) return true; // Optional
        return (
            typeof barcode === 'string' &&
            barcode.length <= 50 &&
            /^[a-zA-Z0-9-_]+$/.test(barcode)
        );
    },

    /**
     * Validate stock quantity
     */
    validateStock: (stock: number): boolean => {
        return (
            typeof stock === 'number' &&
            Number.isFinite(stock) &&
            stock >= 0 &&
            stock <= 9999999
        );
    },

    /**
     * Validate price
     */
    validatePrice: (price: number): boolean => {
        return saleValidation.validatePrice(price);
    },
};

// ==========================================
// BACKUP VALIDATION
// ==========================================

export const backupValidation = {
    /**
     * Validate backup name
     */
    validateName: (name: string): boolean => {
        return (
            typeof name === 'string' &&
            name.trim().length >= 1 &&
            name.trim().length <= 100
        );
    },

    /**
     * Validate backup data structure
     */
    validateData: (data: any): boolean => {
        if (!data || typeof data !== 'object') return false;

        // Must have at least some expected tables
        const expectedTables = ['products', 'sales', 'customers'];
        const hasSomeTables = expectedTables.some(table =>
            data[table] && Array.isArray(data[table])
        );

        return hasSomeTables;
    },
};

// ==========================================
// UUID VALIDATION
// ==========================================

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

// ==========================================
// GENERIC VALIDATION WRAPPER
// ==========================================

/**
 * Validate and execute mutation
 * Throws error if validation fails
 */
export async function validateAndMutate<T>(
    validation: () => boolean,
    mutation: () => Promise<T>,
    errorMessage = 'Validation failed - invalid input detected'
): Promise<T> {
    if (!validation()) {
        throw new Error(errorMessage);
    }
    return mutation();
}

/**
 * Sanitize string input (remove potential XSS)
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

/**
 * Validate and sanitize note/description fields
 */
export function validateNote(note: string | null | undefined): string | null {
    if (!note) return null;
    if (typeof note !== 'string') return null;
    if (note.length > 1000) return note.substring(0, 1000);
    return sanitizeString(note);
}

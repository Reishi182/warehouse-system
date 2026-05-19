/**
 * Offline Queue System for POS Transactions
 * 
 * This module handles:
 * 1. Storing transactions locally when offline
 * 2. Syncing to server when back online
 * 3. Providing sync status feedback
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export interface OfflineSale {
    id: string; // local UUID
    saleNumber: string;
    cashierId: string;
    cashierName: string;
    paymentMethod: 'cash' | 'transfer' | 'split';
    stockLocation: 'gudang' | 'toko';
    items: Array<{
        productId: string | null; // Bug fix #3: null for manual entries
        productName: string;
        barcode: string;
        quantity: number;
        price: number;
        discount: number;
        subtotal: number;
        isManualEntry?: boolean; // Bug fix #3: track manual entries
        stockDeductQty?: number; // Multi-unit: base units to deduct (e.g. 1 box = 70 pcs)
    }>;
    totalAmount: number;
    orderDiscount: number;
    amountPaid: number;
    changeAmount: number;
    amountCash?: number;
    amountTransfer?: number;
    createdAt: string;
    synced: boolean;
    syncError?: string;
    // Bug fix #3: Credit transaction fields
    isCredit?: boolean;
    creditCustomerName?: string;
}

export interface SyncStatus {
    pending: number;
    failed: number;
    lastSync: string | null;
    isSyncing: boolean;
}

const STORAGE_KEY = 'vmb_offline_sales';
const SYNC_STATUS_KEY = 'vmb_sync_status';

// Generate a simple UUID (for offline use)
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Get all offline sales from localStorage
export function getOfflineSales(): OfflineSale[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

// Save offline sales to localStorage
function saveOfflineSales(sales: OfflineSale[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    } catch (e) {
        console.error('[OfflineQueue] Failed to save to localStorage:', e);
    }
}

// Add a new sale to the offline queue
export function addOfflineSale(sale: Omit<OfflineSale, 'id' | 'synced'>): OfflineSale {
    const newSale: OfflineSale = {
        ...sale,
        id: generateUUID(),
        synced: false,
    };

    const sales = getOfflineSales();
    sales.push(newSale);
    saveOfflineSales(sales);

    console.log('[OfflineQueue] Added sale to queue:', newSale.saleNumber);
    return newSale;
}

// Mark a sale as synced
export function markSaleAsSynced(id: string): void {
    const sales = getOfflineSales();
    const index = sales.findIndex(s => s.id === id);
    if (index >= 0) {
        sales[index].synced = true;
        sales[index].syncError = undefined;
        saveOfflineSales(sales);
    }
}

// Mark a sale as failed with error
export function markSaleAsFailed(id: string, error: string): void {
    const sales = getOfflineSales();
    const index = sales.findIndex(s => s.id === id);
    if (index >= 0) {
        sales[index].syncError = error;
        saveOfflineSales(sales);
    }
}

// Remove synced sales (cleanup)
export function removeSyncedSales(): void {
    const sales = getOfflineSales();
    const pendingSales = sales.filter(s => !s.synced);
    saveOfflineSales(pendingSales);
}

// Get sync status
export function getSyncStatus(): SyncStatus {
    const sales = getOfflineSales();
    const pending = sales.filter(s => !s.synced).length;
    const failed = sales.filter(s => s.syncError).length;

    try {
        const statusData = localStorage.getItem(SYNC_STATUS_KEY);
        const status = statusData ? JSON.parse(statusData) : {};
        return {
            pending,
            failed,
            lastSync: status.lastSync || null,
            isSyncing: false,
        };
    } catch {
        return { pending, failed, lastSync: null, isSyncing: false };
    }
}

// Update last sync time
function updateLastSync(): void {
    try {
        localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
            lastSync: new Date().toISOString(),
        }));
    } catch {
        // Ignore
    }
}

// Sync a single sale to server
async function syncSaleToServer(sale: OfflineSale): Promise<boolean> {
    try {
        // Bug fix #14: Check for duplicate sale_number before inserting
        const { data: existing } = await supabase
            .from('sales')
            .select('id')
            .eq('sale_number', sale.saleNumber)
            .maybeSingle();

        if (existing) {
            console.log('[Sync] Sale already exists, skipping:', sale.saleNumber);
            return true; // Already synced
        }

        // 1. Insert sale record
        const { data: saleRow, error: saleError } = await supabase
            .from('sales')
            .insert({
                sale_number: sale.saleNumber,
                cashier_id: sale.cashierId,
                cashier_name: sale.cashierName,
                payment_method: sale.paymentMethod,
                stock_location: sale.stockLocation,
                total_amount: sale.totalAmount,
                order_discount: sale.orderDiscount,
                amount_paid: sale.amountPaid,
                change_amount: sale.changeAmount,
                amount_cash: sale.amountCash,
                amount_transfer: sale.amountTransfer,
                created_at: sale.createdAt, // Use original offline timestamp
                // Bug fix #3: Include credit fields
                is_credit: sale.isCredit || false,
                credit_customer_name: sale.isCredit ? sale.creditCustomerName : null,
            })
            .select()
            .single();

        if (saleError || !saleRow) {
            throw new Error(saleError?.message || 'Failed to insert sale');
        }

        // 2. Insert sale items
        const saleItems = sale.items.map(it => ({
            sale_id: saleRow.id,
            product_id: it.productId,
            product_name: it.productName,
            barcode: it.barcode,
            quantity: it.quantity,
            price: it.price,
            subtotal: it.subtotal,
            discount: it.discount,
        }));

        const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
        if (itemsError) {
            throw new Error(`Items error: ${itemsError.message}`);
        }

        // 3. Update stock for each item (skip manual entries)
        for (const item of sale.items) {
            // Bug fix #3: Skip manual entries for stock update
            if (item.isManualEntry || !item.productId) continue;

            const stockField = `stock_${sale.stockLocation}`;
            // Bug fix: Use stockDeductQty for multi-unit products (e.g. 1 box = 70 pcs)
            const deductQty = item.stockDeductQty || item.quantity;

            // Get current stock
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('stock_gudang, stock_toko')
                .eq('id', item.productId)
                .single();

            if (productError || !product) {
                console.warn(`[Sync] Product ${item.productId} not found, skipping stock update`);
                continue;
            }

            const currentStock = sale.stockLocation === 'gudang'
                ? product.stock_gudang
                : product.stock_toko;

            // Bug fix #7: Check if deducting would make stock negative
            if (currentStock < deductQty) {
                console.warn(`[Sync] Insufficient stock for ${item.productId}: have ${currentStock}, need ${deductQty}. Clamping to 0.`);
            }
            const newStock = Math.max(0, currentStock - deductQty);

            await supabase
                .from('products')
                .update({ [stockField]: newStock })
                .eq('id', item.productId);

            // Log stock change with reference_type for audit trail
            await supabase.from('stock_logs').insert({
                product_id: item.productId,
                type: 'out',
                quantity: deductQty,
                location: sale.stockLocation,
                user_id: sale.cashierId,
                note: `Penjualan ${sale.saleNumber} (offline sync)`,
                stock_before: currentStock,
                stock_after: newStock,
                reference_type: 'sale',
                reference_id: saleRow.id,
            });
        }

        console.log('[Sync] Successfully synced sale:', sale.saleNumber);
        return true;
    } catch (error) {
        console.error('[Sync] Failed to sync sale:', sale.saleNumber, error);
        throw error;
    }
}

// Sync all pending sales
export async function syncPendingSales(
    onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
    const sales = getOfflineSales();
    const pendingSales = sales.filter(s => !s.synced);

    if (pendingSales.length === 0) {
        return { success: 0, failed: 0 };
    }

    console.log(`[Sync] Starting sync of ${pendingSales.length} pending sales...`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < pendingSales.length; i++) {
        const sale = pendingSales[i];
        onProgress?.(i + 1, pendingSales.length);

        try {
            await syncSaleToServer(sale);
            markSaleAsSynced(sale.id);
            success++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            markSaleAsFailed(sale.id, errorMessage);
            failed++;
        }
    }

    updateLastSync();

    // Clean up synced sales after successful sync
    if (success > 0) {
        removeSyncedSales();
    }

    console.log(`[Sync] Completed: ${success} success, ${failed} failed`);
    return { success, failed };
}

// Check if we're online
export function isOnline(): boolean {
    return navigator.onLine;
}

// Listen for online/offline events
export function setupOnlineListener(onOnline: () => void, onOffline: () => void): () => void {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
    };
}

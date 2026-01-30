/**
 * Backup Manager - Client-side backup and restore system
 * 
 * Features:
 * 1. Auto Snapshot - Save data to localStorage every 30 minutes
 * 2. Server Backup - Upload snapshots to Supabase backups table
 * 3. 1-Click Restore - Restore data from any snapshot
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export interface BackupSnapshot {
    id: string;
    name: string;
    createdAt: string;
    createdBy?: string;
    source: 'local' | 'server';
    sizeBytes: number;
    tablesIncluded: string[];
    data: BackupData;
}

export interface BackupData {
    products?: any[];
    product_stocks?: any[];
    customers?: any[];
    suppliers?: any[];
    sales?: any[];
    sale_items?: any[];
    purchase_orders?: any[];
    purchase_order_items?: any[];
    stock_logs?: any[];
    surat_jalans?: any[];
    surat_jalan_items?: any[];
    stock_requests?: any[];
    stock_request_items?: any[];
    marketplace_orders?: any[];
    marketplace_order_items?: any[];
    invoices?: any[];
    invoice_items?: any[];
    backorders?: any[];
    other_transactions?: any[];
}

export interface BackupProgress {
    stage: 'fetching' | 'saving' | 'complete' | 'error';
    currentTable?: string;
    tablesCompleted: number;
    totalTables: number;
    message: string;
}

// Constants
const LOCAL_SNAPSHOTS_KEY = 'vmb_backup_snapshots';
const LAST_AUTO_BACKUP_KEY = 'vmb_last_auto_backup';
const AUTO_BACKUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_LOCAL_SNAPSHOTS = 5;

// Tables to backup (in order of importance)
const BACKUP_TABLES = [
    // Core data
    'products',
    'product_stocks',
    'customers',
    'suppliers',
    'profiles',
    'store_settings',
    // Sales & Transactions
    'sales',
    'sale_items',
    'cash_transfers',
    'cash_transfer_requests',
    'other_transactions',
    // Purchase Orders
    'purchase_orders',
    'purchase_order_items',
    'po_receipts',
    'po_claims',
    // Stock Management
    'stock_logs',
    'stock_requests',
    'stock_request_items',
    'stock_out_requests',
    'stock_returns',
    'stock_return_items',
    'stock_shipments',
    // Surat Jalan
    'surat_jalan',
    'surat_jalan_items',
    'goods_receipts',
    'goods_issue_notes',
    // Marketplace
    'marketplace_orders',
    'marketplace_order_items',
    'marketplace_returns',
    // Invoices
    'invoices',
    'invoice_items',
    // Direct Orders
    'direct_orders',
    'direct_order_items',
    // Customer Exchanges
    'customer_exchanges',
    'exchange_returned_items',
    'exchange_new_items',
    // Backorders
    'backorders',
    // Notifications & Activity
    'notifications',
    'activity_logs',
] as const;

// Generate UUID
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Calculate size of JSON data
function calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==========================================
// LOCAL SNAPSHOT FUNCTIONS
// ==========================================

// Get all local snapshots
export function getLocalSnapshots(): BackupSnapshot[] {
    try {
        const data = localStorage.getItem(LOCAL_SNAPSHOTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

// Save snapshots to localStorage
function saveLocalSnapshots(snapshots: BackupSnapshot[]): void {
    try {
        // Keep only last N snapshots
        const trimmed = snapshots.slice(-MAX_LOCAL_SNAPSHOTS);
        localStorage.setItem(LOCAL_SNAPSHOTS_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error('[Backup] Failed to save to localStorage:', e);
    }
}

// Delete a local snapshot
export function deleteLocalSnapshot(id: string): void {
    const snapshots = getLocalSnapshots();
    const filtered = snapshots.filter(s => s.id !== id);
    saveLocalSnapshots(filtered);
}

// Get last auto backup time
export function getLastAutoBackupTime(): Date | null {
    try {
        const time = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
        return time ? new Date(time) : null;
    } catch {
        return null;
    }
}

// Set last auto backup time
function setLastAutoBackupTime(): void {
    try {
        localStorage.setItem(LAST_AUTO_BACKUP_KEY, new Date().toISOString());
    } catch {
        // Ignore
    }
}

// Check if auto backup is needed
export function isAutoBackupNeeded(): boolean {
    const lastBackup = getLastAutoBackupTime();
    if (!lastBackup) return true;

    const elapsed = Date.now() - lastBackup.getTime();
    return elapsed >= AUTO_BACKUP_INTERVAL_MS;
}

// ==========================================
// FETCH DATA FUNCTIONS
// ==========================================

// Fetch all data from a table
async function fetchTableData(tableName: string): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (error) {
            console.warn(`[Backup] Could not fetch ${tableName}:`, error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        console.warn(`[Backup] Error fetching ${tableName}:`, e);
        return [];
    }
}

// ==========================================
// CREATE SNAPSHOT
// ==========================================

export async function createSnapshot(
    name: string,
    onProgress?: (progress: BackupProgress) => void
): Promise<BackupSnapshot> {
    const data: BackupData = {};
    const tablesIncluded: string[] = [];

    // Fetch each table
    for (let i = 0; i < BACKUP_TABLES.length; i++) {
        const tableName = BACKUP_TABLES[i];

        onProgress?.({
            stage: 'fetching',
            currentTable: tableName,
            tablesCompleted: i,
            totalTables: BACKUP_TABLES.length,
            message: `Mengambil data ${tableName}...`,
        });

        const tableData = await fetchTableData(tableName);
        if (tableData.length > 0) {
            (data as any)[tableName] = tableData;
            tablesIncluded.push(tableName);
        }
    }

    onProgress?.({
        stage: 'saving',
        tablesCompleted: BACKUP_TABLES.length,
        totalTables: BACKUP_TABLES.length,
        message: 'Menyimpan snapshot...',
    });

    const snapshot: BackupSnapshot = {
        id: generateUUID(),
        name,
        createdAt: new Date().toISOString(),
        source: 'local',
        sizeBytes: calculateSize(data),
        tablesIncluded,
        data,
    };

    // Save to localStorage
    const snapshots = getLocalSnapshots();
    snapshots.push(snapshot);
    saveLocalSnapshots(snapshots);

    onProgress?.({
        stage: 'complete',
        tablesCompleted: BACKUP_TABLES.length,
        totalTables: BACKUP_TABLES.length,
        message: 'Snapshot berhasil dibuat!',
    });

    return snapshot;
}

// Create auto snapshot
export async function createAutoSnapshot(): Promise<BackupSnapshot | null> {
    if (!isAutoBackupNeeded()) {
        console.log('[Backup] Auto backup not needed yet');
        return null;
    }

    try {
        const timestamp = new Date().toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const snapshot = await createSnapshot(`Auto Backup - ${timestamp}`);
        setLastAutoBackupTime();
        console.log('[Backup] Auto snapshot created:', snapshot.id);
        return snapshot;
    } catch (e) {
        console.error('[Backup] Auto snapshot failed:', e);
        return null;
    }
}

// ==========================================
// SERVER BACKUP FUNCTIONS
// ==========================================

export async function saveSnapshotToServer(
    snapshot: BackupSnapshot,
    userId?: string
): Promise<boolean> {
    try {
        // Check if backups table exists by trying to insert
        const { error } = await supabase.from('backups').insert({
            id: snapshot.id,
            name: snapshot.name,
            created_by: userId,
            data: snapshot.data,
            size_bytes: snapshot.sizeBytes,
            tables_included: snapshot.tablesIncluded,
        });

        if (error) {
            // If table doesn't exist, log but don't fail
            if (error.message.includes('does not exist')) {
                console.warn('[Backup] Backups table not found. Run migration first.');
                return false;
            }
            throw error;
        }

        console.log('[Backup] Snapshot saved to server:', snapshot.id);
        return true;
    } catch (e) {
        console.error('[Backup] Failed to save to server:', e);
        return false;
    }
}

export async function getServerSnapshots(): Promise<BackupSnapshot[]> {
    try {
        const { data, error } = await supabase
            .from('backups')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            if (error.message.includes('does not exist')) {
                return [];
            }
            throw error;
        }

        return (data || []).map(row => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            createdBy: row.created_by,
            source: 'server' as const,
            sizeBytes: row.size_bytes || 0,
            tablesIncluded: row.tables_included || [],
            data: row.data,
        }));
    } catch (e) {
        console.error('[Backup] Failed to get server snapshots:', e);
        return [];
    }
}

export async function deleteServerSnapshot(id: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('backups').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('[Backup] Failed to delete server snapshot:', e);
        return false;
    }
}

// ==========================================
// RESTORE FUNCTIONS
// ==========================================

export interface RestoreResult {
    success: boolean;
    tablesRestored: string[];
    recordsRestored: number;
    errors: string[];
}

export async function restoreFromSnapshot(
    snapshot: BackupSnapshot,
    onProgress?: (progress: BackupProgress) => void
): Promise<RestoreResult> {
    const result: RestoreResult = {
        success: false,
        tablesRestored: [],
        recordsRestored: 0,
        errors: [],
    };

    const { data } = snapshot;
    const tables = Object.keys(data).filter(k => Array.isArray((data as any)[k]));

    for (let i = 0; i < tables.length; i++) {
        const tableName = tables[i];
        const tableData = (data as any)[tableName] as any[];

        if (!tableData || tableData.length === 0) continue;

        onProgress?.({
            stage: 'saving',
            currentTable: tableName,
            tablesCompleted: i,
            totalTables: tables.length,
            message: `Memulihkan ${tableName} (${tableData.length} records)...`,
        });

        try {
            // Upsert data (insert or update on conflict)
            const { error } = await supabase
                .from(tableName)
                .upsert(tableData, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                });

            if (error) {
                result.errors.push(`${tableName}: ${error.message}`);
            } else {
                result.tablesRestored.push(tableName);
                result.recordsRestored += tableData.length;
            }
        } catch (e) {
            result.errors.push(`${tableName}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }

    result.success = result.errors.length === 0;

    onProgress?.({
        stage: result.success ? 'complete' : 'error',
        tablesCompleted: tables.length,
        totalTables: tables.length,
        message: result.success
            ? `Berhasil memulihkan ${result.recordsRestored} records!`
            : `Selesai dengan ${result.errors.length} error`,
    });

    return result;
}

// ==========================================
// EXPORT/IMPORT JSON FILE
// ==========================================

export function downloadSnapshotAsFile(snapshot: BackupSnapshot): void {
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${snapshot.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function parseSnapshotFromFile(fileContent: string): BackupSnapshot | null {
    try {
        const parsed = JSON.parse(fileContent);

        // Validate structure
        if (!parsed.id || !parsed.data || !parsed.createdAt) {
            throw new Error('Invalid snapshot format');
        }

        return {
            ...parsed,
            source: 'local' as const,
        };
    } catch (e) {
        console.error('[Backup] Failed to parse snapshot file:', e);
        return null;
    }
}

// ==========================================
// AUTO BACKUP SCHEDULER
// ==========================================

let autoBackupInterval: NodeJS.Timeout | null = null;

export function startAutoBackup(): void {
    if (autoBackupInterval) return;

    // Initial check
    createAutoSnapshot();

    // Schedule periodic checks
    autoBackupInterval = setInterval(() => {
        createAutoSnapshot();
    }, 5 * 60 * 1000); // Check every 5 minutes

    console.log('[Backup] Auto backup scheduler started');
}

export function stopAutoBackup(): void {
    if (autoBackupInterval) {
        clearInterval(autoBackupInterval);
        autoBackupInterval = null;
        console.log('[Backup] Auto backup scheduler stopped');
    }
}

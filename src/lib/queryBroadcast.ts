/**
 * ═══════════════════════════════════════════════════════════════════
 * QUERY INVALIDATION WITH AUTO-BROADCAST
 * ═══════════════════════════════════════════════════════════════════
 *
 * Drop-in replacement for queryClient.invalidateQueries that
 * ALSO broadcasts the change to other clients via broadcast channel.
 *
 * Usage (in mutation onSuccess):
 *   import { invalidateAndBroadcast } from '@/lib/queryBroadcast';
 *   invalidateAndBroadcast(queryClient, ['purchase_orders', 'products']);
 *
 * This will:
 *   1. Call queryClient.invalidateQueries for each key (local update)
 *   2. Broadcast the invalidation to other clients (cross-tab/device sync)
 */

import type { QueryClient } from '@tanstack/react-query';
import { broadcastTableChange } from './broadcastSync';

/**
 * Query key → table name mapping.
 * Used to determine which table changed for broadcast.
 */
const QUERY_KEY_TO_TABLE: Record<string, string> = {
  'products': 'products',
  'sales': 'sales',
  'sales-history': 'sales',
  'stock-requests': 'stock_requests',
  'cash-transfer-requests': 'cash_transfer_requests',
  'purchase_orders': 'purchase_orders',
  'purchase_order': 'purchase_orders',
  'stock-shipments': 'stock_shipments',
  'stock-returns': 'stock_returns',
  'surat-jalan': 'surat_jalan',
  'surat-jalan-b2b': 'surat_jalan',
  'goods-issue-notes': 'goods_issue_notes',
  'marketplace-orders': 'marketplace_orders',
  'marketplace-returns': 'marketplace_returns',
  'direct-orders': 'direct_orders',
  'cash-transfers': 'cash_transfers',
  'cash-history': 'cash_transfers',
  'backorders': 'backorders',
  'invoices': 'invoices',
  'expenses': 'expenses',
  'cash-flow': 'expenses',
  'stock-opname-sessions': 'stock_opname_sessions',
  'stock-opname': 'stock_opname',
  'customers': 'customers',
  'customer-tabs': 'customer_tabs',
  'suppliers': 'suppliers',
  'store-settings': 'store_settings',
  'store_settings': 'store_settings',
  'stock-logs': 'stock_logs',
  'activity-logs': 'activity_logs',
  'product-audit-logs': 'product_audit_logs',
  'notifications': 'notifications',
  'po_receipt': 'po_receipts',
  'goods-receipts': 'stock_shipments',
  'sale-items': 'sale_items',
  'po-discrepancies': 'po_receipts',
  'cashier-sessions': 'cashier_sessions',
  'tokopedia-orders': 'tokopedia_orders',
  'credit-sales': 'sales',
  'scheduled-reports': 'scheduled_reports',
};

/**
 * Invalidate queries locally AND broadcast the change to other clients.
 *
 * @param queryClient - React Query client
 * @param queryKeys - Array of query key strings to invalidate
 * @param eventType - Type of change (default: 'UPDATE')
 */
export function invalidateAndBroadcast(
  queryClient: QueryClient,
  queryKeys: string[],
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' = 'UPDATE'
) {
  // 1. Local invalidation
  for (const key of queryKeys) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }

  // 2. Group by table to avoid duplicate broadcasts
  const broadcastedTables = new Set<string>();

  for (const key of queryKeys) {
    const table = QUERY_KEY_TO_TABLE[key];
    if (table && !broadcastedTables.has(table)) {
      broadcastedTables.add(table);
      broadcastTableChange(table, eventType, queryKeys);
    }
  }

  // 3. If no table mapping found, still broadcast with first key
  if (broadcastedTables.size === 0 && queryKeys.length > 0) {
    broadcastTableChange(queryKeys[0], eventType, queryKeys);
  }
}

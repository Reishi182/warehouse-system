/**
 * ═══════════════════════════════════════════════════════════════════
 * useBroadcastSync — React Hook for Receiving Broadcast Events
 * ═══════════════════════════════════════════════════════════════════
 *
 * Hook ini dipanggil SEKALI di root app (AppRoutes).
 * Fungsi:
 *   1. Initialize broadcast channel
 *   2. Listen untuk semua table change events
 *   3. Smart-patch React Query cache OR Zustand store
 *   4. Handle reconnection (re-fetch semua saat tab kembali aktif)
 *
 * Smart Patching Strategy:
 *   - INSERT: Prepend record ke cache
 *   - UPDATE: Replace record di cache by ID
 *   - DELETE: Remove record dari cache by ID
 *   - Fallback: invalidateQueries jika record tidak dikirim
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  initBroadcastChannel,
  subscribeToBroadcast,
  onReconnectNeeded,
  type BroadcastSyncEvent,
} from '@/lib/broadcastSync';
import { useDataStore } from '@/store/useDataStore';

/**
 * Table-to-QueryKey mapping for smart patching.
 * Only tables listed here will be smart-patched.
 * Others will fallback to invalidateQueries.
 */
const TABLE_QUERY_KEY_MAP: Record<string, string[]> = {
  products: ['products'],
  sales: ['sales', 'sales-history'],
  stock_requests: ['stock-requests'],
  cash_transfer_requests: ['cash-transfer-requests'],
  purchase_orders: ['purchase_orders', 'purchase_order'],
  stock_shipments: ['stock-shipments', 'goods-receipts'],
  stock_returns: ['stock-returns'],
  surat_jalan: ['surat-jalan', 'surat-jalan-b2b'],
  goods_issue_notes: ['goods-issue-notes'],
  marketplace_orders: ['marketplace-orders'],
  marketplace_returns: ['marketplace-returns'],
  direct_orders: ['direct-orders'],
  cash_transfers: ['cash-transfers', 'cash-history'],
  backorders: ['backorders'],
  invoices: ['invoices'],
  expenses: ['expenses', 'cash-flow'],
  stock_opname_sessions: ['stock-opname-sessions'],
  stock_opname_items: ['stock-opname-sessions'],
  customers: ['customers'],
  suppliers: ['suppliers'],
  store_settings: ['store-settings', 'store_settings'],
  stock_logs: ['stock-logs'],
  activity_logs: ['activity-logs'],
  sale_items: ['sales', 'sales-history'],
  stock_out_requests: ['stock-requests'],
  notifications: ['notifications'],
  stock_request_items: ['stock-requests'],
  customer_tabs: ['customer-tabs'],
  stock_opname: ['stock-opname'],
};

/**
 * Zustand store tables — these tables are managed by DataContext/Zustand
 * and need direct store patching in addition to React Query invalidation.
 */
const ZUSTAND_PATCHERS: Record<string, (event: BroadcastSyncEvent, store: ReturnType<typeof useDataStore.getState>) => void> = {
  products: (event, store) => {
    const mapProduct = (p: any) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      price: p.price,
      image_url: p.image_url,
      stock: { gudang: p.stock_gudang, toko: p.stock_toko },
      has_multi_unit: p.has_multi_unit ?? false,
      main_unit: p.main_unit ?? null,
      pcs_per_box: p.pcs_per_box ?? null,
      box_price: p.box_price ?? null,
      sell_by_quantity: p.sell_by_quantity ?? false,
      sell_unit: p.sell_unit ?? 'pcs',
      bulk_quantity: p.bulk_quantity ?? null,
      bulk_price: p.bulk_price ?? null,
      created_at: p.created_at,
      updated_at: p.updated_at,
    });

    if (event.eventType === 'UPDATE' && event.record) {
      store.setProducts((prev) => prev.map(p => p.id === event.record.id ? mapProduct(event.record) : p));
    } else if (event.eventType === 'INSERT' && event.record) {
      store.setProducts((prev) => [mapProduct(event.record), ...prev]);
    } else if (event.eventType === 'DELETE' && event.oldId) {
      store.setProducts((prev) => prev.filter(p => p.id !== event.oldId));
    }
  },

  sales: (event, store) => {
    if (event.eventType === 'INSERT' && event.record) {
      store.setSales((prev) => {
        // Check if already exists (avoid duplicates)
        if (prev.some(s => s.id === event.record.id)) return prev;
        return [event.record, ...prev];
      });
    } else if (event.eventType === 'UPDATE' && event.record) {
      store.setSales((prev) => prev.map(s => s.id === event.record.id ? { ...s, ...event.record } : s));
    } else if (event.eventType === 'DELETE' && event.oldId) {
      store.setSales((prev) => prev.filter(s => s.id !== event.oldId));
    }
  },

  notifications: (event, store) => {
    if (event.eventType === 'INSERT' && event.record) {
      store.setNotifications((prev) => {
        if (prev.some(n => n.id === event.record.id)) return prev;
        return [event.record, ...prev];
      });
    } else if (event.eventType === 'UPDATE' && event.record) {
      store.setNotifications((prev) => prev.map(n => n.id === event.record.id ? { ...n, ...event.record } : n));
    }
  },

  cash_transfers: (event, store) => {
    if (event.eventType === 'INSERT' && event.record) {
      store.setCashTransfers((prev) => {
        if (prev.some(c => c.id === event.record.id)) return prev;
        return [event.record, ...prev];
      });
    } else if (event.eventType === 'UPDATE' && event.record) {
      store.setCashTransfers((prev) => prev.map(c => c.id === event.record.id ? { ...c, ...event.record } : c));
    }
  },

  stock_logs: (event, store) => {
    if (event.eventType === 'INSERT' && event.record) {
      const l = event.record;
      const mappedLog = {
        id: l.id,
        product_id: l.product_id,
        product: l.products ? {
          id: l.products.id,
          name: l.products.name,
          barcode: l.products.barcode,
          price: l.products.price,
          image_url: l.products.image_url,
          stock: {
            gudang: l.products.stock_gudang,
            toko: l.products.stock_toko
          },
          created_at: l.products.created_at,
          updated_at: l.products.updated_at
        } : undefined,
        type: l.type,
        quantity: l.quantity,
        location: l.location,
        user_id: l.user_id,
        timestamp: l.timestamp,
        note: l.note,
        actor_name: l.actor_name,
        reference_type: l.reference_type,
        reference_id: l.reference_id,
        stock_before: l.stock_before,
        stock_after: l.stock_after
      };
      
      store.setStockLogs(prev => {
        if (prev.some(log => log.id === mappedLog.id)) return prev;
        return [mappedLog, ...prev];
      });
    }
  },
};

export function useBroadcastSync() {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {

    // 1. Initialize broadcast channel
    const cleanupChannel = initBroadcastChannel();

    // 2. Subscribe to events and smart-patch
    const unsubscribe = subscribeToBroadcast((event: BroadcastSyncEvent) => {
      const store = useDataStore.getState();

      // A. Try Zustand direct patching first (for stores that need it)
      const zustandPatcher = ZUSTAND_PATCHERS[event.table];
      if (zustandPatcher && event.record) {
        try {
          zustandPatcher(event, store);
        } catch (e) {
          console.error(`[BroadcastSync] Zustand patch error for ${event.table}:`, e);
        }
      }

      // B. Smart-patch React Query cache
      const queryKeys = event.queryKeys?.length
        ? event.queryKeys
        : TABLE_QUERY_KEY_MAP[event.table] || [];

      if (queryKeys.length === 0) {
        console.warn(`[BroadcastSync] No query keys for table: ${event.table}`);
        return;
      }

      if (event.record && (event.eventType === 'INSERT' || event.eventType === 'UPDATE')) {
        for (const key of queryKeys) {
          const existingData = queryClient.getQueryData<any[]>([key]);
          if (Array.isArray(existingData)) {
            if (event.eventType === 'INSERT') {
              if (!existingData.some((item: any) => item.id === event.record.id)) {
                queryClient.setQueryData([key], [event.record, ...existingData]);
              }
            } else if (event.eventType === 'UPDATE') {
              queryClient.setQueryData(
                [key],
                existingData.map((item: any) =>
                  item.id === event.record.id ? { ...item, ...event.record } : item
                )
              );
            }
          } else {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        }
      } else if (event.eventType === 'DELETE' && event.oldId) {
        for (const key of queryKeys) {
          const existingData = queryClient.getQueryData<any[]>([key]);
          if (Array.isArray(existingData)) {
            queryClient.setQueryData(
              [key],
              existingData.filter((item: any) => item.id !== event.oldId)
            );
          } else {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        }
      } else {
        for (const key of queryKeys) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
    });

    // 3. Register reconnection handler
    onReconnectNeeded(() => {
      console.log('[BroadcastSync] 🔄 Re-syncing all queries after idle/offline');
      queryClient.invalidateQueries();
    });

    cleanupRef.current = () => {
      unsubscribe();
      cleanupChannel();
    };

    return () => {
      cleanupRef.current?.();
    };
  }, [queryClient]);
}


/**
 * ═══════════════════════════════════════════════════════════════════
 * BROADCAST SYNC — Central Realtime System (EGRESS-FREE)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Menggunakan Supabase Broadcast (WebSocket peer-to-peer) untuk
 * sinkronisasi data antar client TANPA memakan database egress.
 *
 * Alur:
 *   Client A melakukan mutasi → broadcast payload via channel
 *   Client B menerima broadcast → smart-patch React Query cache
 *
 * Broadcast TIDAK melalui database, jadi GRATIS dari sisi egress.
 * Trade-off: jika client offline, event bisa terlewat.
 * Handle: re-fetch saat reconnect/tab-visible setelah lama idle.
 */

import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────

export interface BroadcastSyncEvent {
  /** Table name that changed */
  table: string;
  /** Type of change */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** The new/updated record (for INSERT & UPDATE) */
  record?: any;
  /** The ID of the deleted record (for DELETE) */
  oldId?: string;
  /** React Query keys to invalidate as fallback */
  queryKeys: string[];
  /** Timestamp of the event */
  timestamp: number;
  /** Source client ID to prevent self-echo */
  sourceClientId: string;
}

// ─── Constants ───────────────────────────────────────────────────

const CHANNEL_NAME = 'app-sync-v1';
const CLIENT_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Visibility & Reconnection Tracking ──────────────────────────

let lastActiveTimestamp = Date.now();
let _onReconnectCallback: (() => void) | null = null;

/** Register a callback when the client needs to re-sync after being idle/offline */
export function onReconnectNeeded(callback: () => void) {
  _onReconnectCallback = callback;
}

// Track tab visibility for reconnection detection
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const idleMs = Date.now() - lastActiveTimestamp;
      // If tab was hidden for more than 30 seconds, trigger re-sync
      if (idleMs > 30_000 && _onReconnectCallback) {
        console.log(`[BroadcastSync] Tab was idle for ${Math.round(idleMs / 1000)}s, triggering re-sync`);
        _onReconnectCallback();
      }
    } else {
      lastActiveTimestamp = Date.now();
    }
  });
}

// ─── Channel Management ──────────────────────────────────────────

let _channel: RealtimeChannel | null = null;
let _listeners: Array<(event: BroadcastSyncEvent) => void> = [];

/**
 * Initialize the broadcast channel. Call once at app startup.
 * Returns a cleanup function.
 */
export function initBroadcastChannel(): () => void {
  if (_channel) {
    console.warn('[BroadcastSync] Channel already initialized');
    return () => {};
  }

  _channel = supabase
    .channel(CHANNEL_NAME, {
      config: { broadcast: { self: false } }, // Don't echo to sender
    })
    .on('broadcast', { event: 'sync' }, (payload) => {
      const event = payload.payload as BroadcastSyncEvent;

      // Skip self-echo (extra safety)
      if (event.sourceClientId === CLIENT_ID) return;

      // Only process events from visible tab (optimization)
      if (document.visibilityState !== 'visible') {
        // Mark as stale — will re-sync when tab becomes visible
        lastActiveTimestamp = Math.min(lastActiveTimestamp, event.timestamp - 1000);
        return;
      }

      console.log(`[BroadcastSync] ← Received: ${event.table}.${event.eventType}`);
      
      // Notify all listeners
      for (const listener of _listeners) {
        try {
          listener(event);
        } catch (e) {
          console.error('[BroadcastSync] Listener error:', e);
        }
      }
    })
    .subscribe((status) => {
      console.log(`[BroadcastSync] Channel status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('[BroadcastSync] ✅ Connected — all tables will sync via broadcast');
      }
    });

  return () => {
    if (_channel) {
      supabase.removeChannel(_channel);
      _channel = null;
    }
    _listeners = [];
  };
}

/**
 * Subscribe to broadcast events. Returns unsubscribe function.
 */
export function subscribeToBroadcast(
  listener: (event: BroadcastSyncEvent) => void
): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

/**
 * Broadcast a table change to all other clients.
 * Call this AFTER a successful mutation.
 *
 * This is FREE from Supabase egress perspective — it uses
 * WebSocket broadcast which doesn't hit the database.
 */
export async function broadcastTableChange(
  table: string,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  queryKeys: string[],
  record?: any,
  oldId?: string
): Promise<void> {
  if (!_channel) {
    console.warn('[BroadcastSync] Channel not initialized, skipping broadcast');
    return;
  }

  const event: BroadcastSyncEvent = {
    table,
    eventType,
    record,
    oldId,
    queryKeys,
    timestamp: Date.now(),
    sourceClientId: CLIENT_ID,
  };

  try {
    await _channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: event,
    });
    console.log(`[BroadcastSync] → Sent: ${table}.${eventType}`);
  } catch (e) {
    console.error('[BroadcastSync] Failed to send broadcast:', e);
  }
}

/**
 * Get the current client ID (useful for debugging).
 */
export function getClientId(): string {
  return CLIENT_ID;
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StockOpnameSession, StockOpnameSessionStatus, Location } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

/**
 * Hook to fetch stock opname sessions with filters
 */
export function useStockOpnameSessions(filters?: {
  status?: StockOpnameSessionStatus;
  location?: Location;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['stock-opname-sessions', filters],
    queryFn: async () => {
      let query = supabase
        .from('stock_opname_sessions')
        .select(`
          *,
          items:stock_opname_items(
            *,
            product:products(
              id, name, barcode, price, image_url,
              stock_gudang, stock_toko, has_multi_unit, pcs_per_box, main_unit, sell_unit
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.location) {
        query = query.eq('location', filters.location);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StockOpnameSession[];
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE & SUBMIT SESSION (Gudang/Kasir)
// ─────────────────────────────────────────────────────────────────────────────

export interface OpnameSessionPayload {
  sessionNumber: string;
  location: 'gudang' | 'toko' | 'both';
  opnameDate: string;
  createdBy: string | null;
  createdByName: string;
  items: {
    productId: string;
    systemStockGudang: number;
    systemStockToko: number;
    actualStockGudang: number;
    actualStockToko: number;
    unitUsed?: string;
    mainUnitCountGudang?: number;
    subUnitCountGudang?: number;
    mainUnitCountToko?: number;
    subUnitCountToko?: number;
    note?: string;
  }[];
  adHocProductUpdates?: {
    productId: string;
    mainUnit: string;
    subUnit: string;
    pcsPerBox: number;
  }[];
}

/**
 * Create & immediately submit a stock opname session for approval.
 * Items with no difference are skipped.
 */
export function useSubmitStockOpnameSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: OpnameSessionPayload) => {
      // 1. Create the session record
      const { data: session, error: sessErr } = await supabase
        .from('stock_opname_sessions')
        .insert({
          session_number: payload.sessionNumber,
          location: payload.location,
          status: 'pending_approval',
          created_at: payload.opnameDate,
          created_by: payload.createdBy,
          created_by_name: payload.createdByName,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessErr) throw sessErr;

      // 2. Insert items that have a difference
      const itemsToInsert: any[] = [];

      for (const item of payload.items) {
        const diffGudang = item.actualStockGudang - item.systemStockGudang;
        const diffToko   = item.actualStockToko   - item.systemStockToko;

        if (diffGudang !== 0) {
          itemsToInsert.push({
            session_id:          session.id,
            product_id:          item.productId,
            location:            'gudang',
            system_stock:        item.systemStockGudang,
            actual_stock:        item.actualStockGudang,
            difference:          diffGudang,
            unit_used:           item.unitUsed ?? null,
            main_unit_count:     item.mainUnitCountGudang ?? null,
            sub_unit_count:      item.subUnitCountGudang  ?? null,
            note:                item.note ?? null,
            status:              'pending',
          });
        }

        if (diffToko !== 0) {
          itemsToInsert.push({
            session_id:          session.id,
            product_id:          item.productId,
            location:            'toko',
            system_stock:        item.systemStockToko,
            actual_stock:        item.actualStockToko,
            difference:          diffToko,
            unit_used:           item.unitUsed ?? null,
            main_unit_count:     item.mainUnitCountToko ?? null,
            sub_unit_count:      item.subUnitCountToko  ?? null,
            note:                item.note ?? null,
            status:              'pending',
          });
        }
      }

      if (itemsToInsert.length === 0) {
        // No differences — delete the session and abort
        await supabase.from('stock_opname_sessions').delete().eq('id', session.id);
        throw new Error('Tidak ada selisih stok yang ditemukan. Opname tidak perlu disesuaikan.');
      }

      const { error: itemsErr } = await supabase
        .from('stock_opname_items')
        .insert(itemsToInsert);

      if (itemsErr) {
        await supabase.from('stock_opname_sessions').delete().eq('id', session.id);
        throw itemsErr;
      }

      if (payload.adHocProductUpdates && payload.adHocProductUpdates.length > 0) {
        for (const update of payload.adHocProductUpdates) {
          const { error: prodErr } = await supabase
            .from('products')
            .update({
              has_multi_unit: true,
              main_unit: update.mainUnit,
              sell_unit: update.subUnit,
              pcs_per_box: update.pcsPerBox
            })
            .eq('id', update.productId);
            
          if (prodErr) console.warn('[useStockOpnameSessions] Failed to update product multi-unit status', prodErr);
        }
      }

      // 3. Send notification to main_office
      await supabase.from('notifications').insert({
        title: 'Stok Opname Baru',
        message: `Sesi opname ${payload.sessionNumber} menunggu persetujuan (${itemsToInsert.length} item selisih)`,
        type: 'info',
        link: '/stock-opname/approval',
      });

      return { session, itemCount: itemsToInsert.length };
    },

    onSuccess: ({ session, itemCount }) => {
      invalidateAndBroadcast(queryClient, ['stock-opname-sessions']);
      toast({
        title: 'Opname Berhasil Diajukan',
        description: `Sesi ${session.session_number} (${itemCount} item selisih) dikirim ke main office untuk persetujuan`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Mengajukan Opname',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROVE SESSION (Main Office)
// ─────────────────────────────────────────────────────────────────────────────

export function useApproveStockOpnameSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      sessionId,
      approverId,
      approverName,
    }: {
      sessionId: string;
      approverId: string | null;
      approverName: string;
    }) => {
      // Fetch session with all items
      const { data: session, error: fetchErr } = await supabase
        .from('stock_opname_sessions')
        .select('*, items:stock_opname_items(*)')
        .eq('id', sessionId)
        .single();

      if (fetchErr) throw fetchErr;
      if (!session) throw new Error('Sesi tidak ditemukan');

      const items = (session.items ?? []) as any[];

      // Apply stock adjustments per item
      for (const item of items) {
        const stockField =
          item.location === 'gudang' ? 'stock_gudang' : 'stock_toko';

        // Read fresh current stock
        const { data: freshProduct, error: freshErr } = await supabase
          .from('products')
          .select(`id, ${stockField}`)
          .eq('id', item.product_id)
          .single();

        if (freshErr) throw freshErr;

        const currentStock = (freshProduct as any)?.[stockField] ?? 0;
        const newStock = Math.max(0, currentStock + item.difference);

        const { error: updateErr } = await supabase
          .from('products')
          .update({ [stockField]: newStock })
          .eq('id', item.product_id);

        if (updateErr) throw updateErr;

        // Log adjustment
        await supabase.from('stock_logs').insert({
          product_id: item.product_id,
          type: 'adjustment',
          quantity: item.difference,
          location: item.location,
          user_id: approverId,
          note: `Stok Opname ${session.session_number}: ${item.system_stock} → ${item.actual_stock}${item.note ? ` (${item.note})` : ''} | Disetujui: ${approverName}`,
          reference_type: 'stock_opname',
          reference_id: sessionId,
          stock_before: currentStock,
          stock_after: newStock,
        });

        // Mark item as approved
        await supabase
          .from('stock_opname_items')
          .update({
            status: 'approved',
            approved_by: approverId,
            approved_by_name: approverName,
            approved_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }

      // Update session status
      const { error: sessErr } = await supabase
        .from('stock_opname_sessions')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_by_name: approverName,
          approved_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (sessErr) throw sessErr;

      // Notify creators
      await supabase.from('notifications').insert({
        title: 'Stok Opname Disetujui',
        message: `Sesi ${session.session_number} disetujui — stok telah disesuaikan`,
        type: 'success',
        link: '/stock-opname',
      });

      return { session, itemsApproved: items.length };
    },

    onSuccess: ({ session, itemsApproved }) => {
      invalidateAndBroadcast(queryClient, ['stock-opname-sessions', 'products', 'stock-logs']);
      toast({
        title: 'Opname Disetujui',
        description: `Sesi ${session.session_number}: ${itemsApproved} item stok berhasil disesuaikan`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Menyetujui Opname',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT SESSION (Main Office)
// ─────────────────────────────────────────────────────────────────────────────

export function useRejectStockOpnameSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      sessionId,
      reason,
      approverId,
      approverName,
    }: {
      sessionId: string;
      reason: string;
      approverId: string | null;
      approverName: string;
    }) => {
      // Fetch session number for notification
      const { data: session, error: fetchErr } = await supabase
        .from('stock_opname_sessions')
        .select('session_number')
        .eq('id', sessionId)
        .single();

      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from('stock_opname_sessions')
        .update({
          status: 'rejected',
          approved_by: approverId,
          approved_by_name: approverName,
          approved_at: new Date().toISOString(),
          rejected_reason: reason,
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Update all items to rejected
      await supabase
        .from('stock_opname_items')
        .update({ status: 'rejected' })
        .eq('session_id', sessionId);

      // Notify
      await supabase.from('notifications').insert({
        title: 'Stok Opname Ditolak',
        message: `Sesi ${session?.session_number} ditolak: ${reason}`,
        type: 'warning',
        link: '/stock-opname',
      });

      return session;
    },

    onSuccess: (session) => {
      invalidateAndBroadcast(queryClient, ['stock-opname-sessions']);
      toast({
        title: 'Opname Ditolak',
        description: `Sesi ${session?.session_number} ditolak — stok tidak diubah`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Menolak Opname',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE SESSION NUMBER
// ─────────────────────────────────────────────────────────────────────────────

export function generateSessionNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `OP-${y}${m}${d}-${rand}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME SUBSCRIPTION
// Call this hook once in any page that needs live updates for opname sessions.
// ─────────────────────────────────────────────────────────────────────────────

export function useStockOpnameRealtime() {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('stock_opname_realtime_hook')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_opname_sessions' },
        () => {
          invalidateAndBroadcast(queryClient, ['stock-opname-sessions']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_opname_items' },
        () => {
          invalidateAndBroadcast(queryClient, ['stock-opname-sessions']);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Opname sessions realtime active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ❌ Opname sessions — enable replication in Supabase Dashboard for stock_opname_sessions and stock_opname_items tables');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient]);
}

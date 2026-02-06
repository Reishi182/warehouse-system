import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product, StockOutRequest, SuratJalan, StockLog, Notification, Location, RequestStatus, Sale, SaleItem, PaymentMethod, CashTransfer, ActivityLog } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DataContextType {
  products: Product[];
  requests: StockOutRequest[];
  suratJalans: SuratJalan[];
  stockLogs: StockLog[];
  notifications: Notification[];
  sales: Sale[];
  cashTransfers: CashTransfer[];
  activityLogs: ActivityLog[];
  loading: boolean;

  // Product actions
  addProduct: (product: { name: string; barcode: string; price: number; stock: { gudang: number; toko: number }; image_url?: string }) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProductByBarcode: (barcode: string) => Product | undefined;

  // Sales actions
  createSale: (data: {
    paymentMethod: PaymentMethod;
    stockLocation: Location;
    items: Array<{
      productId: string | null; // null for Quick Sale items
      productName?: string;
      price?: number;
      barcode?: string;
      quantity: number;
      discount: number;
      isManualEntry?: boolean;
    }>;
    orderDiscount: number;
    amountPaid: number;
    transactionDate?: Date; // Optional: for backdated transactions
    // Credit transaction fields
    isCredit?: boolean;
    creditCustomerName?: string;
  }) => Promise<{ saleId: string; saleNumber: string } | null>;


  // Stock actions
  addStock: (productId: string, quantity: number, location: Location) => Promise<void>;

  // Request actions
  createStockOutRequest: (data: { productId: string; quantity: number; fromLocation: Location; toLocation: Location; toLocationName?: string | null }) => Promise<void>;
  updateRequestStatus: (id: string, status: RequestStatus, reason?: string) => Promise<void>;

  // Surat Jalan actions
  createSuratJalan: (requestIds: string[]) => Promise<void>;
  updateSuratJalanStatus: (id: string, status: RequestStatus, reason?: string) => Promise<void>;

  // Notification actions
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  unreadCount: number;

  // Refresh
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<StockOutRequest[]>([]);
  const [suratJalans, setSuratJalans] = useState<SuratJalan[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashTransfers, setCashTransfers] = useState<CashTransfer[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    setProducts(data.map(p => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      price: p.price,
      image_url: p.image_url,
      stock: {
        gudang: p.stock_gudang,
        toko: p.stock_toko
      },
      created_at: p.created_at,
      updated_at: p.updated_at
    })));
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('stock_out_requests')
      .select('id, product_id, quantity, from_location, to_location, status, requested_by, requested_at, surat_jalan_id, approved_by, approved_at, rejected_reason, products(*)')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return;
    }

    setRequests(data.map(r => ({
      id: r.id,
      product_id: r.product_id,
      product: r.products ? {
        id: r.products.id,
        name: r.products.name,
        barcode: r.products.barcode,
        price: r.products.price,
        image_url: r.products.image_url,
        stock: {
          gudang: r.products.stock_gudang,
          toko: r.products.stock_toko
        },
        created_at: r.products.created_at,
        updated_at: r.products.updated_at
      } : undefined,
      quantity: r.quantity,
      from_location: r.from_location as Location,
      to_location: r.to_location as Location,
      status: r.status as RequestStatus,
      requested_by: r.requested_by,
      requested_at: r.requested_at,
      surat_jalan_id: r.surat_jalan_id,
      approved_by: r.approved_by,
      approved_at: r.approved_at,
      rejected_reason: r.rejected_reason
    })));
  };

  const fetchSuratJalans = async () => {
    const { data, error } = await supabase
      .from('surat_jalan')
      .select('*, surat_jalan_items(*, products(image_url))')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching surat jalans:', error);
      return;
    }

    setSuratJalans(data.map(s => ({
      id: s.id,
      number: s.number,
      items: (s.surat_jalan_items || []).map((item: any) => ({
        id: item.id,
        surat_jalan_id: item.surat_jalan_id,
        product_id: item.product_id,
        product_name: item.product_name,
        barcode: item.barcode,
        image_url: item.products?.image_url,
        quantity: item.quantity,
        from_location: item.from_location as Location,
        to_location: item.to_location as Location
      })),
      status: s.status as RequestStatus,
      created_by: s.created_by,
      created_at: s.created_at,
      approved_by: s.approved_by,
      approved_at: s.approved_at,
      rejected_reason: s.rejected_reason
    })));
  };

  const fetchStockLogs = async () => {
    const { data, error } = await supabase
      .from('stock_logs')
      .select('*, products(*)')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching stock logs:', error);
      return;
    }

    setStockLogs(data.map(l => ({
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
      type: l.type as 'in' | 'out' | 'adjustment',
      quantity: l.quantity,
      location: l.location as Location,
      user_id: l.user_id,
      timestamp: l.timestamp,
      note: l.note
    })));
  };

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data.map(n => ({
      id: n.id,
      user_id: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type as 'info' | 'success' | 'warning' | 'error',
      read: n.read,
      created_at: n.created_at,
      link: n.link
    })));
  };

  const fetchSales = async () => {
    // Cashier only sees their own sales; other roles see all
    const isCashier = profile?.role === 'cashier';

    let query = supabase
      .from('sales')
      .select('id, sale_number, cashier_id, cashier_name, payment_method, stock_location, total_amount, order_discount, amount_paid, change_amount, created_at, is_exchanged, exchanged_to_sale_id, exchanged_to_sale_number, exchange_from_sale_id, exchange_from_sale_number, is_cancelled, cancelled_at, cancelled_reason, is_credit, credit_customer_name, credit_settled_at, credit_payment_method, sale_items(id, sale_id, product_id, product_name, barcode, quantity, price, subtotal, discount)')
      .order('created_at', { ascending: false })
      .limit(100);

    // Filter by cashier_id for cashier role
    if (isCashier && user?.id) {
      query = query.eq('cashier_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sales:', error);
      return;
    }

    setSales((data || []).map((s: any) => ({
      id: s.id,
      sale_number: s.sale_number,
      cashier_id: s.cashier_id,
      cashier_name: s.cashier_name,
      payment_method: s.payment_method as PaymentMethod,
      stock_location: s.stock_location as Location,
      total_amount: s.total_amount,
      order_discount: s.order_discount || 0,
      amount_paid: s.amount_paid || 0,
      change_amount: s.change_amount || 0,
      // Exchange tracking
      is_exchanged: s.is_exchanged || false,
      exchanged_to_sale_id: s.exchanged_to_sale_id,
      exchanged_to_sale_number: s.exchanged_to_sale_number,
      exchange_from_sale_id: s.exchange_from_sale_id,
      exchange_from_sale_number: s.exchange_from_sale_number,
      // Cancellation tracking
      is_cancelled: s.is_cancelled || false,
      cancelled_at: s.cancelled_at,
      cancelled_reason: s.cancelled_reason,
      // Credit transaction tracking
      is_credit: s.is_credit || false,
      credit_customer_name: s.credit_customer_name,
      credit_settled_at: s.credit_settled_at,
      credit_payment_method: s.credit_payment_method as PaymentMethod | null,
      created_at: s.created_at,
      items: (s.sale_items || []).map((it: any): SaleItem => ({
        id: it.id,
        sale_id: it.sale_id,
        product_id: it.product_id,
        product_name: it.product_name,
        barcode: it.barcode,
        quantity: it.quantity,
        price: it.price,
        subtotal: it.subtotal,
        discount: it.discount || 0,
      })),
    })));
  };

  const fetchCashTransfers = async () => {
    // Cashier only sees their own transfers; other roles see all
    const isCashier = profile?.role === 'cashier';

    let query = supabase
      .from('cash_transfers')
      .select('id, cashier_id, cashier_name, amount, transfer_date, created_at, note')
      .order('created_at', { ascending: false })
      .limit(50);

    // Filter by cashier_id for cashier role
    if (isCashier && user?.id) {
      query = query.eq('cashier_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cash transfers:', error);
      return;
    }

    setCashTransfers((data || []).map((t: any) => ({
      id: t.id,
      cashier_id: t.cashier_id,
      cashier_name: t.cashier_name,
      amount: t.amount,
      transfer_date: t.transfer_date,
      created_at: t.created_at,
      note: t.note,
    })));
  };

  const fetchActivityLogs = async () => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('id, user_id, user_name, user_role, action, entity_type, entity_id, description, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching activity logs:', error);
      return;
    }

    setActivityLogs((data || []).map((l: any): ActivityLog => ({
      id: l.id,
      user_id: l.user_id,
      user_name: l.user_name,
      user_role: l.user_role,
      action: l.action,
      entity_type: l.entity_type,
      entity_id: l.entity_id,
      description: l.description,
      created_at: l.created_at,
    })));
  };

  // Use a ref to track if we've done the initial load
  const hasLoadedRef = React.useRef(false);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    await Promise.all([
      fetchProducts(),
      fetchRequests(),
      fetchSuratJalans(),
      fetchStockLogs(),
      fetchNotifications(),
      fetchSales(),
      fetchCashTransfers(),
      fetchActivityLogs()
    ]);
    setLoading(false);
    hasLoadedRef.current = true;
  }, [isAuthenticated]);

  // Only run refreshData on initial auth or when user first authenticates
  useEffect(() => {
    // Reset loaded state when user logs out
    if (!isAuthenticated) {
      hasLoadedRef.current = false;
      return;
    }
    // Skip if already loaded and just a re-render
    if (hasLoadedRef.current) {
      return;
    }
    refreshData();
  }, [isAuthenticated]); // Only depend on isAuthenticated, not user object

  // Supabase Realtime subscriptions for live data updates - SEPARATE channels per table for reliability
  const realtimeChannelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Cleanup channels if user logs out
      realtimeChannelsRef.current.forEach(ch => supabase.removeChannel(ch));
      realtimeChannelsRef.current = [];
      return;
    }

    // Create SEPARATE channels for each table (Supabase works better this way)
    const tables = [
      { table: 'products', callback: fetchProducts },
      { table: 'sales', callback: fetchSales },
      { table: 'stock_logs', callback: fetchStockLogs },
      { table: 'cash_transfers', callback: fetchCashTransfers },
      { table: 'stock_out_requests', callback: fetchRequests },
      { table: 'surat_jalan', callback: fetchSuratJalans },
      { table: 'activity_logs', callback: fetchActivityLogs },
    ];

    const channels = tables.map(({ table, callback }) => {
      const channel = supabase
        .channel(`data_${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            console.log(`[Realtime] ${table} changed:`, payload.eventType);
            callback();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] ✅ Subscribed to ${table}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Realtime] ❌ ${table} - ENABLE REPLICATION IN SUPABASE DASHBOARD!`);
          }
        });
      return channel;
    });

    realtimeChannelsRef.current = channels;
    console.log(`[Realtime] Created ${channels.length} separate channel subscriptions`);

    return () => {
      console.log('[Realtime] Unsubscribing from all channels');
      realtimeChannelsRef.current.forEach(ch => supabase.removeChannel(ch));
      realtimeChannelsRef.current = [];
    };
  }, [isAuthenticated]);

  const addNotification = async (notification: { title: string; message: string; type: string; link?: string }) => {
    if (!user) return;

    await supabase.from('notifications').insert({
      user_id: user.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      link: notification.link
    });
  };

  const addActivityLog = async (data: { action: string; entityType: string; entityId?: string | null; description: string }) => {
    if (!user || !profile) return;

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      user_name: profile.name,
      user_role: profile.role,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId ?? null,
      description: data.description,
    });
  };

  const createSale = async (data: {
    paymentMethod: PaymentMethod;
    stockLocation: Location;
    items: Array<{
      productId: string | null;
      productName?: string;
      price?: number;
      barcode?: string;
      quantity: number;
      discount: number;
      isManualEntry?: boolean;
    }>;
    orderDiscount: number;
    amountPaid: number;
    transactionDate?: Date; // Optional: for backdated transactions
    // Credit transaction fields
    isCredit?: boolean;
    creditCustomerName?: string;
  }) => {
    if (!user || !profile) return null;

    // Process items - separate manual entries from database products
    const processedItems = data.items
      .filter(i => i.quantity > 0)
      .map(i => {
        if (i.isManualEntry || !i.productId) {
          // Manual entry (Quick Sale) - use provided data directly
          return {
            product: null,
            productId: null,
            productName: i.productName || 'Item Manual',
            price: i.price || 0,
            barcode: i.barcode || '',
            quantity: i.quantity,
            discount: i.discount,
            isManualEntry: true,
          };
        } else {
          // Database product
          const product = products.find(p => p.id === i.productId);
          return {
            product,
            productId: i.productId,
            productName: product?.name || i.productName || '',
            price: product?.price || i.price || 0,
            barcode: product?.barcode || i.barcode || '',
            quantity: i.quantity,
            discount: i.discount,
            isManualEntry: false,
          };
        }
      });

    if (processedItems.length === 0) {
      toast({ title: 'Data tidak valid', description: 'Item penjualan kosong', variant: 'destructive' });
      return null;
    }

    // Validate only non-manual items
    for (const it of processedItems) {
      if (!it.isManualEntry) {
        if (!it.product) {
          toast({ title: 'Produk tidak ditemukan', description: `Produk tidak ditemukan`, variant: 'destructive' });
          return null;
        }
        if (it.quantity <= 0) {
          toast({ title: 'Jumlah tidak valid', description: 'Jumlah harus lebih dari 0', variant: 'destructive' });
          return null;
        }
        if (it.quantity > it.product.stock[data.stockLocation]) {
          toast({ title: 'Stok tidak cukup', description: `${it.product.name} stok ${data.stockLocation} tidak cukup`, variant: 'destructive' });
          return null;
        }
      }
    }

    // Use transaction date if provided, otherwise use current time
    const saleDate = data.transactionDate || new Date();
    const yyyy = String(saleDate.getFullYear());
    const mm = String(saleDate.getMonth() + 1).padStart(2, '0');
    const dd = String(saleDate.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const saleNumber = `INV/${yyyy}${mm}${dd}-${rand}`;

    // Calculate subtotal with per-item discounts (discount is now nominal Rupiah per item)
    const subtotal = processedItems.reduce((acc, it) => {
      const itemTotal = it.price * it.quantity;
      const itemDiscountAmount = it.discount * it.quantity;
      return acc + (itemTotal - itemDiscountAmount);
    }, 0);

    // Apply order-level discount (now a fixed amount in Rupiah)
    const totalAmount = Math.round(Math.max(0, subtotal - data.orderDiscount));

    // Calculate change
    const changeAmount = Math.max(0, data.amountPaid - totalAmount);

    const { data: saleRow, error: saleError } = await supabase
      .from('sales')
      .insert({
        sale_number: saleNumber,
        cashier_id: user.id,
        cashier_name: profile.name,
        payment_method: data.paymentMethod,
        stock_location: data.stockLocation,
        total_amount: totalAmount,
        order_discount: data.orderDiscount,
        amount_paid: data.amountPaid,
        change_amount: changeAmount,
        // Credit transaction fields
        is_credit: data.isCredit || false,
        credit_customer_name: data.isCredit ? data.creditCustomerName : null,
        // Use transaction date for backdated transactions
        // Set time to 18:00 to represent end of business day
        ...(data.transactionDate && {
          created_at: new Date(
            data.transactionDate.getFullYear(),
            data.transactionDate.getMonth(),
            data.transactionDate.getDate(),
            18, 0, 0 // 6 PM - end of business day
          ).toISOString()
        }),
      })
      .select()
      .single();

    if (saleError || !saleRow) {
      toast({ title: 'Gagal membuat penjualan', description: saleError?.message || 'Unknown error', variant: 'destructive' });
      return null;
    }

    const saleItems = processedItems.map(it => {
      const itemTotal = it.price * it.quantity;
      const itemDiscountAmount = it.discount * it.quantity;
      return {
        sale_id: saleRow.id,
        product_id: it.isManualEntry ? null : it.productId, // null for manual entries
        product_name: it.productName,
        barcode: it.barcode,
        quantity: it.quantity,
        price: it.price,
        subtotal: Math.round(itemTotal - itemDiscountAmount),
        discount: it.discount,
      };
    });

    const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
    if (itemsError) {
      toast({ title: 'Gagal simpan item penjualan', description: itemsError.message, variant: 'destructive' });
      return null;
    }

    // Update stock ONLY for non-manual items
    for (const it of processedItems) {
      if (!it.isManualEntry && it.product) {
        const stockField = `stock_${data.stockLocation}`;
        const newStock = it.product.stock[data.stockLocation] - it.quantity;

        const { error: stockError } = await supabase
          .from('products')
          .update({ [stockField]: newStock })
          .eq('id', it.product.id);

        if (stockError) {
          toast({ title: 'Gagal update stok', description: stockError.message, variant: 'destructive' });
          return null;
        }

        await supabase.from('stock_logs').insert({
          product_id: it.product.id,
          type: 'out',
          quantity: it.quantity,
          location: data.stockLocation,
          user_id: user.id,
          note: `Penjualan ${saleNumber} (${data.paymentMethod})`,
        });
      }
    }

    await addNotification({
      title: data.isCredit ? 'Piutang Baru' : 'Penjualan Berhasil',
      message: data.isCredit
        ? `Piutang ${saleNumber} atas nama ${data.creditCustomerName}`
        : `Penjualan ${saleNumber} berhasil dibuat`,
      type: data.isCredit ? 'warning' : 'success',
      link: '/finance/sales-history',
    });

    await refreshData();
    return { saleId: saleRow.id, saleNumber };
  };


  const addProduct = async (product: { name: string; barcode: string; price: number; stock: { gudang: number; toko: number }; image_url?: string }) => {
    const { data: inserted, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        stock_gudang: product.stock.gudang,
        stock_toko: product.stock.toko,
        image_url: product.image_url
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }

    await addNotification({
      title: 'Produk Baru',
      message: `Produk ${product.name} berhasil ditambahkan`,
      type: 'success',
      link: '/products'
    });

    await addActivityLog({
      action: 'product_create',
      entityType: 'product',
      entityId: inserted?.id ?? null,
      description: `Tambah produk: ${product.name}`,
    });

    await fetchProducts();

    return true;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.barcode) updateData.barcode = updates.barcode;
    if (typeof updates.price === 'number') updateData.price = updates.price;
    if (updates.image_url !== undefined) updateData.image_url = updates.image_url;
    if (updates.stock) {
      updateData.stock_gudang = updates.stock.gudang;
      updateData.stock_toko = updates.stock.toko;
    }

    const { error } = await supabase.from('products').update(updateData).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    const prev = products.find(p => p.id === id);
    await addActivityLog({
      action: 'product_update',
      entityType: 'product',
      entityId: id,
      description: `Update produk: ${prev?.name || 'Produk'}${updates.name ? ` → ${updates.name}` : ''}`,
    });

    await fetchProducts();

    // Broadcast to other devices/tabs
    try {
      const { broadcastProductUpdate } = await import('@/hooks/useProducts');
      await broadcastProductUpdate();
    } catch (e) {
      console.log('[DataContext] Broadcast not available');
    }
  };

  const deleteProduct = async (id: string) => {
    const product = products.find(p => p.id === id);

    // Best-effort delete image from storage if it's from our bucket
    if (product?.image_url) {
      try {
        const url = new URL(product.image_url);
        const marker = '/storage/v1/object/public/product-images/';
        const idx = url.pathname.indexOf(marker);
        const objectPath = idx >= 0 ? url.pathname.slice(idx + marker.length) : null;
        if (objectPath) {
          await supabase.storage.from('product-images').remove([objectPath]);
        }
      } catch (e) {
        console.warn('Failed to remove product image from storage:', e);
      }
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Gagal hapus produk',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    await addActivityLog({
      action: 'product_delete',
      entityType: 'product',
      entityId: id,
      description: `Hapus produk: ${product?.name || 'Produk'}`,
    });

    await addNotification({
      title: 'Produk Dihapus',
      message: `Produk ${product?.name || ''} berhasil dihapus`,
      type: 'success',
      link: '/products'
    });

    await refreshData();
    return true;
  };

  const getProductByBarcode = useCallback((barcode: string) => {
    return products.find(p => p.barcode === barcode);
  }, [products]);

  const addStock = async (productId: string, quantity: number, location: Location) => {
    const product = products.find(p => p.id === productId);
    if (!product || !user) return;

    const stockField = `stock_${location}`;
    const newStock = product.stock[location] + quantity;

    const { error: updateError } = await supabase
      .from('products')
      .update({ [stockField]: newStock })
      .eq('id', productId);

    if (updateError) {
      toast({ title: 'Error', description: updateError.message, variant: 'destructive' });
      return;
    }

    await supabase.from('stock_logs').insert({
      product_id: productId,
      type: 'in',
      quantity,
      location,
      user_id: user.id,
      note: `Stok masuk oleh ${profile?.name || 'User'}`
    });

    await addNotification({
      title: 'Stok Masuk',
      message: `${quantity} ${product.name} ditambahkan ke ${location}`,
      type: 'success',
      link: '/stock-in'
    });

    await refreshData();
  };

  const createStockOutRequest = async (data: { productId: string; quantity: number; fromLocation: Location; toLocation: Location; toLocationName?: string | null }) => {
    if (!user) return;

    const product = products.find(p => p.id === data.productId);

    const { error } = await supabase.from('stock_out_requests').insert({
      product_id: data.productId,
      quantity: data.quantity,
      from_location: data.fromLocation,
      to_location: data.toLocation,
      status: 'pending',
      requested_by: user.id
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    await addNotification({
      title: 'Permintaan Dibuat',
      message: `Permintaan stok keluar ${product?.name || 'produk'} sebanyak ${data.quantity} unit`,
      type: 'info',
      link: '/requests'
    });

    await fetchRequests();
  };

  const updateRequestStatus = async (id: string, status: RequestStatus, reason?: string) => {
    const updateData: any = { status };
    if (status === 'rejected' && reason) {
      updateData.rejected_reason = reason;
    }
    if ((status === 'approved' || status === 'rejected') && user) {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase.from('stock_out_requests').update(updateData).eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    await fetchRequests();
  };

  const createSuratJalan = async (requestIds: string[]) => {
    if (!user) return;

    const selectedRequests = requests.filter(r => requestIds.includes(r.id));
    const sjNumber = `SJ/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(suratJalans.length + 1).padStart(3, '0')}`;

    const { data: sjData, error: sjError } = await supabase
      .from('surat_jalan')
      .insert({
        number: sjNumber,
        status: 'pending',
        created_by: user.id
      })
      .select()
      .single();

    if (sjError || !sjData) {
      toast({ title: 'Error', description: sjError?.message || 'Failed to create surat jalan', variant: 'destructive' });
      return;
    }

    // Insert items
    const items = selectedRequests.map(r => ({
      surat_jalan_id: sjData.id,
      product_id: r.product_id,
      product_name: r.product?.name || '',
      barcode: r.product?.barcode || '',
      quantity: r.quantity,
      from_location: r.from_location,
      to_location: r.to_location
    }));

    await supabase.from('surat_jalan_items').insert(items);

    // Update requests with surat_jalan_id
    await supabase
      .from('stock_out_requests')
      .update({ surat_jalan_id: sjData.id })
      .in('id', requestIds);

    await addNotification({
      title: 'Surat Jalan Dibuat',
      message: `Surat Jalan ${sjNumber} berhasil dibuat`,
      type: 'success',
      link: '/surat-jalan'
    });

    await refreshData();
  };

  const updateSuratJalanStatus = async (id: string, status: RequestStatus, reason?: string) => {
    const sj = suratJalans.find(s => s.id === id);
    if (!sj || !user) return;

    const updateData: any = { status };
    if (status === 'rejected' && reason) {
      updateData.rejected_reason = reason;
    }
    if ((status === 'approved' || status === 'rejected')) {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase.from('surat_jalan').update(updateData).eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // If approved, deduct stock
    if (status === 'approved') {
      for (const item of sj.items) {
        const product = products.find(p => p.barcode === item.barcode);
        if (product) {
          const fromField = `stock_${item.from_location}`;
          const toField = `stock_${item.to_location}`;

          await supabase
            .from('products')
            .update({
              [fromField]: product.stock[item.from_location] - item.quantity,
              [toField]: product.stock[item.to_location] + item.quantity
            })
            .eq('id', product.id);

          await supabase.from('stock_logs').insert({
            product_id: product.id,
            type: 'out',
            quantity: item.quantity,
            location: item.from_location,
            user_id: user.id,
            note: `Transfer ke ${item.to_location} via ${sj.number}`
          });
        }
      }

      // Update related requests to completed
      const requestIds = requests
        .filter(r => r.surat_jalan_id === id)
        .map(r => r.id);

      if (requestIds.length > 0) {
        await supabase
          .from('stock_out_requests')
          .update({ status: 'completed' })
          .in('id', requestIds);
      }
    }

    await addNotification({
      title: status === 'approved' ? 'Surat Jalan Disetujui' : 'Surat Jalan Ditolak',
      message: `${sj.number} ${status === 'approved' ? 'disetujui dan stok telah dikurangi' : 'ditolak'}`,
      type: status === 'approved' ? 'success' : 'error',
      link: '/surat-jalan'
    });

    await refreshData();
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DataContext.Provider value={{
      products,
      requests,
      suratJalans,
      stockLogs,
      notifications,
      sales,
      cashTransfers,
      activityLogs,
      loading,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductByBarcode,
      createSale,
      addStock,
      createStockOutRequest,
      updateRequestStatus,
      createSuratJalan,
      updateSuratJalanStatus,
      markNotificationRead,
      markAllNotificationsRead,
      unreadCount,
      refreshData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

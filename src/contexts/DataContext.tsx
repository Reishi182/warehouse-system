import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Product, StockOutRequest, SuratJalan, StockLog, Notification, Location, RequestStatus, Sale, SaleItem, PaymentMethod, CashTransfer, ActivityLog } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/store/useDataStore';
import { broadcastTableChange } from '@/lib/broadcastSync';

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
  addProduct: (product: { name: string; barcode: string; price: number; stock: { gudang: number; toko: number }; image_url?: string; has_multi_unit?: boolean; main_unit?: string | null; pcs_per_box?: number | null; box_price?: number | null; sell_by_quantity?: boolean; sell_unit?: string; bulk_quantity?: number | null; bulk_price?: number | null }) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
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
    exchangeOriginalItems?: any[];
    exchangeOriginalLocation?: string;
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
  const products = useDataStore(s => s.products);
  const setProducts = useDataStore(s => s.setProducts);
  const requests = useDataStore(s => s.requests);
  const setRequests = useDataStore(s => s.setRequests);
  const suratJalans = useDataStore(s => s.suratJalans);
  const setSuratJalans = useDataStore(s => s.setSuratJalans);
  const stockLogs = useDataStore(s => s.stockLogs);
  const setStockLogs = useDataStore(s => s.setStockLogs);
  const notifications = useDataStore(s => s.notifications);
  const setNotifications = useDataStore(s => s.setNotifications);
  const sales = useDataStore(s => s.sales);
  const setSales = useDataStore(s => s.setSales);
  const cashTransfers = useDataStore(s => s.cashTransfers);
  const setCashTransfers = useDataStore(s => s.setCashTransfers);
  const activityLogs = useDataStore(s => s.activityLogs);
  const setActivityLogs = useDataStore(s => s.setActivityLogs);
  const loading = useDataStore(s => s.loading);
  const setLoading = useDataStore(s => s.setLoading);

  const fetchProducts = async () => {
    // Supabase defaults to 1000 rows max per request.
    // Fetch in batches to get ALL products.
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, barcode, price, image_url, stock_gudang, stock_toko, has_multi_unit, main_unit, pcs_per_box, box_price, sell_by_quantity, sell_unit, bulk_quantity, bulk_price, min_stock_gudang, min_stock_toko, created_at, updated_at')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      allData = allData.concat(data || []);
      if (!data || data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }

    setProducts(allData.map(p => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      price: p.price,
      image_url: p.image_url,
      stock: {
        gudang: p.stock_gudang,
        toko: p.stock_toko
      },
      has_multi_unit: p.has_multi_unit ?? false,
      main_unit: p.main_unit ?? null,
      pcs_per_box: p.pcs_per_box ?? null,
      box_price: p.box_price ?? null,
      sell_by_quantity: p.sell_by_quantity ?? false,
      sell_unit: p.sell_unit ?? 'pcs',
      bulk_quantity: p.bulk_quantity ?? null,
      bulk_price: p.bulk_price ?? null,
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
      note: l.note,
      actor_name: l.actor_name,
      reference_type: l.reference_type,
      reference_id: l.reference_id,
      stock_before: l.stock_before,
      stock_after: l.stock_after
    })));
  };

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, read, created_at, link')
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
      .select('id, sale_number, cashier_id, cashier_name, payment_method, stock_location, total_amount, order_discount, amount_paid, change_amount, amount_cash, amount_transfer, created_at, is_exchanged, exchanged_to_sale_id, exchanged_to_sale_number, exchange_from_sale_id, exchange_from_sale_number, is_cancelled, cancelled_at, cancelled_reason, is_credit, credit_customer_name, credit_settled_at, credit_payment_method, sale_items(id, sale_id, product_id, product_name, barcode, quantity, price, subtotal, discount)')
      .order('created_at', { ascending: false })
      .limit(200);

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
      amount_cash: s.amount_cash,
      amount_transfer: s.amount_transfer,
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

  // ============================================================
    // REALTIME SUBSCRIPTIONS REMOVED FROM DataContext
    // ============================================================
    // Products realtime → handled by useGlobalRealtimeUpdates.ts (postgres_changes)
    // All other tables → handled by useBroadcastSync.ts (broadcast)
    // Notifications → handled by useRealtimeNotifications.tsx (per-user filter)
    //
    // DataContext now ONLY does: initial fetch + mutations + broadcast after mutations.
    // This eliminates duplicate subscriptions and saves massive egress.

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
      stockDeductQty?: number; // Multi-unit: base units to deduct (e.g. 1 box = 70 pcs)
      calculatedSubtotal?: number; // Added to support bundle logic exactly as computed
    }>;
    orderDiscount: number;
    amountPaid: number;
    amountCash?: number;
    amountTransfer?: number;
    transactionDate?: Date; // Optional: for backdated transactions
    // Credit transaction fields
    isCredit?: boolean;
    creditCustomerName?: string;
    exchangeOriginalItems?: any[];
    exchangeOriginalLocation?: string;
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
            calculatedSubtotal: i.calculatedSubtotal,
          };
        } else {
          // Database product
          const product = products.find(p => p.id === i.productId);
          return {
            product,
            productId: i.productId,
            productName: product?.name || i.productName || '',
            price: i.price || product?.price || 0,
            barcode: product?.barcode || i.barcode || '',
            quantity: i.quantity,
            discount: i.discount,
            isManualEntry: false,
            stockDeductQty: i.stockDeductQty || i.quantity, // default to quantity for regular items
            calculatedSubtotal: i.calculatedSubtotal,
          };
        }
      });

    if (processedItems.length === 0) {
      toast({ title: 'Data tidak valid', description: 'Item penjualan kosong', variant: 'destructive' });
      return null;
    }

    // Bug fix #3: Calculate net stock change to properly handle exchanges!
    const stockChangeMap = new Map<string, { productId: string, location: string, change: number, productName: string }>();

    // 1. Add exchanged items (+quantity)
    if (data.exchangeOriginalItems) {
        const loc = data.exchangeOriginalLocation || 'toko';
        for (const item of data.exchangeOriginalItems) {
            if (item.product_id) {
                const key = `${item.product_id}_${loc}`;
                stockChangeMap.set(key, {
                     productId: item.product_id, 
                     location: loc, 
                     change: item.quantity, 
                     productName: item.product_name || 'Item'
                });
            }
        }
    }

    // 2. Subtract new items (-quantity)
    for (const it of processedItems) {
        if (!it.isManualEntry && it.product) {
            if (it.quantity <= 0) {
                toast({ title: 'Jumlah tidak valid', description: 'Jumlah harus lebih dari 0', variant: 'destructive' });
                return null;
            }
            const deductQty = (it as any).stockDeductQty || it.quantity;
            const loc = data.stockLocation;
            const key = `${it.product.id}_${loc}`;
            const existing = stockChangeMap.get(key);
            if (existing) {
                existing.change -= deductQty;
            } else {
                stockChangeMap.set(key, {
                    productId: it.product.id,
                    location: loc,
                    change: -deductQty,
                    productName: it.productName
                });
            }
        }
    }

    // Validate stock using memory
    for (const [key, info] of stockChangeMap.entries()) {
        if (info.change >= 0) continue; // Adding stock is always valid
        
        const memProduct = products.find(p => p.id === info.productId);
        if (memProduct) {
             const loc = info.location as Location;
             const memStock = memProduct.stock[loc] || 0;
             const newStock = memStock + info.change; // info.change is negative since we're deducting
             if (newStock < 0) {
                 toast({ title: 'Stok tidak cukup', description: `${info.productName} stok ${loc} tidak cukup`, variant: 'destructive' });
                 return null;
             }
        } else {
             toast({ title: 'Produk tidak ditemukan', description: `Produk tidak ditemukan`, variant: 'destructive' });
             return null;
        }
    }

    // Use transaction date if provided, otherwise use current time
    const saleDate = data.transactionDate || new Date();
    const yyyy = String(saleDate.getFullYear());
    const mm = String(saleDate.getMonth() + 1).padStart(2, '0');
    const dd = String(saleDate.getDate()).padStart(2, '0');
    const HH = String(saleDate.getHours()).padStart(2, '0');
    const MM = String(saleDate.getMinutes()).padStart(2, '0');
    const ss = String(saleDate.getSeconds()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const saleNumber = `INV/${yyyy}${mm}${dd}-${HH}${MM}${ss}-${rand}`;

    // Calculate subtotal with per-item discounts (discount is now nominal Rupiah per item)
    const subtotal = processedItems.reduce((acc, it) => {
      let itemTotal = it.price * it.quantity;
      if (it.calculatedSubtotal !== undefined) itemTotal = it.calculatedSubtotal;
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
        amount_cash: data.amountCash,
        amount_transfer: data.amountTransfer,
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
      let itemTotal = it.price * it.quantity;
      if (it.calculatedSubtotal !== undefined) itemTotal = it.calculatedSubtotal;
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

    // Bug fix #1+2+3: Atomic stock update with full rollback on failure using mapped net changes
    const stockUpdated: { productId: string; quantity: number; field: string }[] = [];
    const stockLogsToInsert: any[] = [];
    let stockUpdateFailed = false;

    for (const [key, info] of stockChangeMap.entries()) {
        if (info.change === 0) continue; // no net change

        const stockField = `stock_${info.location}`;
        
        // Read fresh stock from database
        const { data: freshProduct, error: freshError } = await supabase
          .from('products')
          .select(`id, ${stockField}`)
          .eq('id', info.productId)
          .single();

        if (freshError) {
          stockUpdateFailed = true;
          toast({ title: 'Gagal membaca stok', description: freshError.message, variant: 'destructive' });
          break;
        }

        const currentStock = (freshProduct as any)?.[stockField] || 0;
        const newStock = currentStock + info.change;

        if (newStock < 0) {
          stockUpdateFailed = true;
          toast({ title: 'Stok tidak cukup', description: `${info.productName} stok terbaru tidak mencukupi`, variant: 'destructive' });
          break;
        }

        const { error: stockError } = await supabase
          .from('products')
          .update({ [stockField]: newStock })
          .eq('id', info.productId);

        if (stockError) {
          stockUpdateFailed = true;
          toast({ title: 'Gagal update stok', description: stockError.message, variant: 'destructive' });
          break;
        }

        // Store opposite change to reverse if we need to rollback later
        stockUpdated.push({ productId: info.productId, quantity: -info.change, field: stockField });

        const type = info.change > 0 ? 'in' : 'out';
        const qty = Math.abs(info.change);
        let note = '';
        if (info.change > 0 && data.exchangeOriginalItems) {
            note = `Ganti barang ke INV/xxx`; // Using generic since new saleNumber is not fully parsed? Actually we have saleNumber here!
            note = `Ganti barang ke ${saleNumber}`;
        } else {
            note = `Penjualan ${saleNumber} (${data.paymentMethod})`;
        }

        stockLogsToInsert.push({
          product_id: info.productId,
          type: type,
          quantity: qty,
          location: info.location,
          user_id: user.id,
          note: note,
          stock_before: currentStock,
          stock_after: newStock
        });
    }

    // Rollback if stock update failed
    if (stockUpdateFailed) {
      // Restore already-updated stock
      for (const updated of stockUpdated) {
        const { data: curr } = await supabase
          .from('products')
          .select(`id, ${updated.field}`)
          .eq('id', updated.productId)
          .single();
        if (curr) {
          const restored = ((curr as any)[updated.field] || 0) + updated.quantity;
          await supabase.from('products').update({ [updated.field]: restored }).eq('id', updated.productId);
        }
      }
      // Delete sale items and sale record
      await supabase.from('sale_items').delete().eq('sale_id', saleRow.id);
      await supabase.from('sales').delete().eq('id', saleRow.id);
      return null;
    }

    await addNotification({
      title: data.isCredit ? 'Piutang Baru' : 'Penjualan Berhasil',
      message: data.isCredit
        ? `Piutang ${saleNumber} atas nama ${data.creditCustomerName}`
        : `Penjualan ${saleNumber} berhasil dibuat`,
      type: data.isCredit ? 'warning' : 'success',
      link: '/finance/sales-history',
    });

    // ✅ Broadcast changes instead of re-fetching (saves egress)
    broadcastTableChange('sales', 'INSERT', ['sales', 'sales-history'], saleRow);
    
    // Batch Insert Stock Logs
    if (stockLogsToInsert.length > 0) {
        const { data: insertedLogs } = await supabase.from('stock_logs').insert(stockLogsToInsert).select('*, products(*)');
        if (insertedLogs) {
            insertedLogs.forEach((log) => {
                 broadcastTableChange('stock_logs', 'INSERT', ['stock-logs'], log);
            });
        }
    }

    // Products will auto-update via postgres_changes (stock changes via DB)
    return { saleId: saleRow.id, saleNumber };
  };

  const addProduct = async (product: { name: string; barcode: string; price: number; stock: { gudang: number; toko: number }; image_url?: string; has_multi_unit?: boolean; main_unit?: string | null; pcs_per_box?: number | null; box_price?: number | null; sell_by_quantity?: boolean; sell_unit?: string; bulk_quantity?: number | null; bulk_price?: number | null }) => {
    const { data: inserted, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        stock_gudang: product.stock.gudang,
        stock_toko: product.stock.toko,
        image_url: product.image_url,
        has_multi_unit: product.has_multi_unit ?? false,
        main_unit: product.main_unit ?? null,
        pcs_per_box: product.pcs_per_box ?? null,
        box_price: product.box_price ?? null,
        sell_by_quantity: product.sell_by_quantity ?? false,
        sell_unit: product.sell_unit ?? 'pcs',
        bulk_quantity: product.bulk_quantity ?? null,
        bulk_price: product.bulk_price ?? null,
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
      link: `/products?highlight=${inserted?.id}`
    });

    await addActivityLog({
      action: 'product_create',
      entityType: 'product',
      entityId: inserted?.id ?? null,
      description: `Tambah produk: ${product.name}`,
    });

    // ✅ Broadcast instead of re-fetch — postgres_changes will also patch
    if (inserted) {
      broadcastTableChange('products', 'INSERT', ['products'], inserted);
    }

    return true;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    const updateData: any = {};
    // Bug fix #10: Use !== undefined instead of truthy check
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.barcode !== undefined) updateData.barcode = updates.barcode;
    if (typeof updates.price === 'number') updateData.price = updates.price;
    if (updates.image_url !== undefined) updateData.image_url = updates.image_url;
    if (updates.stock) {
      updateData.stock_gudang = updates.stock.gudang;
      updateData.stock_toko = updates.stock.toko;
    }
    if (updates.has_multi_unit !== undefined) updateData.has_multi_unit = updates.has_multi_unit;
    if (updates.main_unit !== undefined) updateData.main_unit = updates.main_unit;
    if (updates.pcs_per_box !== undefined) updateData.pcs_per_box = updates.pcs_per_box;
    if (updates.box_price !== undefined) updateData.box_price = updates.box_price;
    if (updates.sell_by_quantity !== undefined) updateData.sell_by_quantity = updates.sell_by_quantity;
    if (updates.sell_unit !== undefined) updateData.sell_unit = updates.sell_unit;
    if (updates.bulk_quantity !== undefined) updateData.bulk_quantity = updates.bulk_quantity;
    if (updates.bulk_price !== undefined) updateData.bulk_price = updates.bulk_price;

    console.log('[updateProduct] Sending update:', { id, updateData });

    const { error, count } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('[updateProduct] Supabase error:', error);
      toast({ title: 'Gagal update produk', description: error.message, variant: 'destructive' });
      return false;
    }

    // Check if any rows were actually updated (RLS may silently block)
    if (count === 0) {
      console.error('[updateProduct] No rows updated — likely blocked by RLS policy');
      toast({
        title: 'Gagal update produk',
        description: 'Anda tidak memiliki izin untuk mengubah produk ini. Hubungi admin.',
        variant: 'destructive',
      });
      return false;
    }

    console.log('[updateProduct] Success, rows updated:', count);

    const prev = products.find(p => p.id === id);
    await addActivityLog({
      action: 'product_update',
      entityType: 'product',
      entityId: id,
      description: `Update produk: ${prev?.name || 'Produk'}${updates.name ? ` → ${updates.name}` : ''}`,
    });

    // ✅ Products will auto-update via postgres_changes smart-patch
    // But we also apply an optimistic update here so the UI updates immediately for the sender
    const store = useDataStore.getState();
    store.setProducts(prevProducts => prevProducts.map(p => 
      p.id === id ? { 
        ...p, 
        ...updates, 
        stock: updates.stock ? { gudang: updates.stock.gudang, toko: updates.stock.toko } : p.stock 
      } : p
    ));

    // Broadcast to other tabs/devices
    broadcastTableChange('products', 'UPDATE', ['products']);

    return true;
  };

  const deleteProduct = async (id: string) => {
    const product = products.find(p => p.id === id);

    // Bug fix #19: Check for existing sales before deleting product
    const { count: saleCount } = await supabase
      .from('sale_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id);

    if (saleCount && saleCount > 0) {
      toast({
        title: 'Tidak bisa hapus produk',
        description: `Produk ini memiliki ${saleCount} riwayat penjualan. Nonaktifkan saja jika tidak digunakan lagi.`,
        variant: 'destructive',
      });
      return false;
    }

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

    // ✅ Products will auto-update via postgres_changes smart-patch
    broadcastTableChange('products', 'DELETE', ['products'], undefined, id);
    return true;
  };

  const getProductByBarcode = useCallback((barcode: string) => {
    return products.find(p => p.barcode === barcode);
  }, [products]);

  const addStock = async (productId: string, quantity: number, location: Location) => {
    const product = products.find(p => p.id === productId);
    if (!product || !user) return;

    const stockField = `stock_${location}`;

    // Bug fix #11: Read fresh stock from DB instead of stale client state
    const { data: freshProduct, error: readError } = await supabase
      .from('products')
      .select(`id, ${stockField}`)
      .eq('id', productId)
      .single();

    if (readError || !freshProduct) {
      toast({ title: 'Error', description: readError?.message || 'Produk tidak ditemukan', variant: 'destructive' });
      return;
    }

    const currentStock = (freshProduct as any)?.[stockField] || 0;
    const newStock = currentStock + quantity;

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
      note: `Stok masuk oleh ${profile?.name || 'User'}`,
      stock_before: currentStock,
      stock_after: newStock
    });

    await addNotification({
      title: 'Stok Masuk',
      message: `${quantity} ${product.name} ditambahkan ke ${location}`,
      type: 'success',
      link: '/stock-in'
    });

    // ✅ Broadcast instead of re-fetch
    broadcastTableChange('stock_logs', 'INSERT', ['stock-logs']);
    // Products will auto-update via postgres_changes
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

    // ✅ Broadcast instead of re-fetch
    broadcastTableChange('stock_out_requests', 'INSERT', ['stock-requests']);
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

    // ✅ Broadcast instead of re-fetch
    broadcastTableChange('stock_out_requests', 'UPDATE', ['stock-requests']);
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

    // ✅ Broadcast instead of re-fetch
    broadcastTableChange('surat_jalan', 'INSERT', ['surat-jalan', 'surat-jalan-b2b']);
    broadcastTableChange('stock_out_requests', 'UPDATE', ['stock-requests']);
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

          // Bug fix #5: Read fresh stock from DB instead of stale client state
          const { data: freshProduct, error: freshErr } = await supabase
            .from('products')
            .select('id, stock_gudang, stock_toko')
            .eq('id', product.id)
            .single();

          if (freshErr || !freshProduct) {
            console.error('Failed to read fresh stock:', freshErr);
            continue;
          }

          const freshFrom = item.from_location === 'gudang' ? freshProduct.stock_gudang : freshProduct.stock_toko;
          const freshTo = item.to_location === 'gudang' ? freshProduct.stock_gudang : freshProduct.stock_toko;

          // Outgoing
          const outAfter = Math.max(0, freshFrom - item.quantity);
          // Incoming
          const inAfter = freshTo + item.quantity;

          await supabase
            .from('products')
            .update({
              [fromField]: outAfter,
              [toField]: inAfter
            })
            .eq('id', product.id);

          await supabase.from('stock_logs').insert([
            {
              product_id: product.id,
              type: 'out',
              quantity: item.quantity,
              location: item.from_location,
              user_id: user.id,
              note: `Transfer keluar ke ${item.to_location} via ${sj.number}`,
              stock_before: freshFrom,
              stock_after: outAfter
            },
            {
              product_id: product.id,
              type: 'in',
              quantity: item.quantity,
              location: item.to_location,
              user_id: user.id,
              note: `Transfer masuk dari ${item.from_location} via ${sj.number}`,
              stock_before: freshTo,
              stock_after: inAfter
            }
          ]);
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

    // ✅ Broadcast instead of re-fetch
    broadcastTableChange('surat_jalan', 'UPDATE', ['surat-jalan', 'surat-jalan-b2b']);
    broadcastTableChange('stock_out_requests', 'UPDATE', ['stock-requests']);
    broadcastTableChange('stock_logs', 'INSERT', ['stock-logs']);
    // Products will auto-update via postgres_changes
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

  const unreadCount = useDataStore(s => s.unreadCount);

  // Sync actions to the Zustand store so components using useDataStore (like Products/POS) 
  // have access to them properly after the provider initializes.
  useEffect(() => {
    useDataStore.setState({
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
      refreshData
    });
  }, [
    addProduct, updateProduct, deleteProduct, getProductByBarcode,
    createSale, addStock, createStockOutRequest, updateRequestStatus,
    createSuratJalan, updateSuratJalanStatus, markNotificationRead,
    markAllNotificationsRead, refreshData
  ]);

  const contextValue = useMemo(() => ({
    // Data provided merely for backward compatibility if any missed

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
    refreshData,
  }), [
    products, requests, suratJalans, stockLogs, notifications,
    sales, cashTransfers, activityLogs, loading, unreadCount,
    // Functions with stable references (useCallback or defined once)
    addProduct, updateProduct, deleteProduct, getProductByBarcode,
    createSale, addStock, createStockOutRequest, updateRequestStatus,
    createSuratJalan, updateSuratJalanStatus, markNotificationRead,
    markAllNotificationsRead, refreshData,
  ]);

  return (
    <DataContext.Provider value={contextValue}>
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

export function useDataActions() {
  return useContext(DataContext)!;
}

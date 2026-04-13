import { create } from 'zustand';
import type { 
  Product, 
  StockOutRequest, 
  SuratJalan, 
  StockLog, 
  Notification, 
  Sale, 
  CashTransfer, 
  ActivityLog 
} from '@/types';

interface DataState {
  products: Product[];
  requests: StockOutRequest[];
  suratJalans: SuratJalan[];
  stockLogs: StockLog[];
  notifications: Notification[];
  sales: Sale[];
  cashTransfers: CashTransfer[];
  activityLogs: ActivityLog[];
  loading: boolean;
  unreadCount: number;

  setProducts: (fn: Product[] | ((prev: Product[]) => Product[])) => void;
  setRequests: (fn: StockOutRequest[] | ((prev: StockOutRequest[]) => StockOutRequest[])) => void;
  setSuratJalans: (fn: SuratJalan[] | ((prev: SuratJalan[]) => SuratJalan[])) => void;
  setStockLogs: (fn: StockLog[] | ((prev: StockLog[]) => StockLog[])) => void;
  setNotifications: (fn: Notification[] | ((prev: Notification[]) => Notification[])) => void;
  setSales: (fn: Sale[] | ((prev: Sale[]) => Sale[])) => void;
  setCashTransfers: (fn: CashTransfer[] | ((prev: CashTransfer[]) => CashTransfer[])) => void;
  setActivityLogs: (fn: ActivityLog[] | ((prev: ActivityLog[]) => ActivityLog[])) => void;
  setLoading: (loading: boolean) => void;

  // Actions
  addProduct?: (product: any) => Promise<boolean>;
  updateProduct?: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct?: (id: string) => Promise<boolean>;
  getProductByBarcode?: (barcode: string) => Product | undefined;
  createSale?: (data: any) => Promise<{ saleId: string; saleNumber: string } | null>;
  addStock?: (productId: string, quantity: number, location: string) => Promise<void>;
  createStockOutRequest?: (data: any) => Promise<void>;
  updateRequestStatus?: (id: string, status: any, reason?: string) => Promise<void>;
  createSuratJalan?: (requestIds: string[]) => Promise<void>;
  updateSuratJalanStatus?: (id: string, status: any, reason?: string) => Promise<void>;
  markNotificationRead?: (id: string) => Promise<void>;
  markAllNotificationsRead?: () => Promise<void>;
  refreshData?: () => Promise<void>;
}

export const useDataStore = create<DataState>((set) => ({
  products: [],
  requests: [],
  suratJalans: [],
  stockLogs: [],
  notifications: [],
  sales: [],
  cashTransfers: [],
  activityLogs: [],
  loading: true,
  unreadCount: 0,

  setProducts: (updater) => set((s) => ({ products: typeof updater === 'function' ? updater(s.products) : updater })),
  setRequests: (updater) => set((s) => ({ requests: typeof updater === 'function' ? updater(s.requests) : updater })),
  setSuratJalans: (updater) => set((s) => ({ suratJalans: typeof updater === 'function' ? updater(s.suratJalans) : updater })),
  setStockLogs: (updater) => set((s) => ({ stockLogs: typeof updater === 'function' ? updater(s.stockLogs) : updater })),
  setNotifications: (updater) => set((s) => {
      const next = typeof updater === 'function' ? updater(s.notifications) : updater;
      return { notifications: next, unreadCount: next.filter(n => !n.read).length };
  }),
  setSales: (updater) => set((s) => ({ sales: typeof updater === 'function' ? updater(s.sales) : updater })),
  setCashTransfers: (updater) => set((s) => ({ cashTransfers: typeof updater === 'function' ? updater(s.cashTransfers) : updater })),
  setActivityLogs: (updater) => set((s) => ({ activityLogs: typeof updater === 'function' ? updater(s.activityLogs) : updater })),
  setLoading: (loading) => set({ loading }),
}));

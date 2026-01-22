export type UserRole = 'warehouse' | 'cashier' | 'main_office' | 'auditor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type Location = 'gudang' | 'toko';

export type PaymentMethod = 'cash' | 'transfer';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  image_url?: string | null;
  stock: {
    gudang: number;
    toko: number;
    reserved?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string | null;
  surat_jalan_id?: string | null;
  recipient_name: string;
  recipient_address?: string | null;
  total_amount: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'cancelled';
  due_date?: string | null;
  issued_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  customer?: Customer; // joined
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface StockOutRequest {
  id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  from_location: Location;
  to_location: Location;
  to_location_name?: string | null;
  status: RequestStatus;
  requested_by: string | null;
  requested_at: string;
  surat_jalan_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_reason?: string | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  price: number;
  subtotal: number;
  discount: number; // percentage discount per item
}

export interface Sale {
  id: string;
  sale_number: string;
  cashier_id: string | null;
  cashier_name: string;
  payment_method: PaymentMethod;
  stock_location: Location;
  total_amount: number;
  order_discount: number; // percentage discount for entire order
  amount_paid: number; // amount customer paid
  change_amount: number; // change returned to customer
  created_at: string;
  items: SaleItem[];
}

export interface CashTransfer {
  id: string;
  cashier_id: string | null;
  cashier_name: string;
  amount: number;
  transfer_date: string;
  created_at: string;
  note?: string | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string;
  user_role: UserRole;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  created_at: string;
}

export interface SuratJalanItem {
  id: string;
  surat_jalan_id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  image_url?: string | null;
  quantity: number;
  from_location: Location;
  to_location: Location;
}

export interface SuratJalan {
  id: string;
  number: string;
  items: SuratJalanItem[];
  status: string; // Updated from RequestStatus to string to support B2B statuses
  created_by: string | null;
  created_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_reason?: string | null;
  recipient_name?: string | null;
  recipient_address?: string | null;
  type?: string;
  issue_note?: GoodsIssueNote; // Joined
}

export interface StockLog {
  id: string;
  product_id: string;
  product?: Product;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  location: Location;
  user_id: string | null;
  timestamp: string;
  note?: string | null;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  link?: string | null;
}

// Cash transfer request for approval workflow
export type CashTransferRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CashTransferRequest {
  id: string;
  cashier_id: string | null;
  cashier_name: string;
  amount: number;
  note?: string | null;
  status: CashTransferRequestStatus;
  requested_at: string;
  auditor_id?: string | null;
  auditor_name?: string | null;
  processed_at?: string | null;
  rejected_reason?: string | null;
  created_at: string;
}

// Multi-item stock request form item
export interface StockRequestItem {
  id: string; // temporary id for form
  productId: string;
  product?: Product;
  quantity: number;
  fromLocation: Location;
  toLocation: Location;
}

// Stock opname (physical stock count)
export type StockOpnameStatus = 'pending' | 'approved' | 'rejected';

export interface StockOpname {
  id: string;
  product_id: string;
  product?: Product;
  location: Location;
  system_stock: number;
  actual_stock: number;
  difference: number;
  note?: string | null;
  counted_by: string | null;
  counted_by_name?: string | null;
  status: StockOpnameStatus;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejected_reason?: string | null;
  created_at: string;
}



// ==================================================
// NEW STOCK REQUEST SYSTEM TYPES
// ==================================================

export type NewRequestStatus =
  | 'pending_main_office'
  | 'pending_gudang'
  | 'pending_shipment' // alias or legacy
  | 'pending_auditor'
  | 'pending_receipt'
  | 'completed'
  | 'rejected';

export interface NewStockRequestItem {
  id: string;
  stock_request_id: string;
  product_id: string;
  product?: Product; // joined
  quantity: number;
  unit: string;
  note?: string | null;
}

export interface NewStockRequest {
  id: string;
  request_number?: string | null;
  cashier_id: string;
  cashier_name: string;
  reason: string;
  status: NewRequestStatus;

  main_office_id?: string | null;
  main_office_name?: string | null;
  main_office_approved_at?: string | null;

  rejected_reason?: string | null;
  created_at: string;
  updated_at: string;

  // Joined items
  items?: NewStockRequestItem[];
}

export type ShipmentStatus = 'pending_auditor' | 'approved' | 'rejected' | 'needs_revision';

export interface StockShipmentItem {
  id: string;
  stock_shipment_id: string;
  product_id: string;
  product?: Product;
  quantity_shipped: number;
}

export interface StockShipment {
  id: string;
  stock_request_id: string;
  request?: NewStockRequest; // joined

  shipped_by: string;
  shipped_at: string;
  status: ShipmentStatus;

  auditor_id?: string | null;
  auditor_approved_at?: string | null;
  revision_note?: string | null;

  created_at: string;

  // Joined items
  items?: StockShipmentItem[];
}

export interface GoodsReceipt {
  id: string;
  receipt_number: string;
  stock_request_id: string;
  stock_shipment_id: string;
  received_by: string;
  received_at: string;
  photo_url?: string | null;
  note?: string | null;
  created_at: string;
}

export interface GoodsIssueNote {
  id: string;
  issue_number: string;
  surat_jalan_id: string;
  issued_by: string;
  issued_at: string;
  status: string;
  auditor_id?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ==================================================
// PURCHASE ORDER SYSTEM TYPES
// ==================================================

export interface Supplier {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_person?: string | null;
  created_at: string;
  updated_at: string;
}

export type POStatus = 'pending_auditor' | 'approved' | 'rejected' | 'pending_receipt' | 'completed';
export type PODestination = 'gudang' | 'toko';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id?: string | null;
  product?: Product; // joined
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id?: string | null;
  supplier?: Supplier; // joined
  destination: PODestination;
  status: POStatus;
  total_amount: number;
  notes?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  auditor_id?: string | null;
  auditor_name?: string | null;
  auditor_action_at?: string | null;
  rejected_reason?: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[]; // joined
}

export interface POReceipt {
  id: string;
  purchase_order_id: string;
  purchase_order?: PurchaseOrder; // joined
  received_by?: string | null;
  received_by_name?: string | null;
  photo_url?: string | null;
  notes?: string | null;
  received_at: string;
  created_at: string;
}

export interface OtherTransaction {
  id: string;
  transaction_date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string | null;
  proof_url?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
}

// Direct Order (Supplier -> Customer, bypass warehouse)
export type DirectOrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface DirectOrderItem {
  id: string;
  direct_order_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  note?: string | null;
}

export interface DirectOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  customer_id: string;
  customer_name: string;
  delivery_address: string;
  delivery_phone?: string | null;
  status: DirectOrderStatus;
  shipping_cost: number;
  total_amount: number;
  notes?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  confirmed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  created_at: string;
  updated_at: string;
  items?: DirectOrderItem[];
  supplier?: Supplier;
  customer?: Customer;
}

// Marketplace Orders
export type MarketplaceType = 'tokopedia' | 'shopee' | 'lazada' | 'bukalapak' | 'other';
export type MarketplaceOrderStatus = 'pending_arrival' | 'completed' | 'received_with_issue' | 'return_pending' | 'return_complete' | 'cancelled';
export type MarketplaceReturnStatus = 'pending' | 'picked_up' | 'completed';

export interface MarketplaceOrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  barcode?: string | null;
  unit?: string;
  quantity_ordered: number;
  quantity_received?: number;
  quantity_damaged?: number;
  unit_price: number;
  total_price: number;
  damage_notes?: string | null;
  created_at: string;
  product?: Product;
}

export interface MarketplaceOrder {
  id: string;
  order_number: string;
  marketplace: MarketplaceType;
  marketplace_order_id?: string | null;
  destination: 'gudang' | 'toko';
  status: MarketplaceOrderStatus;
  total_amount: number;
  invoice_url?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  received_by?: string | null;
  received_by_name?: string | null;
  received_at?: string | null;
  has_discrepancy?: boolean;
  signature_url?: string | null;
  created_at: string;
  updated_at: string;
  items?: MarketplaceOrderItem[];
  returns?: MarketplaceReturn[];
}

export interface MarketplaceReturn {
  id: string;
  order_id: string;
  reason: string;
  status: MarketplaceReturnStatus;
  items_json?: unknown;
  pickup_proof_url?: string | null;
  return_proof_url?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  created_at: string;
}
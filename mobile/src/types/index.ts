// User roles
export type UserRole =
    | 'super_admin'
    | 'main_office'
    | 'auditor'
    | 'warehouse'
    | 'cashier';

// Location for stock
export type Location = 'gudang' | 'toko';

// Payment methods
export type PaymentMethod = 'cash' | 'transfer';

// User profile
export interface Profile {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar_url?: string;
    created_at: string;
}

// Product
export interface Product {
    id: string;
    name: string;
    barcode: string;
    price: number;
    image_url?: string | null;
    stock: {
        gudang: number;
        toko: number;
    };
    created_at: string;
    updated_at: string;
}

// Sale
export interface Sale {
    id: string;
    sale_number: string;
    cashier_id: string;
    cashier_name: string;
    payment_method: PaymentMethod;
    stock_location: Location;
    total_amount: number;
    order_discount: number;
    amount_paid: number;
    change_amount: number;
    created_at: string;
    items: SaleItem[];
}

// Sale Item
export interface SaleItem {
    id: string;
    sale_id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total_price: number;
}

// Cart Item (for POS)
export interface CartItem {
    product: Product;
    quantity: number;
    discount: number;
}

// Notification
export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
    is_read: boolean;
    created_at: string;
}

// Stock Request Status
export type StockRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

// Stock Request
export interface StockRequest {
    id: string;
    request_number: string;
    requester_id: string;
    requester_name: string;
    status: StockRequestStatus;
    notes?: string;
    created_at: string;
    items: StockRequestItem[];
}

// Stock Request Item
export interface StockRequestItem {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    status: StockRequestStatus;
}

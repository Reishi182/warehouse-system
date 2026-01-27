import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Product, CartItem, Profile } from '../types';

export default function POSScreen() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);

    useEffect(() => {
        fetchProducts();
        fetchProfile();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;

            const formattedProducts = (data || []).map(p => ({
                ...p,
                stock: {
                    gudang: p.stock_gudang || 0,
                    toko: p.stock_toko || 0,
                },
            }));

            setProducts(formattedProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setProfile(data);
        }
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.barcode.toLowerCase().includes(query)
        );
    }, [products, searchQuery]);

    const addToCart = (product: Product) => {
        if (product.stock.toko <= 0) {
            Alert.alert('Stok Habis', 'Produk ini tidak tersedia');
            return;
        }

        setCart(prev => {
            const idx = prev.findIndex(it => it.product.id === product.id);
            if (idx >= 0) {
                const next = [...prev];
                if (next[idx].quantity >= product.stock.toko) {
                    Alert.alert('Stok Tidak Cukup', `Maksimal ${product.stock.toko} unit`);
                    return prev;
                }
                next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
                return next;
            }
            return [...prev, { product, quantity: 1, discount: 0 }];
        });
    };

    const updateQuantity = (productId: string, qty: number) => {
        if (qty <= 0) {
            setCart(prev => prev.filter(it => it.product.id !== productId));
            return;
        }
        setCart(prev =>
            prev.map(it =>
                it.product.id === productId ? { ...it, quantity: qty } : it
            )
        );
    };

    const subtotal = useMemo(() => {
        return cart.reduce((acc, it) => acc + (it.product.price * it.quantity), 0);
    }, [cart]);

    const itemCount = useMemo(() => {
        return cart.reduce((acc, it) => acc + it.quantity, 0);
    }, [cart]);

    const handleCheckout = async () => {
        if (cart.length === 0 || !profile) return;

        setProcessing(true);
        try {
            // Generate sale number
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
            const saleNumber = `INV/${dateStr}-${rand}`;

            // Create sale
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    sale_number: saleNumber,
                    cashier_id: profile.id,
                    cashier_name: profile.name,
                    payment_method: 'cash',
                    stock_location: 'toko',
                    total_amount: subtotal,
                    order_discount: 0,
                    amount_paid: subtotal,
                    change_amount: 0,
                })
                .select()
                .single();

            if (saleError) throw saleError;

            // Create sale items
            const items = cart.map(it => ({
                sale_id: sale.id,
                product_id: it.product.id,
                product_name: it.product.name,
                quantity: it.quantity,
                unit_price: it.product.price,
                discount: 0,
                total_price: it.product.price * it.quantity,
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(items);

            if (itemsError) throw itemsError;

            // Update stock
            for (const item of cart) {
                const { data: product } = await supabase
                    .from('products')
                    .select('stock_toko')
                    .eq('id', item.product.id)
                    .single();

                if (product) {
                    await supabase
                        .from('products')
                        .update({ stock_toko: product.stock_toko - item.quantity })
                        .eq('id', item.product.id);
                }
            }

            Alert.alert(
                '✅ Berhasil',
                `Transaksi ${saleNumber}\nTotal: Rp ${subtotal.toLocaleString('id-ID')}`,
                [{ text: 'OK' }]
            );

            setCart([]);
            setShowCart(false);
            fetchProducts();
        } catch (error: any) {
            Alert.alert('Gagal', error.message);
        } finally {
            setProcessing(false);
        }
    };

    const renderProduct = ({ item: product }: { item: Product }) => {
        const stock = product.stock.toko;
        const inCart = cart.find(it => it.product.id === product.id);

        return (
            <TouchableOpacity
                style={[styles.productCard, stock <= 0 && styles.productCardOutOfStock]}
                onPress={() => addToCart(product)}
                disabled={stock <= 0}
            >
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productPrice}>
                        Rp {product.price.toLocaleString('id-ID')}
                    </Text>
                    <Text style={[styles.productStock, stock <= 0 && styles.outOfStock]}>
                        {stock <= 0 ? 'Habis' : `Stok: ${stock}`}
                    </Text>
                </View>
                {inCart && (
                    <View style={styles.cartBadge}>
                        <Text style={styles.cartBadgeText}>{inCart.quantity}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Search */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Cari produk..."
                    placeholderTextColor="#9ca3af"
                />
            </View>

            {/* Products */}
            <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.productList}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
                }
            />

            {/* Cart FAB */}
            {cart.length > 0 && (
                <TouchableOpacity
                    style={styles.cartFab}
                    onPress={() => setShowCart(true)}
                >
                    <Text style={styles.cartFabIcon}>🛒</Text>
                    <View style={styles.cartFabBadge}>
                        <Text style={styles.cartFabBadgeText}>{itemCount}</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Cart Modal */}
            <Modal visible={showCart} animationType="slide">
                <View style={styles.cartModal}>
                    <View style={styles.cartHeader}>
                        <Text style={styles.cartTitle}>Keranjang</Text>
                        <TouchableOpacity onPress={() => setShowCart(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={cart}
                        keyExtractor={(item) => item.product.id}
                        renderItem={({ item }) => (
                            <View style={styles.cartItem}>
                                <View style={styles.cartItemInfo}>
                                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                                    <Text style={styles.cartItemPrice}>
                                        Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}
                                    </Text>
                                </View>
                                <View style={styles.quantityControls}>
                                    <TouchableOpacity
                                        style={styles.qtyButton}
                                        onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                                    >
                                        <Text style={styles.qtyButtonText}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{item.quantity}</Text>
                                    <TouchableOpacity
                                        style={styles.qtyButton}
                                        onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                                    >
                                        <Text style={styles.qtyButtonText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />

                    <View style={styles.cartFooter}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>
                                Rp {subtotal.toLocaleString('id-ID')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.checkoutButton, processing && styles.checkoutButtonDisabled]}
                            onPress={handleCheckout}
                            disabled={processing}
                        >
                            {processing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.checkoutButtonText}>Bayar Sekarang</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#fff',
    },
    searchInput: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    productList: {
        padding: 8,
    },
    productCard: {
        flex: 1,
        margin: 6,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    productCardOutOfStock: {
        opacity: 0.5,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#7c3aed',
        marginBottom: 4,
    },
    productStock: {
        fontSize: 12,
        color: '#6b7280',
    },
    outOfStock: {
        color: '#ef4444',
    },
    cartBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#7c3aed',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        marginTop: 48,
    },
    cartFab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#7c3aed',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    cartFabIcon: {
        fontSize: 24,
    },
    cartFabBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#ef4444',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartFabBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cartModal: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    cartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    cartTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    closeButton: {
        fontSize: 24,
        color: '#6b7280',
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 8,
        marginHorizontal: 16,
        padding: 12,
        borderRadius: 12,
    },
    cartItemInfo: {
        flex: 1,
    },
    cartItemName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    cartItemPrice: {
        fontSize: 14,
        color: '#7c3aed',
        marginTop: 4,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    qtyButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    qtyText: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 12,
        color: '#1f2937',
    },
    cartFooter: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: 16,
        color: '#6b7280',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    checkoutButton: {
        backgroundColor: '#7c3aed',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    checkoutButtonDisabled: {
        opacity: 0.7,
    },
    checkoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

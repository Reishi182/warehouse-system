import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [todayStats, setTodayStats] = useState({ sales: 0, revenue: 0 });

    useEffect(() => {
        fetchProfile();
        fetchTodayStats();
    }, []);

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

    const fetchTodayStats = async () => {
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await supabase
            .from('sales')
            .select('total_amount')
            .gte('created_at', today);

        if (data) {
            setTodayStats({
                sales: data.length,
                revenue: data.reduce((acc, sale) => acc + sale.total_amount, 0),
            });
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchProfile(), fetchTodayStats()]);
        setRefreshing(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            super_admin: 'Super Admin',
            main_office: 'Main Office',
            auditor: 'Auditor',
            warehouse: 'Warehouse',
            cashier: 'Kasir',
        };
        return labels[role] || role;
    };

    const menuItems = [
        { id: 'pos', title: 'Point of Sale', icon: '🛒', screen: 'POS', roles: ['cashier', 'super_admin'] },
        { id: 'products', title: 'Produk', icon: '📦', screen: null, roles: ['warehouse', 'main_office', 'super_admin'] },
        { id: 'stock', title: 'Stok Request', icon: '📋', screen: null, roles: ['cashier', 'warehouse', 'super_admin'] },
        { id: 'sales', title: 'Riwayat Penjualan', icon: '📊', screen: null, roles: ['cashier', 'main_office', 'auditor', 'super_admin'] },
    ];

    const filteredMenuItems = menuItems.filter(
        item => profile && (item.roles.includes(profile.role) || item.roles.includes('super_admin'))
    );

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {profile?.name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
                    <Text style={styles.profileRole}>
                        {profile ? getRoleLabel(profile.role) : '-'}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Keluar</Text>
                </TouchableOpacity>
            </View>

            {/* Today Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{todayStats.sales}</Text>
                    <Text style={styles.statLabel}>Transaksi Hari Ini</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                        Rp {(todayStats.revenue / 1000).toFixed(0)}k
                    </Text>
                    <Text style={styles.statLabel}>Pendapatan</Text>
                </View>
            </View>

            {/* Menu Grid */}
            <Text style={styles.sectionTitle}>Menu</Text>
            <View style={styles.menuGrid}>
                {filteredMenuItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.menuItem, !item.screen && styles.menuItemDisabled]}
                        onPress={() => {
                            if (item.screen) {
                                navigation.navigate(item.screen as keyof RootStackParamList);
                            }
                        }}
                        disabled={!item.screen}
                    >
                        <Text style={styles.menuIcon}>{item.icon}</Text>
                        <Text style={styles.menuTitle}>{item.title}</Text>
                        {!item.screen && (
                            <Text style={styles.menuComingSoon}>Segera</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#7c3aed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    profileRole: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    logoutButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
    },
    logoutText: {
        color: '#ef4444',
        fontWeight: '500',
        fontSize: 14,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#7c3aed',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 24,
        marginBottom: 12,
        marginLeft: 16,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 12,
    },
    menuItem: {
        width: '47%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    menuItemDisabled: {
        opacity: 0.6,
    },
    menuIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    menuTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
        textAlign: 'center',
    },
    menuComingSoon: {
        fontSize: 10,
        color: '#9ca3af',
        marginTop: 4,
    },
});

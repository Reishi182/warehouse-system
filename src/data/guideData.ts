import { UserRole } from '@/types';
import {
    ShoppingCart,
    Package,
    ClipboardCheck,
    Wallet,
    FileText,
    Users,
    Settings,
    Truck,
    ArrowDownToLine,
    ArrowUpFromLine,
    BarChart3,
    Building2,
    Receipt,
    FileCheck,
    Boxes,
    type LucideIcon,
} from 'lucide-react';

export interface GuideStep {
    step: number;
    title: string;
    description: string;
}

export interface GuideProcedure {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    category: string;
    roles: UserRole[];
    href?: string;
    steps: GuideStep[];
}

export const guideData: GuideProcedure[] = [
    // =====================
    // KASIR PROCEDURES
    // =====================
    {
        id: 'pos-transaction',
        title: 'Transaksi Penjualan (POS)',
        description: 'Prosedur melakukan penjualan melalui sistem kasir',
        icon: ShoppingCart,
        category: 'Penjualan',
        roles: ['cashier', 'admin'],
        href: '/pos',
        steps: [
            { step: 1, title: 'Buka Menu POS', description: 'Navigasi ke menu Kasir (POS) di sidebar' },
            { step: 2, title: 'Pilih Produk', description: 'Cari produk dengan barcode scanner atau ketik nama produk di kolom pencarian' },
            { step: 3, title: 'Tambah ke Keranjang', description: 'Klik produk untuk menambahkan ke keranjang belanja' },
            { step: 4, title: 'Atur Jumlah', description: 'Sesuaikan jumlah produk dengan klik +/- atau edit langsung' },
            { step: 5, title: 'Pilih Metode Pembayaran', description: 'Pilih Cash atau Transfer untuk metode pembayaran' },
            { step: 6, title: 'Proses Pembayaran', description: 'Masukkan jumlah uang yang diterima dan klik Bayar' },
            { step: 7, title: 'Cetak Struk', description: 'Struk akan otomatis tercetak setelah transaksi berhasil' },
        ],
    },
    {
        id: 'stock-request',
        title: 'Pengajuan Permintaan Stok',
        description: 'Prosedur mengajukan permintaan stok dari gudang ke toko',
        icon: ArrowUpFromLine,
        category: 'Stok',
        roles: ['cashier', 'admin'],
        href: '/requests',
        steps: [
            { step: 1, title: 'Buka Menu Permintaan Stok', description: 'Navigasi ke Stok > Permintaan Stok' },
            { step: 2, title: 'Klik Buat Permintaan', description: 'Klik tombol "Buat Permintaan Baru"' },
            { step: 3, title: 'Pilih Produk', description: 'Cari dan pilih produk yang ingin diminta' },
            { step: 4, title: 'Masukkan Jumlah', description: 'Tentukan jumlah produk yang dibutuhkan' },
            { step: 5, title: 'Tambahkan Alasan', description: 'Isi alasan permintaan stok (opsional)' },
            { step: 6, title: 'Submit Permintaan', description: 'Klik Submit untuk mengirim permintaan ke Kantor Pusat' },
            { step: 7, title: 'Tunggu Approval', description: 'Permintaan akan diproses oleh Kantor Pusat dan Gudang' },
        ],
    },
    {
        id: 'goods-receipt-cashier',
        title: 'Penerimaan Barang',
        description: 'Prosedur menerima barang yang dikirim dari gudang',
        icon: ArrowDownToLine,
        category: 'Stok',
        roles: ['cashier', 'admin'],
        href: '/requests/receipt',
        steps: [
            { step: 1, title: 'Buka Menu Penerimaan', description: 'Navigasi ke Stok > Penerimaan Barang' },
            { step: 2, title: 'Pilih Pengiriman', description: 'Pilih pengiriman yang akan diterima dari daftar' },
            { step: 3, title: 'Verifikasi Barang', description: 'Periksa kesesuaian jumlah dan kondisi barang' },
            { step: 4, title: 'Foto Bukti Penerimaan', description: 'Ambil foto bukti penerimaan barang' },
            { step: 5, title: 'Konfirmasi Penerimaan', description: 'Klik tombol "Terima" untuk mengkonfirmasi penerimaan' },
            { step: 6, title: 'Stok Otomatis Update', description: 'Stok toko akan otomatis bertambah setelah konfirmasi' },
        ],
    },
    {
        id: 'cash-transfer',
        title: 'Setoran Cash Harian',
        description: 'Prosedur melakukan setoran cash hasil penjualan',
        icon: Wallet,
        category: 'Keuangan',
        roles: ['cashier', 'admin'],
        href: '/cash-transfer',
        steps: [
            { step: 1, title: 'Buka Menu Setoran', description: 'Navigasi ke Keuangan > Setoran Cash' },
            { step: 2, title: 'Lihat Total Penjualan', description: 'Sistem menampilkan total penjualan cash hari ini' },
            { step: 3, title: 'Masukkan Nominal', description: 'Input nominal setoran sesuai total penjualan' },
            { step: 4, title: 'Tambahkan Catatan', description: 'Isi catatan jika diperlukan' },
            { step: 5, title: 'Submit Setoran', description: 'Klik Submit untuk mengirim permintaan setoran' },
            { step: 6, title: 'Tunggu Approval', description: 'Setoran akan diverifikasi oleh Auditor' },
        ],
    },
    {
        id: 'daily-stock-report',
        title: 'Laporan Stok Harian',
        description: 'Prosedur melihat dan mencetak laporan stok harian',
        icon: BarChart3,
        category: 'Laporan',
        roles: ['cashier', 'admin'],
        href: '/reports/daily-stock',
        steps: [
            { step: 1, title: 'Buka Menu Laporan', description: 'Navigasi ke Laporan > Laporan Stok Harian' },
            { step: 2, title: 'Pilih Tanggal', description: 'Pilih tanggal laporan yang ingin dilihat' },
            { step: 3, title: 'Review Laporan', description: 'Periksa data stok awal, penjualan, dan stok akhir' },
            { step: 4, title: 'Cetak/Export', description: 'Cetak atau export laporan jika diperlukan' },
        ],
    },

    // =====================
    // WAREHOUSE PROCEDURES
    // =====================
    {
        id: 'stock-in',
        title: 'Input Stok Masuk',
        description: 'Prosedur memasukkan stok baru ke gudang',
        icon: ArrowDownToLine,
        category: 'Stok',
        roles: ['warehouse', 'admin'],
        href: '/stock-in',
        steps: [
            { step: 1, title: 'Buka Menu Stok Masuk', description: 'Navigasi ke Stok > Stok Masuk' },
            { step: 2, title: 'Pilih Produk', description: 'Scan barcode atau cari produk yang akan di-input' },
            { step: 3, title: 'Masukkan Jumlah', description: 'Input jumlah stok yang masuk' },
            { step: 4, title: 'Pilih Lokasi', description: 'Pilih lokasi penyimpanan (Gudang/Toko)' },
            { step: 5, title: 'Tambahkan Catatan', description: 'Isi catatan/referensi sumber stok' },
            { step: 6, title: 'Submit', description: 'Klik Submit untuk menyimpan data stok masuk' },
        ],
    },
    {
        id: 'process-stock-request',
        title: 'Proses Permintaan Stok',
        description: 'Prosedur memproses permintaan stok dari toko',
        icon: Package,
        category: 'Stok',
        roles: ['warehouse', 'admin'],
        href: '/requests/shipments',
        steps: [
            { step: 1, title: 'Buka Menu Proses Permintaan', description: 'Navigasi ke Stok > Proses Permintaan' },
            { step: 2, title: 'Lihat Permintaan Pending', description: 'Review daftar permintaan yang perlu diproses' },
            { step: 3, title: 'Pilih Permintaan', description: 'Klik pada permintaan untuk melihat detail' },
            { step: 4, title: 'Siapkan Barang', description: 'Siapkan barang sesuai permintaan' },
            { step: 5, title: 'Input Jumlah Kirim', description: 'Input jumlah aktual yang akan dikirim' },
            { step: 6, title: 'Proses Pengiriman', description: 'Klik "Kirim" untuk memproses pengiriman' },
            { step: 7, title: 'Tunggu Verifikasi', description: 'Pengiriman akan diverifikasi oleh Auditor' },
        ],
    },
    {
        id: 'b2b-shipment',
        title: 'Pengiriman B2B',
        description: 'Prosedur mengirim barang untuk order B2B',
        icon: Truck,
        category: 'B2B',
        roles: ['warehouse', 'admin'],
        href: '/surat-jalan/warehouse',
        steps: [
            { step: 1, title: 'Buka Menu Pengiriman B2B', description: 'Navigasi ke B2B / Surat Jalan > Pengiriman B2B' },
            { step: 2, title: 'Pilih Surat Jalan', description: 'Pilih surat jalan yang akan diproses' },
            { step: 3, title: 'Verifikasi Barang', description: 'Periksa ketersediaan stok sesuai pesanan' },
            { step: 4, title: 'Siapkan Pengiriman', description: 'Siapkan barang untuk pengiriman' },
            { step: 5, title: 'Konfirmasi Pengiriman', description: 'Klik "Kirim" untuk konfirmasi pengiriman' },
            { step: 6, title: 'Catat Nomor Resi', description: 'Input nomor resi ekspedisi jika ada' },
        ],
    },
    {
        id: 'po-receipt-warehouse',
        title: 'Penerimaan PO dari Supplier',
        description: 'Prosedur menerima barang dari Purchase Order',
        icon: ArrowDownToLine,
        category: 'Purchase Order',
        roles: ['warehouse', 'cashier', 'admin'],
        href: '/purchase-orders/receipt',
        steps: [
            { step: 1, title: 'Buka Menu Penerimaan PO', description: 'Navigasi ke Purchase Order > Penerimaan PO' },
            { step: 2, title: 'Pilih PO', description: 'Pilih Purchase Order yang akan diterima' },
            { step: 3, title: 'Verifikasi Barang', description: 'Periksa kesesuaian jumlah dan kualitas barang' },
            { step: 4, title: 'Foto Bukti', description: 'Ambil foto bukti penerimaan' },
            { step: 5, title: 'Catat Discrepancy', description: 'Catat jika ada selisih atau kerusakan' },
            { step: 6, title: 'Konfirmasi Penerimaan', description: 'Klik "Terima" untuk konfirmasi penerimaan' },
        ],
    },

    // =====================
    // AUDITOR PROCEDURES
    // =====================
    {
        id: 'stock-opname',
        title: 'Stok Opname',
        description: 'Prosedur melakukan pengecekan stok fisik',
        icon: ClipboardCheck,
        category: 'Stok',
        roles: ['auditor', 'admin'],
        href: '/stock-opname',
        steps: [
            { step: 1, title: 'Buka Menu Stok Opname', description: 'Navigasi ke Stok > Stok Opname' },
            { step: 2, title: 'Pilih Lokasi', description: 'Pilih lokasi yang akan di-opname (Gudang/Toko)' },
            { step: 3, title: 'Pilih Produk', description: 'Pilih produk yang akan dihitung' },
            { step: 4, title: 'Hitung Stok Fisik', description: 'Hitung jumlah stok fisik yang ada' },
            { step: 5, title: 'Input Jumlah Aktual', description: 'Masukkan jumlah stok hasil perhitungan' },
            { step: 6, title: 'Review Selisih', description: 'Sistem menampilkan selisih antara sistem dan aktual' },
            { step: 7, title: 'Tambahkan Catatan', description: 'Isi catatan penjelasan jika ada selisih' },
            { step: 8, title: 'Submit Opname', description: 'Submit untuk proses penyesuaian stok' },
        ],
    },
    {
        id: 'po-approval',
        title: 'Approval Purchase Order',
        description: 'Prosedur menyetujui atau menolak Purchase Order',
        icon: FileCheck,
        category: 'Purchase Order',
        roles: ['auditor', 'admin'],
        href: '/purchase-orders/approval',
        steps: [
            { step: 1, title: 'Buka Menu Approval PO', description: 'Navigasi ke Purchase Order > Approval PO' },
            { step: 2, title: 'Review PO Pending', description: 'Lihat daftar PO yang menunggu approval' },
            { step: 3, title: 'Pilih PO', description: 'Klik pada PO untuk melihat detail' },
            { step: 4, title: 'Verifikasi Data', description: 'Periksa supplier, produk, jumlah, dan harga' },
            { step: 5, title: 'Approve/Reject', description: 'Klik Approve untuk menyetujui atau Reject untuk menolak' },
            { step: 6, title: 'Isi Alasan (jika reject)', description: 'Jika menolak, isi alasan penolakan' },
        ],
    },
    {
        id: 'b2b-verification',
        title: 'Verifikasi Pengiriman B2B',
        description: 'Prosedur memverifikasi pengiriman B2B',
        icon: FileCheck,
        category: 'B2B',
        roles: ['auditor', 'admin'],
        href: '/surat-jalan/auditor',
        steps: [
            { step: 1, title: 'Buka Menu Verifikasi B2B', description: 'Navigasi ke B2B / Surat Jalan > Verifikasi B2B' },
            { step: 2, title: 'Pilih Pengiriman', description: 'Pilih pengiriman yang akan diverifikasi' },
            { step: 3, title: 'Review Data Pengiriman', description: 'Periksa kelengkapan data dan bukti pengiriman' },
            { step: 4, title: 'Verifikasi/Tolak', description: 'Klik Verifikasi atau Tolak sesuai hasil review' },
        ],
    },
    {
        id: 'approval-menu',
        title: 'Persetujuan Umum',
        description: 'Prosedur menyetujui berbagai permintaan yang menunggu approval',
        icon: ClipboardCheck,
        category: 'Approval',
        roles: ['auditor', 'admin'],
        href: '/approval',
        steps: [
            { step: 1, title: 'Buka Menu Persetujuan', description: 'Navigasi ke menu Persetujuan' },
            { step: 2, title: 'Filter Jenis Approval', description: 'Filter berdasarkan jenis permintaan' },
            { step: 3, title: 'Review Permintaan', description: 'Klik pada permintaan untuk melihat detail' },
            { step: 4, title: 'Approve/Reject', description: 'Ambil keputusan approve atau reject' },
        ],
    },

    // =====================
    // MAIN OFFICE PROCEDURES
    // =====================
    {
        id: 'manage-supplier',
        title: 'Manajemen Supplier',
        description: 'Prosedur mengelola data supplier',
        icon: Building2,
        category: 'Master Data',
        roles: ['main_office', 'admin'],
        href: '/suppliers',
        steps: [
            { step: 1, title: 'Buka Menu Supplier', description: 'Navigasi ke Purchase Order > Supplier' },
            { step: 2, title: 'Tambah Supplier Baru', description: 'Klik tombol "Tambah Supplier"' },
            { step: 3, title: 'Isi Data Supplier', description: 'Input nama, alamat, telepon, email, dan kontak person' },
            { step: 4, title: 'Simpan', description: 'Klik Simpan untuk menyimpan data supplier' },
        ],
    },
    {
        id: 'create-po',
        title: 'Buat Purchase Order',
        description: 'Prosedur membuat Purchase Order ke supplier',
        icon: FileText,
        category: 'Purchase Order',
        roles: ['main_office', 'admin'],
        href: '/purchase-orders',
        steps: [
            { step: 1, title: 'Buka Menu Buat PO', description: 'Navigasi ke Purchase Order > Buat PO' },
            { step: 2, title: 'Pilih Supplier', description: 'Pilih supplier dari dropdown' },
            { step: 3, title: 'Pilih Tujuan', description: 'Pilih tujuan PO (Gudang/Toko)' },
            { step: 4, title: 'Tambah Produk', description: 'Cari dan tambahkan produk ke PO' },
            { step: 5, title: 'Input Jumlah & Harga', description: 'Masukkan jumlah dan harga per unit' },
            { step: 6, title: 'Review Total', description: 'Periksa total nilai PO' },
            { step: 7, title: 'Submit PO', description: 'Submit PO untuk proses approval' },
        ],
    },
    {
        id: 'create-surat-jalan',
        title: 'Buat Surat Jalan B2B',
        description: 'Prosedur membuat surat jalan untuk pengiriman B2B',
        icon: FileText,
        category: 'B2B',
        roles: ['main_office', 'admin'],
        href: '/surat-jalan',
        steps: [
            { step: 1, title: 'Buka Menu Surat Jalan', description: 'Navigasi ke B2B / Surat Jalan > Surat Jalan' },
            { step: 2, title: 'Klik Buat Baru', description: 'Klik tombol "Buat Surat Jalan"' },
            { step: 3, title: 'Pilih Pelanggan', description: 'Pilih pelanggan B2B dari dropdown' },
            { step: 4, title: 'Tambah Produk', description: 'Tambahkan produk yang akan dikirim' },
            { step: 5, title: 'Input Jumlah', description: 'Masukkan jumlah untuk setiap produk' },
            { step: 6, title: 'Isi Alamat Pengiriman', description: 'Lengkapi data alamat pengiriman' },
            { step: 7, title: 'Submit', description: 'Submit surat jalan untuk diproses gudang' },
        ],
    },
    {
        id: 'manage-customer',
        title: 'Manajemen Pelanggan B2B',
        description: 'Prosedur mengelola data pelanggan B2B',
        icon: Users,
        category: 'Master Data',
        roles: ['main_office', 'admin'],
        href: '/customers',
        steps: [
            { step: 1, title: 'Buka Menu Pelanggan', description: 'Navigasi ke B2B / Surat Jalan > Pelanggan' },
            { step: 2, title: 'Tambah Pelanggan', description: 'Klik tombol "Tambah Pelanggan"' },
            { step: 3, title: 'Isi Data Pelanggan', description: 'Input nama, alamat, telepon, dan email' },
            { step: 4, title: 'Simpan', description: 'Klik Simpan untuk menyimpan data' },
        ],
    },
    {
        id: 'create-invoice',
        title: 'Buat Invoice',
        description: 'Prosedur membuat invoice untuk pelanggan B2B',
        icon: Receipt,
        category: 'Keuangan',
        roles: ['main_office', 'admin'],
        href: '/invoices',
        steps: [
            { step: 1, title: 'Buka Menu Invoice', description: 'Navigasi ke B2B / Surat Jalan > Invoice' },
            { step: 2, title: 'Pilih Surat Jalan', description: 'Pilih surat jalan yang akan dibuatkan invoice' },
            { step: 3, title: 'Klik Buat Invoice', description: 'Klik tombol "Buat Invoice"' },
            { step: 4, title: 'Review Data Invoice', description: 'Periksa data pelanggan dan item' },
            { step: 5, title: 'Set Due Date', description: 'Tentukan tanggal jatuh tempo pembayaran' },
            { step: 6, title: 'Generate Invoice', description: 'Klik Generate untuk membuat invoice' },
            { step: 7, title: 'Cetak/Kirim', description: 'Cetak atau kirim invoice ke pelanggan' },
        ],
    },
    {
        id: 'stock-approval',
        title: 'Approval Permintaan Stok',
        description: 'Prosedur menyetujui permintaan stok dari toko',
        icon: ClipboardCheck,
        category: 'Stok',
        roles: ['main_office', 'admin'],
        href: '/requests/approval',
        steps: [
            { step: 1, title: 'Buka Menu Persetujuan Stok', description: 'Navigasi ke Stok > Persetujuan Stok' },
            { step: 2, title: 'Review Permintaan', description: 'Lihat daftar permintaan yang menunggu approval' },
            { step: 3, title: 'Pilih Permintaan', description: 'Klik pada permintaan untuk detail' },
            { step: 4, title: 'Verifikasi Kebutuhan', description: 'Periksa alasan dan jumlah yang diminta' },
            { step: 5, title: 'Approve/Reject', description: 'Setujui atau tolak permintaan' },
        ],
    },
    {
        id: 'cash-history',
        title: 'Riwayat Setoran Cash',
        description: 'Prosedur melihat dan memverifikasi riwayat setoran',
        icon: Receipt,
        category: 'Keuangan',
        roles: ['main_office', 'admin'],
        href: '/cash-history',
        steps: [
            { step: 1, title: 'Buka Menu Riwayat Setoran', description: 'Navigasi ke Keuangan > Riwayat Setoran' },
            { step: 2, title: 'Filter Tanggal', description: 'Pilih range tanggal yang ingin dilihat' },
            { step: 3, title: 'Review Setoran', description: 'Periksa data setoran dari kasir' },
            { step: 4, title: 'Export Data', description: 'Export data untuk rekonsiliasi jika diperlukan' },
        ],
    },
    {
        id: 'general-transactions',
        title: 'Transaksi Umum',
        description: 'Prosedur mencatat transaksi keuangan umum',
        icon: Wallet,
        category: 'Keuangan',
        roles: ['main_office', 'admin'],
        href: '/finance/transactions',
        steps: [
            { step: 1, title: 'Buka Menu Transaksi Umum', description: 'Navigasi ke Keuangan > Transaksi Umum' },
            { step: 2, title: 'Klik Tambah Transaksi', description: 'Klik tombol "Tambah Transaksi"' },
            { step: 3, title: 'Pilih Tipe', description: 'Pilih tipe transaksi (Pemasukan/Pengeluaran)' },
            { step: 4, title: 'Pilih Kategori', description: 'Pilih kategori transaksi' },
            { step: 5, title: 'Input Nominal', description: 'Masukkan nominal transaksi' },
            { step: 6, title: 'Isi Deskripsi', description: 'Tambahkan deskripsi transaksi' },
            { step: 7, title: 'Upload Bukti', description: 'Upload foto bukti transaksi (opsional)' },
            { step: 8, title: 'Simpan', description: 'Klik Simpan untuk menyimpan transaksi' },
        ],
    },

    // =====================
    // ADMIN PROCEDURES
    // =====================
    {
        id: 'manage-users',
        title: 'Manajemen Pengguna',
        description: 'Prosedur mengelola akun pengguna sistem',
        icon: Users,
        category: 'Sistem',
        roles: ['admin'],
        href: '/users',
        steps: [
            { step: 1, title: 'Buka Menu Pengguna', description: 'Navigasi ke menu Pengguna' },
            { step: 2, title: 'Tambah Pengguna Baru', description: 'Klik tombol "Tambah Pengguna"' },
            { step: 3, title: 'Isi Data Pengguna', description: 'Input nama, email, dan password' },
            { step: 4, title: 'Pilih Role', description: 'Pilih role pengguna (Admin/Auditor/Kasir/Gudang/Kantor Pusat)' },
            { step: 5, title: 'Simpan', description: 'Klik Simpan untuk membuat akun' },
        ],
    },
    {
        id: 'system-settings',
        title: 'Pengaturan Sistem',
        description: 'Prosedur mengatur konfigurasi sistem',
        icon: Settings,
        category: 'Sistem',
        roles: ['admin'],
        href: '/settings',
        steps: [
            { step: 1, title: 'Buka Menu Pengaturan', description: 'Navigasi ke menu Pengaturan' },
            { step: 2, title: 'Pilih Kategori', description: 'Pilih kategori pengaturan yang ingin diubah' },
            { step: 3, title: 'Edit Konfigurasi', description: 'Ubah nilai konfigurasi sesuai kebutuhan' },
            { step: 4, title: 'Simpan Perubahan', description: 'Klik Simpan untuk menyimpan perubahan' },
        ],
    },
    {
        id: 'manage-products',
        title: 'Manajemen Produk',
        description: 'Prosedur mengelola data master produk',
        icon: Boxes,
        category: 'Master Data',
        roles: ['warehouse', 'cashier', 'auditor', 'admin', 'main_office'],
        href: '/products',
        steps: [
            { step: 1, title: 'Buka Menu Produk', description: 'Navigasi ke menu Produk' },
            { step: 2, title: 'Tambah Produk (Admin)', description: 'Klik tombol "Tambah Produk" jika memiliki akses' },
            { step: 3, title: 'Isi Data Produk', description: 'Input nama, barcode, harga, dan upload gambar' },
            { step: 4, title: 'Simpan', description: 'Klik Simpan untuk menyimpan produk' },
            { step: 5, title: 'Edit/Hapus', description: 'Gunakan tombol edit/hapus untuk mengelola produk existing' },
        ],
    },
];

// Helper function to get procedures by role
export function getProceduresByRole(role: UserRole): GuideProcedure[] {
    return guideData.filter(procedure => procedure.roles.includes(role));
}

// Helper function to get categories for a role
export function getCategoriesByRole(role: UserRole): string[] {
    const procedures = getProceduresByRole(role);
    const categories = new Set(procedures.map(p => p.category));
    return Array.from(categories);
}

// Helper function to search procedures
export function searchProcedures(query: string, role: UserRole): GuideProcedure[] {
    const lowerQuery = query.toLowerCase();
    return getProceduresByRole(role).filter(
        procedure =>
            procedure.title.toLowerCase().includes(lowerQuery) ||
            procedure.description.toLowerCase().includes(lowerQuery) ||
            procedure.category.toLowerCase().includes(lowerQuery) ||
            procedure.steps.some(step =>
                step.title.toLowerCase().includes(lowerQuery) ||
                step.description.toLowerCase().includes(lowerQuery)
            )
    );
}

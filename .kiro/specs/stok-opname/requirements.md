# Requirements Document: Stok Opname

## Introduction

Fitur Stok Opname memungkinkan role Gudang dan Kasir untuk melakukan penghitungan fisik stok produk dan memperbaiki ketidaksesuaian antara stok sistem dengan stok fisik. Proses ini memerlukan persetujuan dari role Office sebelum perubahan stok diterapkan ke sistem. Fitur ini mendukung multi-unit untuk memastikan fleksibilitas dalam pencatatan stok.

## Glossary

- **Stok_Opname_System**: Sistem yang mengelola proses penghitungan fisik stok dan penyesuaian stok
- **Gudang**: Role pengguna yang bertanggung jawab mengelola stok di lokasi gudang
- **Kasir**: Role pengguna yang bertanggung jawab mengelola stok di lokasi toko
- **Office**: Role pengguna (main_office) yang memiliki wewenang untuk menyetujui atau menolak penyesuaian stok
- **Stok_Sistem**: Jumlah stok produk yang tercatat dalam sistem
- **Stok_Fisik**: Jumlah stok produk yang ditemukan saat penghitungan fisik
- **Selisih_Stok**: Perbedaan antara stok sistem dan stok fisik (stok fisik - stok sistem)
- **Pengajuan_Adjust**: Permintaan penyesuaian stok yang diajukan oleh Gudang atau Kasir setelah selesai melakukan stok opname
- **Multi_Unit**: Kemampuan sistem untuk mencatat stok dalam berbagai satuan unit (contoh: sak dan kg, box dan pcs)
- **Session_Opname**: Sesi penghitungan stok opname yang berisi kumpulan produk yang akan diopname

## Requirements

### Requirement 1: Membuat Session Stok Opname

**User Story:** Sebagai Gudang atau Kasir, saya ingin membuat session stok opname baru, sehingga saya dapat mulai menghitung stok fisik produk-produk.

#### Acceptance Criteria

1. WHEN Gudang atau Kasir memilih "Buat Stok Opname Baru", THE Stok_Opname_System SHALL membuat Session_Opname baru dengan status "draft"
2. THE Stok_Opname_System SHALL mencatat user yang membuat session, lokasi stok (gudang atau toko), dan timestamp pembuatan
3. THE Stok_Opname_System SHALL menampilkan form untuk menambahkan produk ke dalam session opname
4. THE Stok_Opname_System SHALL menyimpan session opname tanpa mengubah stok sistem

### Requirement 2: Menambahkan Produk ke Session Opname

**User Story:** Sebagai Gudang atau Kasir, saya ingin menambahkan produk ke dalam session stok opname, sehingga saya dapat mencatat stok fisik produk tersebut.

#### Acceptance Criteria

1. WHEN Gudang atau Kasir memilih produk untuk ditambahkan, THE Stok_Opname_System SHALL menampilkan informasi produk termasuk nama, barcode, dan stok sistem saat ini
2. THE Stok_Opname_System SHALL menampilkan stok sistem dalam unit yang sesuai dengan konfigurasi produk
3. WHERE produk memiliki Multi_Unit, THE Stok_Opname_System SHALL menampilkan pilihan unit untuk pencatatan stok fisik (unit besar dan unit kecil)
4. THE Stok_Opname_System SHALL memungkinkan Gudang atau Kasir untuk mencatat stok fisik dalam unit yang dipilih
5. THE Stok_Opname_System SHALL menghitung Selisih_Stok secara otomatis berdasarkan stok sistem dan stok fisik yang dicatat
6. THE Stok_Opname_System SHALL memungkinkan Gudang atau Kasir untuk menambahkan catatan optional untuk setiap produk

### Requirement 3: Mencatat Stok Fisik Multi-Unit

**User Story:** Sebagai Gudang atau Kasir, saya ingin mencatat stok fisik dalam berbagai unit, sehingga pencatatan lebih akurat dan fleksibel.

#### Acceptance Criteria

1. WHERE produk memiliki Multi_Unit dengan main_unit dan sell_unit, THE Stok_Opname_System SHALL memungkinkan pencatatan stok fisik dalam main_unit, sell_unit, atau kombinasi keduanya
2. WHEN Gudang atau Kasir mencatat stok fisik dalam main_unit, THE Stok_Opname_System SHALL mengkonversi nilai tersebut ke sell_unit menggunakan pcs_per_box untuk perhitungan selisih
3. WHEN Gudang atau Kasir mencatat stok fisik dalam kombinasi unit (contoh: 3 sak 50 kg), THE Stok_Opname_System SHALL menghitung total dalam sell_unit untuk perhitungan selisih
4. THE Stok_Opname_System SHALL menampilkan Selisih_Stok dalam unit yang sama dengan unit pencatatan stok fisik
5. THE Stok_Opname_System SHALL menyimpan informasi unit yang digunakan untuk pencatatan stok fisik

### Requirement 4: Mengelola Produk dalam Session Opname

**User Story:** Sebagai Gudang atau Kasir, saya ingin mengedit atau menghapus produk dari session opname, sehingga saya dapat memperbaiki kesalahan pencatatan sebelum mengajukan adjust.

#### Acceptance Criteria

1. WHILE Session_Opname berstatus "draft", THE Stok_Opname_System SHALL memungkinkan Gudang atau Kasir untuk mengedit stok fisik yang telah dicatat
2. WHILE Session_Opname berstatus "draft", THE Stok_Opname_System SHALL memungkinkan Gudang atau Kasir untuk menghapus produk dari session
3. WHEN Gudang atau Kasir mengedit stok fisik, THE Stok_Opname_System SHALL menghitung ulang Selisih_Stok secara otomatis
4. THE Stok_Opname_System SHALL menampilkan daftar semua produk dalam session dengan informasi stok sistem, stok fisik, dan selisih

### Requirement 5: Mengajukan Adjust Stok

**User Story:** Sebagai Gudang atau Kasir, saya ingin mengajukan adjust stok setelah selesai menghitung semua produk, sehingga Office dapat meninjau dan menyetujui perubahan stok.

#### Acceptance Criteria

1. WHILE Session_Opname berstatus "draft" dan berisi minimal satu produk, THE Stok_Opname_System SHALL menampilkan tombol "Ajukan Adjust Stok"
2. WHEN Gudang atau Kasir memilih "Ajukan Adjust Stok", THE Stok_Opname_System SHALL mengubah status Session_Opname menjadi "pending_approval"
3. WHEN status Session_Opname berubah menjadi "pending_approval", THE Stok_Opname_System SHALL mencatat timestamp pengajuan
4. WHEN status Session_Opname berubah menjadi "pending_approval", THE Stok_Opname_System SHALL membuat notifikasi untuk role Office
5. WHILE Session_Opname berstatus "pending_approval", THE Stok_Opname_System SHALL mencegah Gudang atau Kasir untuk mengedit atau menghapus produk dalam session
6. THE Stok_Opname_System SHALL menyimpan snapshot stok sistem pada saat pengajuan untuk referensi Office

### Requirement 6: Menampilkan Daftar Pengajuan Adjust untuk Office

**User Story:** Sebagai Office, saya ingin melihat daftar pengajuan adjust stok yang menunggu persetujuan, sehingga saya dapat meninjau dan memproses pengajuan tersebut.

#### Acceptance Criteria

1. THE Stok_Opname_System SHALL menampilkan daftar semua Session_Opname dengan status "pending_approval" untuk role Office
2. THE Stok_Opname_System SHALL menampilkan informasi session termasuk nomor session, user yang mengajukan, lokasi, tanggal pengajuan, dan jumlah produk
3. WHEN Office memilih session dari daftar, THE Stok_Opname_System SHALL menampilkan detail lengkap session termasuk semua produk dengan stok sistem, stok fisik, selisih, dan catatan
4. THE Stok_Opname_System SHALL menampilkan total jumlah produk yang akan disesuaikan dalam session
5. THE Stok_Opname_System SHALL mengurutkan daftar pengajuan berdasarkan tanggal pengajuan (terbaru di atas)

### Requirement 7: Menyetujui Adjust Stok Per Produk

**User Story:** Sebagai Office, saya ingin menyetujui adjust stok untuk produk tertentu dalam session, sehingga saya dapat memproses penyesuaian secara selektif.

#### Acceptance Criteria

1. WHILE Session_Opname berstatus "pending_approval", THE Stok_Opname_System SHALL menampilkan tombol "Approve" untuk setiap produk dalam session
2. WHEN Office memilih "Approve" untuk satu produk, THE Stok_Opname_System SHALL menerapkan penyesuaian stok untuk produk tersebut di lokasi yang sesuai
3. WHEN penyesuaian stok diterapkan, THE Stok_Opname_System SHALL mengubah stok produk di database sesuai dengan stok fisik yang dicatat
4. WHEN penyesuaian stok diterapkan, THE Stok_Opname_System SHALL mencatat log perubahan stok dengan type "adjustment" di tabel stock_logs
5. WHEN penyesuaian stok diterapkan, THE Stok_Opname_System SHALL mencatat user Office yang menyetujui dan timestamp persetujuan
6. WHEN penyesuaian stok diterapkan, THE Stok_Opname_System SHALL mengubah status produk dalam session menjadi "approved"
7. THE Stok_Opname_System SHALL menampilkan konfirmasi sebelum menerapkan penyesuaian stok

### Requirement 8: Menyetujui Semua Adjust Stok dalam Session

**User Story:** Sebagai Office, saya ingin menyetujui semua adjust stok dalam session sekaligus, sehingga proses persetujuan lebih efisien untuk session dengan banyak produk.

#### Acceptance Criteria

1. WHILE Session_Opname berstatus "pending_approval", THE Stok_Opname_System SHALL menampilkan tombol "Approve Semua"
2. WHEN Office memilih "Approve Semua", THE Stok_Opname_System SHALL menampilkan konfirmasi dengan ringkasan total produk yang akan disesuaikan
3. WHEN Office mengkonfirmasi "Approve Semua", THE Stok_Opname_System SHALL menerapkan penyesuaian stok untuk semua produk dalam session secara berurutan
4. WHEN penyesuaian stok diterapkan untuk semua produk, THE Stok_Opname_System SHALL mengubah stok setiap produk di database sesuai dengan stok fisik yang dicatat
5. WHEN penyesuaian stok diterapkan untuk semua produk, THE Stok_Opname_System SHALL mencatat log perubahan stok untuk setiap produk dengan type "adjustment"
6. WHEN penyesuaian stok diterapkan untuk semua produk, THE Stok_Opname_System SHALL mencatat user Office yang menyetujui dan timestamp persetujuan untuk setiap produk
7. WHEN semua produk dalam session telah disetujui, THE Stok_Opname_System SHALL mengubah status Session_Opname menjadi "completed"
8. IF terjadi error saat memproses salah satu produk, THEN THE Stok_Opname_System SHALL menghentikan proses dan menampilkan pesan error dengan detail produk yang gagal

### Requirement 9: Menolak Adjust Stok

**User Story:** Sebagai Office, saya ingin menolak pengajuan adjust stok, sehingga penyesuaian yang tidak valid tidak diterapkan ke sistem.

#### Acceptance Criteria

1. WHILE Session_Opname berstatus "pending_approval", THE Stok_Opname_System SHALL menampilkan tombol "Reject" untuk session
2. WHEN Office memilih "Reject", THE Stok_Opname_System SHALL menampilkan form untuk memasukkan alasan penolakan
3. WHEN Office mengkonfirmasi penolakan dengan alasan, THE Stok_Opname_System SHALL mengubah status Session_Opname menjadi "rejected"
4. WHEN Session_Opname ditolak, THE Stok_Opname_System SHALL menyimpan alasan penolakan dan timestamp penolakan
5. WHEN Session_Opname ditolak, THE Stok_Opname_System SHALL membuat notifikasi untuk user yang mengajukan dengan alasan penolakan
6. WHEN Session_Opname ditolak, THE Stok_Opname_System SHALL mencegah perubahan stok sistem
7. THE Stok_Opname_System SHALL memungkinkan Gudang atau Kasir untuk melihat alasan penolakan pada session yang ditolak

### Requirement 10: Mencatat Log Aktivitas Stok Opname

**User Story:** Sebagai sistem, saya ingin mencatat semua aktivitas terkait stok opname, sehingga ada audit trail yang lengkap untuk setiap perubahan stok.

#### Acceptance Criteria

1. WHEN Session_Opname dibuat, THE Stok_Opname_System SHALL mencatat aktivitas di tabel activity_logs dengan action "create_stock_opname"
2. WHEN Session_Opname diajukan untuk approval, THE Stok_Opname_System SHALL mencatat aktivitas di tabel activity_logs dengan action "submit_stock_opname"
3. WHEN produk dalam session disetujui, THE Stok_Opname_System SHALL mencatat aktivitas di tabel activity_logs dengan action "approve_stock_adjustment"
4. WHEN Session_Opname ditolak, THE Stok_Opname_System SHALL mencatat aktivitas di tabel activity_logs dengan action "reject_stock_opname"
5. THE Stok_Opname_System SHALL menyimpan informasi user, role, entity_type, entity_id, dan description untuk setiap log aktivitas

### Requirement 11: Menampilkan Riwayat Stok Opname

**User Story:** Sebagai Gudang, Kasir, atau Office, saya ingin melihat riwayat stok opname yang telah dilakukan, sehingga saya dapat melacak perubahan stok historis.

#### Acceptance Criteria

1. THE Stok_Opname_System SHALL menampilkan daftar semua Session_Opname dengan filter berdasarkan status (draft, pending_approval, approved, rejected, completed)
2. THE Stok_Opname_System SHALL menampilkan daftar semua Session_Opname dengan filter berdasarkan lokasi (gudang atau toko)
3. THE Stok_Opname_System SHALL menampilkan daftar semua Session_Opname dengan filter berdasarkan rentang tanggal
4. WHEN user memilih session dari riwayat, THE Stok_Opname_System SHALL menampilkan detail lengkap session termasuk semua produk dan status persetujuan
5. WHERE Session_Opname berstatus "rejected", THE Stok_Opname_System SHALL menampilkan alasan penolakan
6. WHERE Session_Opname berstatus "completed", THE Stok_Opname_System SHALL menampilkan informasi Office yang menyetujui dan timestamp persetujuan

### Requirement 12: Validasi Data Stok Opname

**User Story:** Sebagai sistem, saya ingin memvalidasi data stok opname, sehingga data yang tersimpan konsisten dan akurat.

#### Acceptance Criteria

1. WHEN Gudang atau Kasir mencatat stok fisik, THE Stok_Opname_System SHALL memvalidasi bahwa nilai stok fisik adalah angka non-negatif
2. WHEN Gudang atau Kasir mengajukan adjust stok, THE Stok_Opname_System SHALL memvalidasi bahwa session berisi minimal satu produk
3. WHEN Office menyetujui adjust stok, THE Stok_Opname_System SHALL memvalidasi bahwa produk masih ada dalam database
4. WHERE produk memiliki Multi_Unit, THE Stok_Opname_System SHALL memvalidasi bahwa konversi unit menggunakan pcs_per_box yang valid
5. IF validasi gagal, THEN THE Stok_Opname_System SHALL menampilkan pesan error yang deskriptif dan mencegah operasi dilanjutkan

### Requirement 13: Menghitung Selisih Stok dengan Akurat

**User Story:** Sebagai sistem, saya ingin menghitung selisih stok dengan akurat, sehingga penyesuaian stok yang diterapkan benar.

#### Acceptance Criteria

1. THE Stok_Opname_System SHALL menghitung Selisih_Stok dengan formula: stok_fisik - stok_sistem (dalam unit yang sama)
2. WHERE produk memiliki Multi_Unit dan stok fisik dicatat dalam main_unit, THE Stok_Opname_System SHALL mengkonversi stok fisik ke sell_unit sebelum menghitung selisih
3. WHERE produk memiliki Multi_Unit dan stok fisik dicatat dalam kombinasi unit, THE Stok_Opname_System SHALL menjumlahkan total dalam sell_unit sebelum menghitung selisih
4. THE Stok_Opname_System SHALL menampilkan selisih dengan tanda positif untuk kelebihan stok dan negatif untuk kekurangan stok
5. THE Stok_Opname_System SHALL membulatkan hasil perhitungan ke 2 desimal untuk unit yang mendukung desimal

### Requirement 14: Integrasi dengan Stock Logs

**User Story:** Sebagai sistem, saya ingin mencatat penyesuaian stok di stock_logs, sehingga ada jejak audit yang lengkap untuk setiap perubahan stok.

#### Acceptance Criteria

1. WHEN penyesuaian stok diterapkan, THE Stok_Opname_System SHALL membuat entry baru di tabel stock_logs dengan type "adjustment"
2. THE Stok_Opname_System SHALL menyimpan product_id, quantity (selisih), location, user_id (Office yang approve), dan timestamp di stock_logs
3. THE Stok_Opname_System SHALL menyimpan stock_before dan stock_after di stock_logs untuk referensi
4. THE Stok_Opname_System SHALL menyimpan reference_type "stock_opname" dan reference_id (session_id) di stock_logs
5. THE Stok_Opname_System SHALL menyimpan catatan dari session opname di field note di stock_logs

### Requirement 15: Notifikasi untuk Office

**User Story:** Sebagai Office, saya ingin menerima notifikasi ketika ada pengajuan adjust stok baru, sehingga saya dapat segera meninjau dan memproses pengajuan.

#### Acceptance Criteria

1. WHEN Gudang atau Kasir mengajukan adjust stok, THE Stok_Opname_System SHALL membuat notifikasi untuk semua user dengan role "main_office"
2. THE Stok_Opname_System SHALL menyimpan informasi session, user yang mengajukan, lokasi, dan jumlah produk dalam notifikasi
3. THE Stok_Opname_System SHALL menyertakan link ke halaman detail session dalam notifikasi
4. THE Stok_Opname_System SHALL menampilkan notifikasi dengan type "info" dan status "unread"

### Requirement 16: Notifikasi untuk Pengaju

**User Story:** Sebagai Gudang atau Kasir, saya ingin menerima notifikasi ketika pengajuan adjust stok saya disetujui atau ditolak, sehingga saya mengetahui status pengajuan.

#### Acceptance Criteria

1. WHEN Office menyetujui semua produk dalam session, THE Stok_Opname_System SHALL membuat notifikasi untuk user yang mengajukan dengan type "success"
2. WHEN Office menolak session, THE Stok_Opname_System SHALL membuat notifikasi untuk user yang mengajukan dengan type "warning"
3. WHERE session ditolak, THE Stok_Opname_System SHALL menyertakan alasan penolakan dalam notifikasi
4. THE Stok_Opname_System SHALL menyertakan link ke halaman detail session dalam notifikasi

### Requirement 17: Pembatasan Akses Berdasarkan Role

**User Story:** Sebagai sistem, saya ingin membatasi akses fitur stok opname berdasarkan role, sehingga hanya user yang berwenang yang dapat melakukan operasi tertentu.

#### Acceptance Criteria

1. THE Stok_Opname_System SHALL memungkinkan role "warehouse" dan "cashier" untuk membuat, mengedit, dan mengajukan session stok opname
2. THE Stok_Opname_System SHALL memungkinkan role "main_office" untuk melihat, menyetujui, dan menolak pengajuan adjust stok
3. THE Stok_Opname_System SHALL mencegah role "warehouse" dan "cashier" untuk menyetujui atau menolak pengajuan adjust stok
4. THE Stok_Opname_System SHALL mencegah role "main_office" untuk membuat atau mengedit session stok opname
5. THE Stok_Opname_System SHALL memungkinkan semua role untuk melihat riwayat stok opname sesuai dengan lokasi akses mereka

### Requirement 18: Penanganan Concurrent Access

**User Story:** Sebagai sistem, saya ingin menangani akses concurrent dengan benar, sehingga tidak terjadi konflik data ketika multiple user mengakses session yang sama.

#### Acceptance Criteria

1. WHEN Office sedang meninjau session, THE Stok_Opname_System SHALL mencegah Gudang atau Kasir untuk mengedit session tersebut
2. WHEN Office menyetujui produk dalam session, THE Stok_Opname_System SHALL menggunakan locking mechanism untuk mencegah race condition
3. IF session telah diubah oleh user lain sejak halaman dimuat, THEN THE Stok_Opname_System SHALL menampilkan pesan error dan meminta user untuk refresh halaman
4. THE Stok_Opname_System SHALL menggunakan optimistic locking atau timestamp untuk mendeteksi konflik concurrent update

### Requirement 19: Export Data Stok Opname

**User Story:** Sebagai Office, saya ingin export data stok opname ke format Excel atau CSV, sehingga saya dapat melakukan analisis lebih lanjut atau membuat laporan.

#### Acceptance Criteria

1. THE Stok_Opname_System SHALL menyediakan tombol "Export" pada halaman riwayat stok opname
2. WHEN Office memilih "Export", THE Stok_Opname_System SHALL menghasilkan file Excel atau CSV yang berisi data session yang dipilih
3. THE Stok_Opname_System SHALL menyertakan kolom: nomor session, tanggal, user, lokasi, nama produk, barcode, stok sistem, stok fisik, selisih, status, dan catatan
4. THE Stok_Opname_System SHALL memformat file dengan header yang jelas dan data yang terstruktur
5. THE Stok_Opname_System SHALL memberikan nama file dengan format: "stok-opname-{tanggal}-{lokasi}.xlsx"

### Requirement 20: Menampilkan Ringkasan Session Opname

**User Story:** Sebagai Gudang, Kasir, atau Office, saya ingin melihat ringkasan session opname, sehingga saya dapat dengan cepat memahami dampak penyesuaian stok.

#### Acceptance Criteria

1. THE Stok_Opname_System SHALL menampilkan total jumlah produk dalam session
2. THE Stok_Opname_System SHALL menampilkan jumlah produk dengan selisih positif (kelebihan stok)
3. THE Stok_Opname_System SHALL menampilkan jumlah produk dengan selisih negatif (kekurangan stok)
4. THE Stok_Opname_System SHALL menampilkan jumlah produk dengan selisih nol (stok sesuai)
5. THE Stok_Opname_System SHALL menampilkan total nilai selisih dalam rupiah (berdasarkan harga produk)
6. THE Stok_Opname_System SHALL menampilkan ringkasan ini di halaman detail session dan halaman approval

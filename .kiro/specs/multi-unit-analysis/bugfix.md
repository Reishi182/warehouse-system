# Bugfix Requirements Document

## Introduction

Sistem multi-unit memungkinkan produk dijual dalam dua satuan berbeda (misalnya SAK/KG, BOX/PCS, ROLL/METER). Terdapat beberapa bug pada form tambah/edit produk, keranjang POS, dan tampilan halaman produk yang menyebabkan data multi-unit tidak tersimpan dengan benar ke database, operasi keranjang yang tidak akurat saat produk yang sama ditambahkan dalam dua satuan berbeda, serta label unit yang hardcode sehingga tidak mencerminkan satuan yang sebenarnya dipilih user.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN pengguna mengaktifkan multi-unit pada form edit produk dan mengubah nilai `pcs_per_box` THEN sistem tidak merecalculate nilai `stockGudang` dan `stockToko` yang sudah diisi sebelumnya, sehingga stok yang tersimpan ke database tidak sesuai dengan nilai yang ditampilkan di UI

1.2 WHEN pengguna membuka form edit produk untuk produk yang sudah memiliki multi-unit aktif THEN sistem menampilkan breakdown stok (mainStock + subStock) berdasarkan `pcs_per_box` lama, namun jika `pcs_per_box` diubah di form, breakdown tidak diperbarui secara reaktif sehingga total stok yang dikirim ke database bisa salah

1.3 WHEN pengguna menambahkan produk multi-unit ke keranjang POS dalam dua satuan berbeda (misalnya 1 SAK dan 3 KG dari produk yang sama) THEN sistem menggunakan `product.id` saja sebagai key untuk `updateQuantity` dan `removeItem`, sehingga operasi tersebut dapat mengenai item yang salah (misalnya mengubah kuantitas SAK padahal yang dimaksud KG)

1.4 WHEN pengguna mengisi stok multi-unit di form tambah/edit produk sebelum mengisi nilai `pcs_per_box` THEN sistem menggunakan fallback `pcsPerBox || 1` dalam kalkulasi, sehingga stok yang tersimpan ke database adalah nilai mentah tanpa konversi yang benar

1.5 WHEN halaman produk (product list atau product detail) menampilkan badge unit untuk produk multi-unit THEN sistem menampilkan label hardcode "BOX/PCS" sebagai fallback (`main_unit || 'box'` dan `sell_unit || 'pcs'`), sehingga produk dengan satuan SAK/KG, ROLL/METER, atau satuan lainnya tetap menampilkan "BOX/PCS" jika nilai `main_unit` atau `sell_unit` kosong/null di database

### Expected Behavior (Correct)

2.1 WHEN pengguna mengubah nilai `pcs_per_box` pada form edit produk yang sudah memiliki stok multi-unit terisi THEN sistem SHALL merecalculate dan memperbarui nilai `stockGudang` dan `stockToko` secara reaktif berdasarkan nilai `mainStock` dan `subStock` yang ada serta `pcs_per_box` yang baru

2.2 WHEN pengguna membuka form edit produk untuk produk multi-unit dan mengubah `pcs_per_box` THEN sistem SHALL memperbarui tampilan breakdown stok secara real-time dan mengirimkan nilai stok yang sudah dikonversi dengan benar ke database saat form disimpan

2.3 WHEN pengguna melakukan `updateQuantity` atau `removeItem` pada item di keranjang POS THEN sistem SHALL mengidentifikasi item berdasarkan kombinasi `product.id` DAN `sellUnit`, sehingga operasi hanya mengenai item dengan satuan yang tepat

2.4 WHEN pengguna mengisi stok multi-unit sebelum mengisi `pcs_per_box` THEN sistem SHALL menampilkan pesan validasi atau menonaktifkan input stok multi-unit hingga `pcs_per_box` diisi, sehingga tidak ada kalkulasi stok yang menggunakan fallback yang salah

2.5 WHEN halaman produk menampilkan badge unit untuk produk multi-unit THEN sistem SHALL menampilkan nilai `main_unit` dan `sell_unit` yang sebenarnya tersimpan di database (misalnya "SAK/KG", "ROLL/METER"), dan jika nilai tersebut kosong/null maka badge multi-unit SHALL tidak ditampilkan sama sekali daripada menampilkan label yang salah

### Unchanged Behavior (Regression Prevention)

3.1 WHEN pengguna mengedit produk non-multi-unit (has_multi_unit = false) THEN sistem SHALL CONTINUE TO menyimpan perubahan nama, harga, barcode, dan stok dengan benar ke database tanpa terpengaruh perubahan logika multi-unit

3.2 WHEN pengguna menambahkan produk normal (non-multi-unit) ke keranjang POS THEN sistem SHALL CONTINUE TO menggunakan `product.id` sebagai key untuk semua operasi keranjang tanpa perubahan perilaku

3.3 WHEN pengguna menambahkan produk multi-unit ke keranjang POS hanya dalam satu satuan THEN sistem SHALL CONTINUE TO menampilkan, memperbarui, dan menghapus item tersebut dengan benar

3.4 WHEN pengguna menyimpan produk baru dengan multi-unit dinonaktifkan THEN sistem SHALL CONTINUE TO menyimpan produk dengan `has_multi_unit = false`, `main_unit = null`, `pcs_per_box = null`, dan `box_price = null`

3.5 WHEN pengguna melakukan checkout di POS dengan produk multi-unit THEN sistem SHALL CONTINUE TO menghitung `stockDeductQty` sebagai `quantity × unitMultiplier` dan mengurangi stok database dengan jumlah yang benar

3.6 WHEN produk multi-unit memiliki nilai `main_unit` dan `sell_unit` yang valid (tidak null/kosong) THEN sistem SHALL CONTINUE TO menampilkan label unit tersebut dengan benar di semua halaman produk

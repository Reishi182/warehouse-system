# Multi-Unit Analysis Bugfix Design

## Overview

Terdapat lima bug pada fitur multi-unit yang perlu diperbaiki:

1. **Reactive Stock Recalculation** — `pcs_per_box` berubah tapi `stockGudang`/`stockToko` tidak direcalculate secara reaktif di `EditProductDialog`
2. **Cart Key Collision** — `updateQuantity` dan `removeItem` di `usePOSCart` menggunakan `product.id` saja, sehingga operasi bisa mengenai item yang salah saat produk yang sama ada dalam dua satuan berbeda
3. **Missing pcs_per_box Validation** — input stok multi-unit bisa diisi sebelum `pcs_per_box` diisi, menghasilkan kalkulasi dengan fallback `|| 1` yang salah
4. **Hardcoded Unit Labels** — badge unit di halaman produk dan POS menggunakan fallback `'box'`/`'pcs'` yang hardcode, sehingga produk SAK/KG atau satuan lain tampil salah

Strategi fix: perubahan minimal dan terlokalisasi pada masing-masing file yang terdampak, tanpa mengubah struktur data atau API.

## Glossary

- **Bug_Condition (C)**: Kondisi input yang memicu bug
- **Property (P)**: Perilaku yang diharapkan saat bug condition terpenuhi
- **Preservation**: Perilaku yang tidak boleh berubah setelah fix
- **pcs_per_box**: Field di database yang menyimpan jumlah sub-unit per main-unit (misal: 70 KG per SAK)
- **main_unit**: Satuan besar produk (misal: SAK, BOX, ROLL) — disimpan di `product.main_unit`
- **sell_unit**: Satuan kecil/dasar produk (misal: KG, PCS, METER) — disimpan di `product.sell_unit`
- **sellUnit**: Tipe `'main' | 'sub'` di CartItem yang menentukan satuan jual di keranjang
- **cartKey**: Identifier unik item di keranjang — seharusnya `product.id + sellUnit`
- **usePOSCart**: Hook di `src/hooks/usePOSCart.ts` yang mengelola state keranjang POS
- **EditProductDialog**: Komponen di `src/components/products/EditProductDialog.tsx` untuk edit produk
- **AddProductDialog**: Komponen di `src/components/products/AddProductDialog.tsx` untuk tambah produk

## Bug Details

### Bug 1: Reactive Stock Recalculation

Saat user membuka `EditProductDialog` untuk produk multi-unit yang sudah punya stok, lalu mengubah `pcs_per_box`, nilai `stockGudang` dan `stockToko` tidak diperbarui secara reaktif. Kalkulasi stok hanya terjadi saat user mengubah `mainStockGudang`/`subStockGudang`, bukan saat `pcsPerBox` berubah.

**Formal Specification:**
```
FUNCTION isBugCondition_1(state)
  INPUT: state = { hasMultiUnit, pcsPerBox_old, pcsPerBox_new, mainStockGudang, subStockGudang }
  OUTPUT: boolean

  RETURN state.hasMultiUnit = true
         AND state.pcsPerBox_new ≠ state.pcsPerBox_old
         AND stockGudang ≠ (mainStockGudang × pcsPerBox_new + subStockGudang)
END FUNCTION
```

**Contoh:**
- User edit produk dengan `pcs_per_box=70`, `mainStockGudang=2`, `subStockGudang=5` → `stockGudang=145`
- User ubah `pcs_per_box` menjadi `50` → seharusnya `stockGudang=105`, tapi tetap `145`
- User simpan → database menyimpan `145` padahal seharusnya `105`

### Bug 2: Cart Key Collision

`updateQuantity(productId, qty)` dan `removeItem(productId)` mencari item hanya berdasarkan `product.id`. Jika keranjang berisi produk yang sama dalam dua satuan (misal 1 SAK dan 3 KG dari produk yang sama), operasi akan mengenai item pertama yang ditemukan, bukan item dengan satuan yang dimaksud.

**Formal Specification:**
```
FUNCTION isBugCondition_2(cart, operation)
  INPUT: cart = CartItem[], operation = { productId, sellUnit }
  OUTPUT: boolean

  items_with_same_product = cart.filter(it => it.product.id = operation.productId)
  RETURN items_with_same_product.length > 1
         AND operation does NOT include sellUnit discriminator
END FUNCTION
```

**Contoh:**
- Keranjang: `[{id:"P1", sellUnit:"main", qty:1}, {id:"P1", sellUnit:"sub", qty:3}]`
- `removeItem("P1")` → menghapus item pertama (SAK), padahal user ingin hapus KG
- `updateQuantity("P1", 5)` → mengubah kuantitas SAK, padahal user ingin ubah KG

### Bug 3: Missing pcs_per_box Validation

Di `AddProductDialog` dan `EditProductDialog`, input stok multi-unit (`mainStockGudang`, `subStockGudang`, dll.) bisa diisi sebelum `pcs_per_box` diisi. Kalkulasi menggunakan `pcsPerBox || 1`, sehingga jika `pcsPerBox` null, stok dihitung seolah 1 sub-unit = 1 main-unit.

**Formal Specification:**
```
FUNCTION isBugCondition_3(state)
  INPUT: state = { hasMultiUnit, pcsPerBox, mainStockGudang }
  OUTPUT: boolean

  RETURN state.hasMultiUnit = true
         AND (state.pcsPerBox = null OR state.pcsPerBox <= 0)
         AND state.mainStockGudang > 0
END FUNCTION
```

**Contoh:**
- User aktifkan multi-unit, isi `mainStockGudang=5`, tapi belum isi `pcs_per_box`
- Kalkulasi: `stockGudang = 5 × 1 + 0 = 5` (seharusnya tidak bisa dihitung)
- User isi `pcs_per_box=70` setelah itu → `stockGudang` tidak diperbarui (Bug 1)

### Bug 4: Hardcoded Unit Labels

Di empat komponen, badge unit untuk produk multi-unit menggunakan fallback hardcode `'box'` dan `'pcs'`:

```tsx
// Contoh di ProductManageCard.tsx, ProductTableRow.tsx, ProductCard.tsx, ProductListItem.tsx
📦 {(product.main_unit || 'box').toUpperCase()}/{(product.sell_unit || 'pcs').toUpperCase()}
```

**Formal Specification:**
```
FUNCTION isBugCondition_4(product)
  INPUT: product = { has_multi_unit, main_unit, sell_unit }
  OUTPUT: boolean

  RETURN product.has_multi_unit = true
         AND (product.main_unit = null OR product.sell_unit = null)
         AND badge displays 'BOX' OR 'PCS' as fallback
END FUNCTION
```

**Contoh:**
- Produk "Tepung Terigu" dengan `has_multi_unit=true`, `main_unit="sak"`, `sell_unit="kg"`
- Jika karena bug lain `main_unit` tersimpan null → badge tampil "BOX/PCS" bukan "SAK/KG"
- Produk baru yang belum disimpan dengan benar → badge menyesatkan user

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Produk non-multi-unit (`has_multi_unit = false`) harus tetap tersimpan dan ditampilkan dengan benar
- Produk multi-unit yang sudah punya `main_unit` dan `sell_unit` valid harus tetap tampil dengan benar
- Operasi keranjang untuk produk non-multi-unit (hanya satu satuan) harus tetap bekerja dengan `product.id` saja
- Checkout POS dengan kalkulasi `stockDeductQty = quantity × unitMultiplier` harus tetap benar
- Form tambah/edit produk untuk produk non-multi-unit tidak boleh terpengaruh

**Scope:**
Semua input yang TIDAK memenuhi bug condition di atas harus sepenuhnya tidak terpengaruh oleh fix ini.

## Hypothesized Root Cause

### Bug 1 — Tidak ada `useEffect` untuk reactive recalculation
`EditProductDialog` tidak memiliki `useEffect` yang watch perubahan `pcsPerBox`. Kalkulasi `stockGudang = mainStockGudang * pcsPerBox + subStockGudang` hanya dipanggil di event handler `onChange` masing-masing input stok, bukan saat `pcsPerBox` berubah.

### Bug 2 — `updateQuantity` dan `removeItem` tidak menerima `sellUnit` parameter
Signature fungsi `updateQuantity(productId: string, qty: number)` dan `removeItem(productId: string)` tidak memiliki parameter `sellUnit`. Pencarian item di array menggunakan `it.product.id === productId` tanpa mempertimbangkan `it.sellUnit`.

### Bug 3 — Tidak ada guard/disable pada input stok saat `pcs_per_box` belum diisi
Input stok multi-unit tidak memiliki kondisi `disabled={!pcsPerBox}` atau validasi sebelum kalkulasi. Fallback `pcsPerBox || 1` di kalkulasi menyembunyikan masalah ini.

### Bug 4 — Fallback string hardcode `'box'` dan `'pcs'` di empat komponen
Empat komponen menggunakan pola `product.main_unit || 'box'` dan `product.sell_unit || 'pcs'` sebagai fallback. Seharusnya jika nilai null, badge tidak ditampilkan sama sekali (atau ditampilkan tanpa label unit).

## Correctness Properties

Property 1: Bug Condition — Reactive Stock Recalculation

_For any_ state di `EditProductDialog` di mana `hasMultiUnit = true` dan `pcsPerBox` berubah, fungsi yang sudah diperbaiki SHALL segera merecalculate `stockGudang` dan `stockToko` menggunakan formula `mainStock × pcsPerBox_new + subStock`, sehingga nilai yang dikirim ke database selalu konsisten dengan tampilan UI.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Cart Key Uniqueness

_For any_ operasi `updateQuantity` atau `removeItem` pada keranjang yang berisi produk yang sama dalam dua satuan berbeda, fungsi yang sudah diperbaiki SHALL mengidentifikasi item berdasarkan kombinasi `product.id + sellUnit`, sehingga operasi hanya mengenai item dengan satuan yang tepat.

**Validates: Requirements 2.3**

Property 3: Bug Condition — pcs_per_box Validation

_For any_ state di mana `hasMultiUnit = true` dan `pcsPerBox` belum diisi (null atau ≤ 0), sistem yang sudah diperbaiki SHALL menonaktifkan input stok multi-unit dan/atau menampilkan pesan validasi, sehingga tidak ada kalkulasi stok yang menggunakan fallback `|| 1`.

**Validates: Requirements 2.4**

Property 4: Bug Condition — Dynamic Unit Labels

_For any_ produk dengan `has_multi_unit = true`, komponen yang sudah diperbaiki SHALL menampilkan label unit dari nilai `product.main_unit` dan `product.sell_unit` yang sebenarnya. Jika salah satu nilai null/kosong, badge multi-unit SHALL tidak ditampilkan daripada menampilkan label yang salah.

**Validates: Requirements 2.5**

Property 5: Preservation — Non-Multi-Unit Products

_For any_ produk dengan `has_multi_unit = false`, semua komponen SHALL menghasilkan perilaku yang identik dengan sebelum fix — tidak ada perubahan pada tampilan, penyimpanan, atau operasi keranjang.

**Validates: Requirements 3.1, 3.2, 3.4, 3.6**

Property 6: Preservation — Single-Unit Cart Operations

_For any_ operasi keranjang pada produk yang hanya memiliki satu satuan di keranjang (baik multi-unit maupun non-multi-unit), fungsi `updateQuantity` dan `removeItem` SHALL menghasilkan hasil yang identik dengan sebelum fix.

**Validates: Requirements 3.2, 3.3**

## Fix Implementation

### Bug 1 — Reactive Stock Recalculation

**File**: `src/components/products/EditProductDialog.tsx`

**Perubahan**:
1. Tambahkan `useEffect` yang watch `pcsPerBox`:
```tsx
useEffect(() => {
  if (!hasMultiUnit || !pcsPerBox || pcsPerBox <= 0) return;
  setStockGudang(mainStockGudang * pcsPerBox + subStockGudang);
  setStockToko(mainStockToko * pcsPerBox + subStockToko);
}, [pcsPerBox]);
```

### Bug 2 — Cart Key Collision

**File**: `src/hooks/usePOSCart.ts`

**Perubahan**:
1. Update signature `updateQuantity` dan `removeItem` untuk menerima `sellUnit` opsional:
```ts
updateQuantity: (productId: string, quantity: number, sellUnit?: SellUnit) => void;
removeItem: (productId: string, sellUnit?: SellUnit) => void;
```
2. Update implementasi pencarian item:
```ts
// updateQuantity
const item = prev.find((it) =>
  it.product.id === productId &&
  (sellUnit === undefined || (it.sellUnit || 'sub') === sellUnit)
);

// removeItem
prev.filter((it) =>
  !(it.product.id === productId &&
    (sellUnit === undefined || (it.sellUnit || 'sub') === sellUnit))
)
```
3. Update `UsePOSCartReturn` interface untuk mencerminkan signature baru
4. Update semua call site di `POSCartPanel.tsx` dan `POSMobileCart.tsx` untuk meneruskan `sellUnit` dari `it.sellUnit`

### Bug 3 — pcs_per_box Validation

**File**: `src/components/products/AddProductDialog.tsx`, `src/components/products/EditProductDialog.tsx`

**Perubahan**:
1. Tambahkan `disabled={!pcsPerBox || pcsPerBox <= 0}` pada semua input stok multi-unit (`mainStockGudang`, `subStockGudang`, `mainStockToko`, `subStockToko`)
2. Tambahkan helper text di bawah input stok: "Isi jumlah per [mainUnit] terlebih dahulu"

### Bug 4 — Dynamic Unit Labels

**Files**: 
- `src/components/products/ProductManageCard.tsx`
- `src/components/products/ProductTableRow.tsx`
- `src/components/pos/ProductCard.tsx`
- `src/components/pos/ProductListItem.tsx`

**Perubahan** — ganti pola `main_unit || 'box'` dan `sell_unit || 'pcs'` dengan conditional rendering:
```tsx
// Sebelum:
📦 {(product.main_unit || 'box').toUpperCase()}/{(product.sell_unit || 'pcs').toUpperCase()}

// Sesudah:
{product.has_multi_unit && product.main_unit && product.sell_unit && (
  <span ...>
    📦 {product.main_unit.toUpperCase()}/{product.sell_unit.toUpperCase()}
  </span>
)}
```

## Testing Strategy

### Validation Approach

Dua fase: pertama, tulis test yang gagal di kode yang belum diperbaiki (exploratory) untuk mengkonfirmasi root cause. Kedua, verifikasi fix bekerja dan tidak merusak perilaku yang ada (fix + preservation checking).

### Exploratory Bug Condition Checking

**Goal**: Konfirmasi root cause sebelum implementasi fix.

**Test Plan**: Tulis unit test dan integration test yang mensimulasikan kondisi bug, jalankan pada kode UNFIXED untuk melihat kegagalan.

**Test Cases**:
1. **Reactive Recalculation Test**: Set `pcsPerBox=70`, `mainStockGudang=2`, `subStockGudang=5`, ubah `pcsPerBox=50` → assert `stockGudang === 105` (akan gagal di kode unfixed, tetap `145`)
2. **Cart Key Collision Test**: Tambah produk P1 sebagai 'main' dan 'sub', panggil `removeItem("P1")` → assert hanya satu item terhapus (akan gagal, keduanya atau item yang salah terhapus)
3. **pcs_per_box Validation Test**: Set `hasMultiUnit=true`, `pcsPerBox=null`, isi `mainStockGudang=5` → assert input disabled atau validasi error muncul (akan gagal)
4. **Hardcoded Label Test**: Render `ProductManageCard` dengan `main_unit=null`, `sell_unit=null`, `has_multi_unit=true` → assert badge tidak tampil (akan gagal, tampil "BOX/PCS")

**Expected Counterexamples**:
- `stockGudang` tidak berubah saat `pcsPerBox` diubah
- `removeItem` menghapus item yang salah saat ada dua satuan
- Badge menampilkan "BOX/PCS" untuk produk dengan satuan berbeda

### Fix Checking

**Goal**: Verifikasi semua bug condition menghasilkan perilaku yang benar setelah fix.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition_1(state) DO
  result := editProductDialog_fixed(state)
  ASSERT result.stockGudang = state.mainStockGudang × state.pcsPerBox_new + state.subStockGudang
END FOR

FOR ALL cart, operation WHERE isBugCondition_2(cart, operation) DO
  result := removeItem_fixed(cart, operation.productId, operation.sellUnit)
  ASSERT result.length = cart.length - 1
  ASSERT result does NOT contain item with (productId AND sellUnit)
END FOR

FOR ALL state WHERE isBugCondition_3(state) DO
  ASSERT stockInput.disabled = true OR validationError shown
END FOR

FOR ALL product WHERE isBugCondition_4(product) DO
  ASSERT badge NOT rendered
END FOR
```

### Preservation Checking

**Goal**: Verifikasi perilaku yang tidak terdampak tetap identik setelah fix.

**Pseudocode:**
```
FOR ALL product WHERE product.has_multi_unit = false DO
  ASSERT render_original(product) = render_fixed(product)
END FOR

FOR ALL cart WHERE cart has single unit per product DO
  ASSERT removeItem_original(cart, id) = removeItem_fixed(cart, id, undefined)
  ASSERT updateQuantity_original(cart, id, qty) = updateQuantity_fixed(cart, id, qty, undefined)
END FOR
```

**Test Cases**:
1. **Non-Multi-Unit Product Display**: Render produk dengan `has_multi_unit=false` → badge tidak tampil, tidak ada perubahan
2. **Single-Unit Cart Remove**: Keranjang dengan satu item per produk → `removeItem` tanpa `sellUnit` tetap bekerja
3. **Non-Multi-Unit Form Save**: Edit produk non-multi-unit → data tersimpan identik dengan sebelum fix
4. **Valid Unit Labels**: Produk dengan `main_unit="sak"`, `sell_unit="kg"` → badge tampil "SAK/KG" (tidak berubah)

### Unit Tests

- Test `useEffect` reactive recalculation di `EditProductDialog` saat `pcsPerBox` berubah
- Test `updateQuantity(id, qty, 'main')` hanya mengubah item dengan `sellUnit='main'`
- Test `removeItem(id, 'sub')` hanya menghapus item dengan `sellUnit='sub'`
- Test input stok disabled saat `pcsPerBox` null
- Test badge tidak render saat `main_unit` atau `sell_unit` null

### Property-Based Tests

- Generate random `pcsPerBox` values → verifikasi `stockGudang = mainStock × pcsPerBox + subStock` selalu benar
- Generate random cart states dengan produk multi-unit dalam dua satuan → verifikasi `removeItem` dengan `sellUnit` selalu menghapus item yang tepat
- Generate random produk dengan berbagai kombinasi `main_unit`/`sell_unit` null/non-null → verifikasi badge hanya tampil saat keduanya non-null

### Integration Tests

- Test full flow: tambah produk multi-unit SAK/KG → edit `pcs_per_box` → verifikasi stok tersimpan benar
- Test POS flow: tambah produk yang sama sebagai SAK dan KG → hapus KG → verifikasi SAK masih ada
- Test product list: produk dengan berbagai satuan → verifikasi semua badge menampilkan satuan yang benar

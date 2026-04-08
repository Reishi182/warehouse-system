# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Multi-Unit Bugs (Reactive Stock, Cart Key, Validation, Hardcoded Labels)
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: Scope each property to the concrete failing case(s) for reproducibility

  - Bug 1 — Reactive Stock: Set `pcsPerBox=70`, `mainStockGudang=2`, `subStockGudang=5`, ubah `pcsPerBox=50` → assert `stockGudang === 105` (isBugCondition_1: hasMultiUnit=true AND pcsPerBox berubah AND stockGudang ≠ mainStock×pcsPerBox_new+subStock)
  - Bug 2 — Cart Key: Tambah produk P1 sebagai sellUnit='main' dan sellUnit='sub', panggil `removeItem("P1")` tanpa sellUnit → assert hanya satu item terhapus (isBugCondition_2: cart.filter(id).length > 1 AND operasi tanpa sellUnit discriminator)
  - Bug 3 — Validation: Set `hasMultiUnit=true`, `pcsPerBox=null`, isi `mainStockGudang=5` → assert input disabled atau validasi error muncul (isBugCondition_3: hasMultiUnit=true AND pcsPerBox=null AND mainStockGudang>0)
  - Bug 4 — Labels: Render komponen dengan `has_multi_unit=true`, `main_unit=null`, `sell_unit=null` → assert badge tidak tampil (isBugCondition_4: has_multi_unit=true AND main_unit=null OR sell_unit=null)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (ini benar — membuktikan bug ada)
  - Document counterexamples: stockGudang tidak berubah saat pcsPerBox diubah; removeItem menghapus item yang salah; badge menampilkan "BOX/PCS" untuk produk dengan satuan berbeda
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Multi-Unit Products and Single-Unit Cart Operations
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: produk dengan `has_multi_unit=false` tidak menampilkan badge unit pada kode unfixed
  - Observe: `removeItem("P1")` pada keranjang dengan satu item per produk menghapus item yang benar
  - Observe: `updateQuantity("P1", 5)` pada keranjang single-unit mengubah kuantitas dengan benar
  - Observe: produk dengan `main_unit="sak"`, `sell_unit="kg"` menampilkan badge "SAK/KG"
  - Write property-based tests: for all products where has_multi_unit=false, render output identik sebelum dan sesudah fix (dari Preservation Requirements di design)
  - Write property-based tests: for all cart states dengan satu satuan per produk, removeItem dan updateQuantity tanpa sellUnit menghasilkan hasil identik
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix all multi-unit bugs

  - [ ] 3.1 Bug 1 — Tambahkan useEffect reactive recalculation di EditProductDialog
    - File: `src/components/products/EditProductDialog.tsx`
    - Tambahkan `useEffect` yang watch `pcsPerBox` dan merecalculate `stockGudang`/`stockToko`
    - Formula: `setStockGudang(mainStockGudang * pcsPerBox + subStockGudang)` dan `setStockToko(mainStockToko * pcsPerBox + subStockToko)`
    - Guard: `if (!hasMultiUnit || !pcsPerBox || pcsPerBox <= 0) return`
    - _Bug_Condition: isBugCondition_1 — hasMultiUnit=true AND pcsPerBox berubah AND stockGudang ≠ mainStock×pcsPerBox_new+subStock_
    - _Expected_Behavior: stockGudang = mainStockGudang × pcsPerBox_new + subStockGudang (segera setelah pcsPerBox berubah)_
    - _Preservation: produk non-multi-unit tidak terpengaruh; useEffect hanya aktif saat hasMultiUnit=true_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Bug 2 — Update signature dan implementasi updateQuantity/removeItem di usePOSCart
    - File: `src/hooks/usePOSCart.ts`
    - Update signature: `updateQuantity(productId: string, quantity: number, sellUnit?: SellUnit)` dan `removeItem(productId: string, sellUnit?: SellUnit)`
    - Update pencarian item: `it.product.id === productId && (sellUnit === undefined || (it.sellUnit || 'sub') === sellUnit)`
    - Update `UsePOSCartReturn` interface untuk mencerminkan signature baru
    - _Bug_Condition: isBugCondition_2 — cart berisi produk yang sama dalam dua satuan AND operasi tanpa sellUnit discriminator_
    - _Expected_Behavior: operasi hanya mengenai item dengan kombinasi productId+sellUnit yang tepat_
    - _Preservation: operasi tanpa sellUnit (undefined) tetap bekerja identik untuk produk single-unit_
    - _Requirements: 2.3, 3.2, 3.3_

  - [ ] 3.3 Bug 2 — Update call site di POSCartPanel dan POSMobileCart
    - File: `src/components/pos/POSCartPanel.tsx`, `src/components/pos/POSMobileCart.tsx`
    - Update semua pemanggilan `removeItem(it.product.id)` → `removeItem(it.product.id, it.sellUnit)`
    - Update semua pemanggilan `updateQuantity(it.product.id, qty)` → `updateQuantity(it.product.id, qty, it.sellUnit)`
    - _Requirements: 2.3_

  - [ ] 3.4 Bug 3 — Tambahkan disabled state pada input stok multi-unit di AddProductDialog dan EditProductDialog
    - File: `src/components/products/AddProductDialog.tsx`, `src/components/products/EditProductDialog.tsx`
    - Tambahkan `disabled={!pcsPerBox || pcsPerBox <= 0}` pada input `mainStockGudang`, `subStockGudang`, `mainStockToko`, `subStockToko`
    - Tambahkan helper text: "Isi jumlah per [mainUnit] terlebih dahulu" saat input disabled
    - _Bug_Condition: isBugCondition_3 — hasMultiUnit=true AND pcsPerBox=null AND mainStockGudang>0_
    - _Expected_Behavior: input stok disabled atau validasi error ditampilkan saat pcsPerBox belum diisi_
    - _Preservation: input stok tetap berfungsi normal saat pcsPerBox sudah diisi dengan nilai valid_
    - _Requirements: 2.4_

  - [ ] 3.5 Bug 4 — Ganti hardcoded fallback unit labels dengan conditional rendering di empat komponen
    - File: `src/components/products/ProductManageCard.tsx`, `src/components/products/ProductTableRow.tsx`, `src/components/pos/ProductCard.tsx`, `src/components/pos/ProductListItem.tsx`
    - Ganti pola `(product.main_unit || 'box').toUpperCase()` dengan conditional: `{product.has_multi_unit && product.main_unit && product.sell_unit && (<span>📦 {product.main_unit.toUpperCase()}/{product.sell_unit.toUpperCase()}</span>)}`
    - _Bug_Condition: isBugCondition_4 — has_multi_unit=true AND (main_unit=null OR sell_unit=null) AND badge menampilkan 'BOX'/'PCS'_
    - _Expected_Behavior: badge tidak ditampilkan jika main_unit atau sell_unit null/kosong_
    - _Preservation: produk dengan main_unit dan sell_unit valid tetap menampilkan badge dengan benar_
    - _Requirements: 2.5, 3.6_

  - [ ] 3.6 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Multi-Unit Bugs Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - Run all four bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: All tests PASS (confirms all bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - No Regressions
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm non-multi-unit products, single-unit cart operations, and valid unit labels all behave identically

- [ ] 4. Checkpoint — Ensure all tests pass
  - Pastikan semua test dari task 1, 2, dan sub-task 3.6, 3.7 lulus
  - Tanya user jika ada pertanyaan atau ambiguitas yang muncul selama implementasi

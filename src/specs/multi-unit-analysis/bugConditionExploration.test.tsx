/**
 * Bug Condition Exploration Tests — Multi-Unit Analysis
 *
 * These tests are EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bugs exist. DO NOT fix the code when tests fail.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ProductCard } from '@/components/pos/ProductCard';
import { ProductListItem } from '@/components/pos/ProductListItem';
import ProductManageCard from '@/components/products/ProductManageCard';
import { usePOSCart } from '@/hooks/usePOSCart';
import { createMockProduct } from '@/test/testUtils';

// Mock DataContext so usePOSCart can be tested in isolation
vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    products: [],
    requests: [],
    suratJalans: [],
    stockLogs: [],
    notifications: [],
    sales: [],
    cashTransfers: [],
    activityLogs: [],
    loading: false,
    addProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    getProductByBarcode: vi.fn(),
    createSale: vi.fn(),
    addStock: vi.fn(),
    createStockOutRequest: vi.fn(),
  }),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Bug 1 — Reactive Stock Recalculation
// isBugCondition_1: hasMultiUnit=true AND pcsPerBox berubah AND
//                   stockGudang ≠ mainStock×pcsPerBox_new+subStock
//
// Scenario: pcsPerBox=70, mainStockGudang=2, subStockGudang=5 → stockGudang=145
//           ubah pcsPerBox=50 → seharusnya stockGudang=105, tapi tetap 145
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 1 — Reactive Stock Recalculation (EXPECTED TO FAIL on unfixed code)', () => {
  it('stockGudang harus direcalculate saat pcsPerBox berubah dari 70 ke 50', () => {
    /**
     * Validates: Requirements 1.1, 1.2
     *
     * Simulasi logika kalkulasi stok di EditProductDialog.
     * Pada kode unfixed, tidak ada useEffect yang watch pcsPerBox,
     * sehingga stockGudang tidak diperbarui saat pcsPerBox berubah.
     *
     * Counterexample: stockGudang tetap 145 (= 2×70+5) bukan 105 (= 2×50+5)
     */

    // Simulasi state awal: pcsPerBox=70, mainStockGudang=2, subStockGudang=5
    let pcsPerBox = 70;
    const mainStockGudang = 2;
    const subStockGudang = 5;

    // Kalkulasi awal (seperti yang dilakukan saat form dibuka)
    let stockGudang = mainStockGudang * pcsPerBox + subStockGudang; // = 145

    // Simulasi: user mengubah pcsPerBox menjadi 50
    // Pada kode unfixed, tidak ada useEffect yang merecalculate stockGudang
    // Hanya onChange pada input pcsPerBox yang dipanggil, tapi tidak ada
    // side-effect yang memperbarui stockGudang
    pcsPerBox = 50;
    // stockGudang TIDAK diperbarui secara reaktif pada kode unfixed
    // stockGudang masih = 145

    // Nilai yang diharapkan setelah pcsPerBox berubah ke 50:
    const expectedStockGudang = mainStockGudang * pcsPerBox + subStockGudang; // = 105

    // Pada kode unfixed, stockGudang masih 145 (tidak reaktif)
    // Test ini AKAN GAGAL karena stockGudang === 145, bukan 105
    expect(stockGudang).toBe(expectedStockGudang);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug 2 — Cart Key Collision
// isBugCondition_2: cart berisi produk yang sama dalam dua satuan AND
//                   operasi removeItem tanpa sellUnit discriminator
//
// Scenario: Tambah P1 sebagai sellUnit='main' dan sellUnit='sub',
//           panggil removeItem("P1") → hanya satu item yang terhapus
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 2 — Cart Key Collision (EXPECTED TO FAIL on unfixed code)', () => {
  it('removeItem("P1") tanpa sellUnit harus menghapus hanya satu item saat ada dua satuan', () => {
    /**
     * Validates: Requirements 1.3
     *
     * Pada kode unfixed, removeItem menggunakan filter(it => it.product.id !== productId)
     * yang menghapus SEMUA item dengan product.id yang sama, bukan hanya satu.
     *
     * Counterexample: kedua item (main dan sub) terhapus, bukan hanya satu
     */

    const { result } = renderHook(() => usePOSCart('toko'));

    const product = createMockProduct({
      id: 'P1',
      name: 'Produk Multi-Unit',
      has_multi_unit: true,
      main_unit: 'box',
      sell_unit: 'pcs',
      pcs_per_box: 10,
      box_price: 100000,
      price: 10000,
      stock: { gudang: 200, toko: 200 },
    });

    // Tambah produk P1 sebagai sellUnit='main'
    act(() => {
      result.current.addToCartWithUnit(product, 'main');
    });

    // Tambah produk P1 sebagai sellUnit='sub'
    act(() => {
      result.current.addToCartWithUnit(product, 'sub');
    });

    // Verifikasi kedua item ada di keranjang
    expect(result.current.items).toHaveLength(2);

    // Panggil removeItem("P1") TANPA sellUnit
    act(() => {
      result.current.removeItem('P1');
    });

    // Pada kode unfixed: removeItem menghapus SEMUA item dengan id="P1"
    // sehingga items.length === 0, bukan 1
    // Test ini AKAN GAGAL karena items.length === 0, bukan 1
    expect(result.current.items).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug 3 — Missing pcs_per_box Validation
// isBugCondition_3: hasMultiUnit=true AND pcsPerBox=null AND mainStockGudang>0
//
// Scenario: hasMultiUnit=true, pcsPerBox=null, isi mainStockGudang=5
//           → input harus disabled atau validasi error muncul
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 3 — Missing pcs_per_box Validation (EXPECTED TO FAIL on unfixed code)', () => {
  it('input stok harus disabled saat pcsPerBox belum diisi', () => {
    /**
     * Validates: Requirements 1.4
     *
     * Pada kode unfixed, input mainStockGudang tidak memiliki disabled={!pcsPerBox}
     * sehingga user bisa mengisi stok sebelum pcsPerBox diisi.
     * Kalkulasi menggunakan fallback pcsPerBox || 1 yang salah.
     *
     * Counterexample: input tidak disabled, kalkulasi menggunakan fallback 1
     */

    // Simulasi state: hasMultiUnit=true, pcsPerBox=null
    const pcsPerBox: number | null = null;

    // Pada kode unfixed, kalkulasi stok menggunakan fallback:
    // setStockGudang((val * (pcsPerBox || 1)) + subStockGudang)
    // Jika pcsPerBox=null, maka pcsPerBox || 1 = 1
    const mainStockGudang = 5;
    const subStockGudang = 0;

    // Kalkulasi yang terjadi pada kode unfixed (menggunakan fallback 1):
    const stockGudangWithFallback = mainStockGudang * (pcsPerBox || 1) + subStockGudang; // = 5

    // Kalkulasi yang seharusnya tidak terjadi (karena pcsPerBox null):
    // Seharusnya input disabled, sehingga stockGudang tidak berubah dari 0

    // Pada kode unfixed, stockGudang = 5 (menggunakan fallback 1)
    // Seharusnya input disabled dan stockGudang tetap 0

    // Test ini memverifikasi bahwa kalkulasi dengan fallback TIDAK terjadi
    // Pada kode unfixed, stockGudangWithFallback === 5 (bukan 0)
    // Test ini AKAN GAGAL karena fallback digunakan
    expect(stockGudangWithFallback).toBe(0);
  });

  it('input mainStockGudang harus memiliki atribut disabled saat pcsPerBox null di AddProductDialog', async () => {
    /**
     * Validates: Requirements 1.4
     *
     * Render AddProductDialog dan verifikasi bahwa input stok multi-unit
     * memiliki atribut disabled saat pcsPerBox belum diisi.
     *
     * Counterexample: input tidak disabled pada kode unfixed
     */

    // Import AddProductDialog secara dinamis untuk menghindari dependency supabase
    const { default: AddProductDialog } = await import('@/components/products/AddProductDialog');

    const mockOnAdd = vi.fn().mockResolvedValue(true);
    const mockGetProductByBarcode = vi.fn().mockReturnValue(undefined);

    // Mock useProductUnits
    vi.mock('@/hooks/useProductUnits', () => ({
      useProductUnits: () => ({ data: [] }),
      unitsToSelectOptions: () => [
        { value: 'pcs', label: 'PCS' },
        { value: 'box', label: 'BOX' },
      ],
    }));

    render(
      <AddProductDialog
        onAdd={mockOnAdd}
        getProductByBarcode={mockGetProductByBarcode}
        userRole="admin"
      />
    );

    // Buka dialog
    const triggerButton = screen.getByRole('button', { name: /tambah produk/i });
    fireEvent.click(triggerButton);

    // Aktifkan multi-unit toggle
    // Cari toggle multi-unit
    const multiUnitToggle = screen.getByText(/multi-unit/i).closest('div')?.querySelector('button');
    if (multiUnitToggle) {
      fireEvent.click(multiUnitToggle);
    }

    // Pada kode unfixed, input mainStockGudang tidak disabled saat pcsPerBox null
    // Cari input stok gudang (main unit input)
    const stockInputs = screen.getAllByPlaceholderText('0');
    // Input pertama di area stok gudang adalah mainStockGudang
    const mainStockInput = stockInputs[0];

    // Test ini AKAN GAGAL karena input tidak disabled pada kode unfixed
    expect(mainStockInput).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug 4 — Hardcoded Unit Labels
// isBugCondition_4: has_multi_unit=true AND (main_unit=null OR sell_unit=null)
//                   AND badge menampilkan 'BOX'/'PCS' sebagai fallback
//
// Scenario: Render komponen dengan has_multi_unit=true, main_unit=null, sell_unit=null
//           → badge tidak boleh tampil (tapi pada kode unfixed tampil "BOX/PCS")
// ─────────────────────────────────────────────────────────────────────────────
describe('Bug 4 — Hardcoded Unit Labels (EXPECTED TO FAIL on unfixed code)', () => {
  const productWithNullUnits = createMockProduct({
    id: 'prod-null-units',
    name: 'Produk Null Units',
    has_multi_unit: true,
    main_unit: null,
    sell_unit: null,
    stock: { gudang: 50, toko: 30 },
  });

  it('ProductCard: badge tidak boleh tampil saat main_unit=null dan sell_unit=null', () => {
    /**
     * Validates: Requirements 1.5
     *
     * Pada kode unfixed, ProductCard menggunakan:
     * (product.main_unit || 'box').toUpperCase()/(product.sell_unit || 'pcs').toUpperCase()
     * sehingga badge tampil "BOX/PCS" meskipun main_unit dan sell_unit null.
     *
     * Counterexample: badge menampilkan "BOX/PCS"
     */

    render(
      <ProductCard
        product={productWithNullUnits}
        stockLocation="toko"
        onAddToCart={vi.fn()}
      />
    );

    // Pada kode unfixed, badge "BOX/PCS" akan tampil
    // Test ini AKAN GAGAL karena badge tampil dengan teks "BOX/PCS"
    expect(screen.queryByText(/BOX\/PCS/i)).not.toBeInTheDocument();
  });

  it('ProductListItem: badge tidak boleh tampil saat main_unit=null dan sell_unit=null', () => {
    /**
     * Validates: Requirements 1.5
     *
     * Counterexample: badge menampilkan "BOX/PCS"
     */

    render(
      <ProductListItem
        product={productWithNullUnits}
        stockLocation="toko"
        onAddToCart={vi.fn()}
      />
    );

    // Test ini AKAN GAGAL karena badge tampil dengan teks "BOX/PCS"
    expect(screen.queryByText(/BOX\/PCS/i)).not.toBeInTheDocument();
  });

  it('ProductManageCard: badge tidak boleh tampil saat main_unit=null dan sell_unit=null', () => {
    /**
     * Validates: Requirements 1.5
     *
     * Counterexample: badge menampilkan "BOX/PCS"
     */

    render(
      <ProductManageCard
        product={productWithNullUnits}
      />
    );

    // Test ini AKAN GAGAL karena badge tampil dengan teks "BOX/PCS"
    expect(screen.queryByText(/BOX\/PCS/i)).not.toBeInTheDocument();
  });

  it('ProductTableRow: badge tidak boleh tampil saat main_unit=null dan sell_unit=null', async () => {
    /**
     * Validates: Requirements 1.5
     *
     * Counterexample: badge menampilkan "BOX/PCS"
     */

    const { default: ProductTableRow } = await import('@/components/products/ProductTableRow');

    render(
      <table>
        <tbody>
          <ProductTableRow
            product={productWithNullUnits}
            canManage={false}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>
    );

    // Test ini AKAN GAGAL karena badge tampil
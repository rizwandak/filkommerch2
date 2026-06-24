# MIGRATION IMPLEMENTATION PLAN — DATABASE BARU

Rencana ini dibuat sebagai panduan menyelaraskan seluruh basis kode (Backend & Frontend) FILKOM Merch dengan skema database terbaru (`db_filkommerch-baru.sql`) yang telah dimigrasi secara manual di phpMyAdmin.

---

## 1. Struktur Folder & Teknologi Project

Aplikasi ini menggunakan arsitektur monorepo terpisah antara Backend (API) dan Frontend (SSR + Client UI):

- **Backend (`/backend`)**:
  - **Runtime & Bahasa**: Node.js + TypeScript (`tsc` compile ke `dist/`)
  - **Web Framework**: Express.js
  - **Database Driver**: `mysql2` dengan koneksi pool (`backend/src/config/database.ts`)
  - **Integrasi Pembayaran**: Midtrans Snap SDK (`midtrans-client`)
  - **Autentikasi**: `bcryptjs` untuk verifikasi NIM/Email + password

- **Frontend (`/frontend`)**:
  - **Runtime & SSR**: TanStack Start (Vite + React Router)
  - **Styling**: Tailwind CSS & Vanilla CSS
  - **Bridge API**: Server Actions (`createServerFn` memanggil HTTP fetch ke Backend)
  - **State Manajemen**: Local React State & LocalStorage untuk keranjang belanja (Cart)

---

## 2. Berkas dengan Penggunaan Tabel/Kolom Legacy (Lama)

Berikut adalah daftar berkas yang masih mengacu pada skema database lama dan perlu disesuaikan:

### A. Backend

1. **`backend/src/controllers/api.ts`**:
   - `createSale`: Menggunakan tabel legacy `offline_sales` dan `offline_sale_items`. Harus dimigrasikan untuk menulis ke tabel `orders`, `order_items`, dan `payments` dengan `channel = 'pos'`.
   - `getOfflineSales`, `getOfflineSaleById`, `deleteOfflineSale`: Masih membaca/menghapus dari tabel legacy `offline_sales`. Harus diubah untuk membaca dari tabel `orders` yang difilter dengan `channel = 'pos'`.
   - `getDailySalesSummary` & `getTopProducts`: Melakukan agregasi analitik langsung ke tabel legacy `offline_sales` & `offline_sale_items`. Harus disesuaikan ke tabel `orders` & `order_items` karena seluruh transaksi POS baru dicatat di sana.
   - `createOrderAndPayment`:
     - Menulis ke kolom `price` pada tabel `order_items` (di skema baru kolom ini diganti menjadi `unit_price`).
     - Tidak memasukkan `variant_id` dan `sku_snapshot` ke `order_items` (keduanya opsional tapi sangat dibutuhkan untuk pelacakan stok akurat).
     - Mempercayai harga barang (`price`) yang dikirim langsung dari frontend (risiko eksploitasi harga).
     - Belum menerapkan strategi reservasi stok (`stock_reserved` & `stock_movements`) saat pesanan online baru dibuat (unpaid).
   - `updateProduct`: Menggunakan pola menghapus semua varian (`DELETE FROM product_variants`) lalu menyisipkan ulang (`INSERT`). Cara ini akan gagal karena dibatasi oleh *Foreign Key constraint* `fk_stock_movements_variant` (`ON DELETE RESTRICT`) pada tabel `stock_movements` jika varian tersebut sudah memiliki riwayat mutasi stok.

2. **`backend/src/routes/payment.ts`**:
   - `/checkout`: Menggunakan query insert manual ke `orders` dan `order_items` mirip dengan `createOrderAndPayment`. Harus diselaraskan untuk mengambil harga dari DB dan memasukkan `variant_id`.
   - `/notification` (Midtrans Webhook):
     - Memperbarui tabel `orders` secara langsung tanpa mencatat data ke tabel `payments`.
     - Proses pengurangan stok online mengambil relasi manual berdasarkan `product_id` dan `size` tanpa mempedulikan `variant_id` secara langsung, serta tidak melepaskan status reservasi (`stock_reserved`) maupun menulis ke `stock_movements`.

### B. Frontend

1. **`frontend/src/backend/server-actions.ts`**:
   - Definisi tipe antarmuka (interface) `Order`, `OrderItem`, `OfflineSale`, dan `OfflineSaleItem` harus diselaraskan dengan perubahan skema kolom baru.
   - Server actions `createSale`, `getOfflineSales`, `getOfflineSaleById`, dan `deleteOfflineSale` perlu disesuaikan untuk memanggil rute API POS baru berbasis tabel `orders`.

2. **`frontend/src/routes/admin/transactions.tsx`**:
   - Komponen visual dan tab pemisah online/offline membaca dari data offline sales lama. Harus disesuaikan untuk memuat daftar order tunggal dengan filter `channel = 'online'` dan `channel = 'pos'`.

3. **`frontend/src/frontend/components/pos-kasir.tsx`**:
   - Fungsi `handlePayment` POS online memicu dua rute API terpisah (`createOrderAndPayment` dilanjutkan `createSale` saat pembayaran sukses). Harus disederhanakan agar POS online langsung membuat order tunggal di tabel `orders` dengan `channel = 'pos'`.

---

## 3. Rencana Perubahan Endpoint Backend

Untuk menyelaraskan transaksi dan stok secara terpusat, endpoint berikut akan diubah atau dibuat:

| Method | Endpoint | Perubahan Utama |
|--------|----------|-----------------|
| `POST` | `/api/orders` | Checkout online & POS. Mengambil informasi harga, nama produk, size, color, SKU dari database berdasarkan `variant_id`. Melakukan reservasi stok untuk pesanan online. |
| `POST` | `/api/sales` | POS Cash/Debit checkout. Langsung menulis ke `orders` (`channel = 'pos'`), `order_items`, dan `payments` (`provider = 'cash'/'debit'`), memotong stok riil, serta mencatat ke `stock_movements`. |
| `POST` | `/api/payment/notification` | Webhook Midtrans. Menulis ke tabel `payments` sebagai sumber kebenaran pembayaran, melepaskan `stock_reserved` dan mengurangi `stock` jika sukses, atau membatalkan reservasi jika kedaluwarsa/gagal. |
| `GET` | `/api/admin/orders` | Mendukung parameter query `channel` (`online` atau `pos`) untuk membedakan transaksi di panel admin. |
| `GET` | `/api/sales/:id` | Diarahkan untuk mengambil detail order dari `orders` dan `order_items` dengan parameter verifikasi channel POS. |
| `DELETE` | `/api/sales/:id` | Menghapus pesanan POS dari tabel `orders` (akan meng-cascade tabel `payments` dan `order_items` secara aman). |

---

## 4. Urutan Implementasi Aman

Aktivitas pengerjaan diatur secara bertahap untuk mencegah terjadinya kegagalan build/compile pada sistem:

1. **Langkah 1 (TypeScript Interfaces)**:
   Perbarui seluruh tipe data/antarmuka (seperti `Order`, `OrderItem`, `Payment`, `ProductVariant`) di backend dan frontend agar selaras dengan skema SQL baru.

2. **Langkah 2 (Helper Manajemen Stok Backend)**:
   Buat fungsi utilitas di backend untuk melakukan pencatatan mutasi stok secara terpusat dalam suatu transaksi database (*database transaction*):
   - `reserveStock(variantId, qty, orderId, userId)`
   - `releaseReservedStock(variantId, qty, orderId)`
   - `executeSaleStock(variantId, qty, orderId, userId)`

3. **Langkah 3 (Sinkronisasi Variant & Produk Admin)**:
   Ubah metode pembaruan produk di `updateProduct`. Alih-alih menghapus paksa (`DELETE`), terapkan pencarian varian lama:
   - Variasi yang masih ada diperbarui datanya.
   - Variasi baru ditambahkan (`INSERT`).
   - Variasi yang dihapus diubah statusnya menjadi `is_active = FALSE` untuk menjaga integritas data riwayat mutasi stok.

4. **Langkah 4 (Checkout Online & Validasi Sumber Kebenaran)**:
   Perbarui `/api/orders` agar memproses data keranjang belanja dengan melakukan query langsung ke `product_variants` menggunakan `variant_id` guna menentukan harga satuan riil, SKU, ukuran, dan warna sebelum melakukan penyimpanan.

5. **Langkah 5 (POS Kasir Terintegrasi)**:
   Perbarui fungsi checkout POS di `/api/sales` dan frontend `pos-kasir.tsx` agar menyisipkan record ke `orders` dengan `channel = 'pos'`, item ke `order_items` dengan `unit_price` bersumber dari database, serta mencatat status pembayaran ke tabel `payments`.

6. **Langkah 6 (Idempotensi Webhook Midtrans)**:
   Terapkan pencatatan pembayaran Midtrans ke tabel `payments` dengan constraint unique `(provider, provider_transaction_id)`. Verifikasi status pembayaran sebelumnya sebelum mengeksekusi logika pemotongan stok untuk menghindari pemotongan ganda.

7. **Langkah 7 (Panel Transaksi & Dashboard Admin)**:
   Perbarui panel administrasi transaksi dan analitik untuk membaca data dari tabel `orders` terpadu.

---

## 5. Strategi Katalog Berbasis Variant

- Skema baru menuntut `product_variants` menjadi entitas transaksi utama.
- Rute pencarian detail produk (`GET /api/products/:slug`) akan memuat data produk berserta seluruh varian aktif (`is_active = TRUE`).
- Jika suatu varian memiliki kolom `price_override` yang tidak bernilai null, sistem backend akan memprioritaskan harga override tersebut dibandingkan harga dasar di tabel `products`.

---

## 6. Strategi Checkout Online & Webhook Midtrans Idempotent

### Alur Checkout Online (Unpaid):
1. Pengguna mengirimkan array item berisi `variant_id` dan `quantity`.
2. Backend membuka transaksi database (`START TRANSACTION`), mengunci baris varian terkait (`FOR UPDATE`).
3. Validasi stok tersedia: `stock - stock_reserved >= quantity`. Jika tidak mencukupi, transaksi dibatalkan.
4. Hitung harga satuan riil dari database (prioritas `price_override` → `price`).
5. Masukkan data pesanan ke `orders` dengan status `payment_status = 'unpaid'` dan `order_status = 'pending_payment'`.
6. Masukkan item ke `order_items` (menggunakan nama kolom `unit_price`, mengisi `variant_id` dan `sku_snapshot`).
7. Update stok reservasi: `UPDATE product_variants SET stock_reserved = stock_reserved + ? WHERE id = ?`.
8. Catat riwayat ke `stock_movements` dengan tipe `'reservation'`.
9. Panggil Midtrans Snap SDK untuk mendapatkan token transaksi, simpan token ke order, lalu commit transaksi database.

### Webhook Midtrans Idempotent:
1. Webhook menerima notifikasi pembayaran. Validasi signature key terlebih dahulu.
2. Buka transaksi database, kunci baris order berdasarkan `order_id` (`FOR UPDATE`).
3. Cek apakah ada record pembayaran sukses di tabel `payments` untuk `order_id` ini. Jika status order sudah `paid`/`settlement`, langsung kembalikan respon sukses tanpa memproses ulang (Idempotency Guard).
4. Masukkan/perbarui data pembayaran di tabel `payments`.
5. Jika status notifikasi adalah **Success** (settlement/capture):
   - Ubah `orders.payment_status = 'paid'`, `orders.order_status = 'processing'`.
   - Untuk setiap item order:
     - Kurangi stok: `UPDATE product_variants SET stock = stock - ?, stock_reserved = stock_reserved - ? WHERE id = ?`.
     - Catat dua entri `stock_movements`: `'reservation_release'` (negatif) dan `'sale'` (negatif).
6. Jika status notifikasi adalah **Failed/Expired/Cancelled**:
   - Ubah `orders.payment_status = 'failed'`/`'expired'`, `orders.order_status = 'cancelled'`.
   - Untuk setiap item order:
     - Kurangi reservasi saja: `UPDATE product_variants SET stock_reserved = stock_reserved - ? WHERE id = ?`.
     - Catat satu entri `stock_movements`: `'reservation_release'` (negatif).
7. Commit transaksi database.

---

## 7. Strategi POS (Point of Sale)

- Transaksi POS langsung terselesaikan di tempat.
- Saat pembayaran POS Cash/Debit disubmit:
  - Masukkan pesanan ke `orders` dengan `channel = 'pos'`, `payment_status = 'paid'`, `order_status = 'completed'`, `fulfillment_status = 'completed'`.
  - Masukkan rincian pembayaran ke `payments` dengan `provider = 'cash'` / `'debit'` dan `status = 'paid'`.
  - Kurangi stok fisik secara langsung (`UPDATE product_variants SET stock = stock - ? WHERE id = ?`).
  - Catat entri `stock_movements` dengan tipe `'sale'`.
- Tidak ada tahap reservasi stok untuk transaksi POS tunai/debit instan.
- Pencetakan struk bluetooth langsung menggunakan data transaksi yang terverifikasi sukses dari database.

---

## 8. Logika Reservasi & Alur Stok pada `product_variants`

Status stok dan perubahannya dimodelkan sebagai berikut:

```mermaid
stateDiagram-v2
    [*] --> Tersedia : Stok Awal (Initial)
    Tersedia --> Reservasi : Checkout Online (Order Unpaid)
    note right of Reservasi
        stock_reserved + qty
        stock_movements: 'reservation'
    end note
    
    Reservasi --> Terjual : Pembayaran Sukses (Settlement)
    note right of Terjual
        stock - qty
        stock_reserved - qty
        stock_movements: 'reservation_release' & 'sale'
    end note
    
    Reservasi --> Tersedia : Pembayaran Expired/Batal
    note left of Tersedia
        stock_reserved - qty
        stock_movements: 'reservation_release'
    end note

    Tersedia --> Terjual : POS Cash/Debit
    note bottom of Terjual
        stock - qty
        stock_movements: 'sale'
    end note
```

---

## 9. Risiko Kompatibilitas

- **Integrasi Foreign Key Baru**: Mengharuskan pendaftaran data pembayar di `payments` terikat dengan ID pesanan yang ada di `orders`. Transaksi lama di tabel `offline_sales` tidak memiliki keterkaitan ini dan dibiarkan sebagai data arsip (legacy read-only).
- **Penggunaan Nama Kolom Baru**: Perubahan nama kolom `price` menjadi `unit_price` di `order_items` akan menyebabkan error runtime jika ada bagian query lama yang terlewat saat pengerjaan.
- **RESTRICT ON DELETE di Mutasi Stok**: Penambahan data ke `stock_movements` mengikat `variant_id`. Sekali transaksi berjalan, variasi produk tersebut secara permanen tidak dapat dihapus secara fisik (`DELETE`) dari database dan harus disembunyikan menggunakan kolom status aktif (`is_active = FALSE`).

---

## 10. Test Plan (Rencana Pengujian)

Untuk memastikan kelayakan migrasi ini, pengujian berikut akan dijalankan:

### A. Pengujian Otomatis (Automated Tests)
- Menjalankan perintah `npm run build` pada folder `/backend` dan `/frontend` untuk memastikan tidak ada kesalahan kompilasi tipe data TypeScript.
- Menjalankan `npm run lint` & `npm run format` untuk menjaga konsistensi format penulisan kode.

### B. Skenario Pengujian Manual (Manual Verification)
1. **Skenario Checkout Online**:
   - Buka halaman produk, tambahkan item ke keranjang, lalu buka halaman checkout.
   - Selesaikan pengisian form, jalankan pembayaran (gunakan simulator Midtrans).
   - Pastikan di database:
     - Pesanan baru tercatat di `orders`.
     - Stok reservasi `stock_reserved` bertambah sementara waktu pesanan pending.
     - Riwayat mutasi `stock_movements` bertipe `'reservation'` tersimpan.
     - Setelah sukses dibayar via simulator, pastikan data `payments` bertambah, `stock` berkurang, `stock_reserved` kembali normal, dan tercatat `'sale'` serta `'reservation_release'` di `stock_movements`.

2. **Skenario Pembayaran Expired (Online)**:
   - Buat pesanan online baru sampai Snap token muncul, lalu biarkan (atau trigger status expire via Midtrans dashboard simulator).
   - Pastikan stok reservasi dibebaskan kembali dan dicatat mutasi `'reservation_release'` dengan jumlah negatif.

3. **Skenario POS Kasir (Offline Tunai)**:
   - Buka halaman POS, pilih varian produk, masukkan diskon kustom, lalu pilih metode Tunai.
   - Selesaikan transaksi, cetak struk (jika printer terhubung).
   - Pastikan pesanan masuk ke tabel `orders` (`channel = 'pos'`), detail pembayaran masuk ke `payments`, stok langsung terpotong, dan tercatat `'sale'` di `stock_movements`.

4. **Skenario Manipulasi Harga (Security Check)**:
   - Coba modifikasi payload harga dari client pada request body checkout menggunakan tools API test.
   - Pastikan backend mendeteksi kecurangan harga dengan mencocokkan harga riil dari database dan menolak transaksi atau memperbaikinya secara otomatis.

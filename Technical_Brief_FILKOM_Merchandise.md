# TECHNICAL BRIEF --- FILKOM MERCHANDISE WEBSITE

## 1. Tujuan Sistem

Bangun e-commerce FILKOM Merchandise yang mencakup storefront buyer
serta internal management system untuk admin dan cashier. Sistem
mendukung ready stock, pre-order, harga umum dan harga khusus akun UB,
pembayaran tunai dan online melalui Midtrans, pickup di FILKOM Merch
atau pengiriman, serta activity log.

Proses PO, refund, pengalihan produk, pickup schedule, notifikasi
WhatsApp, bundle otomatis, dan verifikasi KTM tidak perlu diotomatisasi;
keputusan operasional dikendalikan manual oleh admin.

## 2. Role dan Permission

``` ts
type UserRole = "buyer" | "admin" | "cashier";
```

  Permission                         Buyer   Cashier    Admin
  --------------------------------- ------- ---------- -------
  Lihat katalog                        ✓        ✓         ✓
  Checkout online                      ✓        \-       \-
  Akses POS                           \-        ✓         ✓
  Kelola produk/harga/stok            \-        \-        ✓
  Kelola pesanan                      \-     Terbatas     ✓
  Kelola akun pegawai                 \-        \-        ✓
  Lihat activity log seluruh akun     \-        \-        ✓

-   Admin maksimal 5 akun dan cashier maksimal 10 akun.
-   Admin/cashier memakai nama asli.
-   Hanya admin dapat mengelola akun pegawai dan role.
-   Cashier hanya dapat melihat stok serta memproses transaksi; tidak
    dapat mengubah data master.

## 3. Authentication dan Harga Civitas

Gunakan Google Authentication. Tidak perlu upload KTM, approval manual,
atau halaman verifikasi civitas.

``` ts
const isUbEmail =
  user.email.endsWith("@student.ub.ac.id") ||
  user.email.endsWith("@ub.ac.id");
```

  Kondisi                                      Harga
  -------------------------------------------- ----------------
  Belum login / email umum                     `public_price`
  Login `@student.ub.ac.id` atau `@ub.ac.id`   `filkom_price`

Domain harga khusus sebaiknya dapat dikonfigurasi, bukan di-hardcode di
frontend.

## 4. Navbar dan Storefront

Navbar:
`Beranda | Produk | Pre-Order | Tentang Kami | Hubungi Kami | Cart | Akun`

Kategori tidak dimasukkan ke navbar. Halaman `/products` menjadi pusat
katalog dengan layout visual card/tile, search bar, filter
kategori/harga/status/ukuran/warna, serta sorting terbaru, harga, dan
terlaris.

Badge: Ready Stock, Pre-Order, Best Seller, Limited, Harga Civitas.

## 5. Database Inti

### users

``` sql
users
- id UUID PK
- full_name VARCHAR(150) NOT NULL
- email VARCHAR(255) UNIQUE NOT NULL
- avatar_url TEXT NULL
- role ENUM('buyer', 'admin', 'cashier') DEFAULT 'buyer'
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### categories

``` sql
categories
- id UUID PK
- name VARCHAR(100) NOT NULL
- slug VARCHAR(120) UNIQUE NOT NULL
- description TEXT NULL
- image_url TEXT NULL
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### products

``` sql
products
- id UUID PK
- category_id UUID FK categories.id NULL
- name VARCHAR(200) NOT NULL
- slug VARCHAR(220) UNIQUE NOT NULL
- description TEXT NULL
- product_type ENUM('apparel','lifestyle','accessory','collectible','bundle') NULL
- sale_type ENUM('ready_stock','pre_order','limited_drop') DEFAULT 'ready_stock'
- public_price DECIMAL(12,2) NOT NULL
- filkom_price DECIMAL(12,2) NULL
- promo_price DECIMAL(12,2) NULL
- compare_at_price DECIMAL(12,2) NULL
- cost_price DECIMAL(12,2) NULL
- stock INTEGER DEFAULT 0
- reserved_stock INTEGER DEFAULT 0
- low_stock_threshold INTEGER DEFAULT 5
- is_featured BOOLEAN DEFAULT false
- is_best_seller BOOLEAN DEFAULT false
- is_limited BOOLEAN DEFAULT false
- is_active BOOLEAN DEFAULT true
- preorder_start_at TIMESTAMP NULL
- preorder_end_at TIMESTAMP NULL
- preorder_moq INTEGER NULL
- production_eta_days INTEGER NULL
- created_by UUID FK users.id
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

MOQ hanya terlihat di admin. Buyer hanya melihat periode PO dan estimasi
produksi. Tidak ada auto-cancel/auto-refund saat MOQ tidak tercapai.

### product_variants

``` sql
product_variants
- id UUID PK
- product_id UUID FK products.id
- sku VARCHAR(100) UNIQUE NULL
- name VARCHAR(150) NULL
- size VARCHAR(30) NULL
- color VARCHAR(50) NULL
- public_price DECIMAL(12,2) NULL
- filkom_price DECIMAL(12,2) NULL
- stock INTEGER DEFAULT 0
- reserved_stock INTEGER DEFAULT 0
- image_url TEXT NULL
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

Jika produk memiliki varian, stok dihitung dari varian; jangan
mengurangi stok produk induk dan varian bersamaan.

### orders dan order_items

``` sql
orders
- id UUID PK
- order_number VARCHAR(50) UNIQUE NOT NULL
- buyer_id UUID FK users.id NULL
- order_source ENUM('online','pos') NOT NULL
- fulfillment_method ENUM('pickup_filkom_merch','shipping') NOT NULL
- recipient_name VARCHAR(150) NULL
- recipient_phone VARCHAR(30) NULL
- shipping_address TEXT NULL
- shipping_city VARCHAR(100) NULL
- shipping_postal_code VARCHAR(20) NULL
- shipping_cost DECIMAL(12,2) DEFAULT 0
- subtotal DECIMAL(12,2) NOT NULL
- discount_amount DECIMAL(12,2) DEFAULT 0
- total_amount DECIMAL(12,2) NOT NULL
- payment_status ENUM('pending','paid','failed','expired','refunded') DEFAULT 'pending'
- order_status ENUM('pending_payment','paid','processing','ready_for_pickup','shipped','completed','cancelled') DEFAULT 'pending_payment'
- admin_note TEXT NULL
- created_by_cashier_id UUID FK users.id NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP

order_items
- id UUID PK
- order_id UUID FK orders.id
- product_id UUID FK products.id
- variant_id UUID FK product_variants.id NULL
- product_name_snapshot VARCHAR(200) NOT NULL
- variant_name_snapshot VARCHAR(150) NULL
- unit_price DECIMAL(12,2) NOT NULL
- quantity INTEGER NOT NULL
- subtotal DECIMAL(12,2) NOT NULL
- created_at TIMESTAMP
```

Simpan snapshot nama dan harga transaksi agar riwayat tidak berubah
ketika produk diedit.

### payments, stock_movements, activity_logs

``` sql
payments
- id UUID PK
- order_id UUID FK orders.id
- payment_method ENUM('cash','midtrans') NOT NULL
- payment_provider VARCHAR(50) NULL
- provider_transaction_id VARCHAR(255) NULL
- provider_status VARCHAR(100) NULL
- amount DECIMAL(12,2) NOT NULL
- paid_at TIMESTAMP NULL
- raw_callback JSONB NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP

stock_movements
- id UUID PK
- product_id UUID FK products.id
- variant_id UUID FK product_variants.id NULL
- movement_type ENUM('initial_stock','manual_add','manual_reduce','sale','order_cancelled','adjustment') NOT NULL
- quantity_change INTEGER NOT NULL
- stock_before INTEGER NOT NULL
- stock_after INTEGER NOT NULL
- reference_order_id UUID FK orders.id NULL
- note TEXT NULL
- performed_by UUID FK users.id
- created_at TIMESTAMP

activity_logs
- id UUID PK
- actor_id UUID FK users.id NULL
- actor_name_snapshot VARCHAR(150) NULL
- actor_role ENUM('buyer','admin','cashier') NULL
- action VARCHAR(100) NOT NULL
- entity_type VARCHAR(100) NULL
- entity_id UUID NULL
- description TEXT NOT NULL
- metadata JSONB NULL
- created_at TIMESTAMP
```

## 6. Logika Harga dan Stok

Harga harus dihitung ulang di backend saat checkout. Prioritas: promo
price, lalu filkom price bila email UB, lalu public price. Harga
frontend tidak boleh dipercaya.

Ready stock online: validasi stok → reserve stock → buat order pending
payment → buat Midtrans payment → saat sukses kurangi stok dan reserved
stock; saat gagal/expired lepaskan reserve.

POS tunai: validasi stok → kurangi stok langsung → buat stock movement
`sale` → buat order/payment paid.

PO tidak mengurangi stok dan seluruh keputusan produksi dikelola manual
admin.

## 7. Midtrans

Endpoint minimum:

``` text
POST /api/payments/midtrans/create
POST /api/payments/midtrans/webhook
GET /api/payments/:orderId/status
```

Webhook harus diverifikasi signature-nya di backend dan idempotent.
Simpan raw callback. Jangan expose Midtrans server key di frontend.
Tunai hanya untuk POS; pembayaran online memakai metode yang tersedia di
Midtrans.

## 8. POS Cashier

Routes:

``` text
/cashier/pos
/cashier/transactions
```

Fitur: search/filter produk, pilih varian, cart, quantity, buyer
opsional, harga civitas bila email UB diketahui, pembayaran
tunai/Midtrans, dan penyimpanan nama cashier serta waktu transaksi.

Tidak perlu barcode scanner, SKU scanner, sales channel, atau laporan
event/booth.

## 9. Dashboard dan Activity Log

Admin routes:

``` text
/admin/dashboard
/admin/products
/admin/categories
/admin/orders
/admin/users
/admin/inventory
/admin/activity-logs
/admin/settings
```

Laporan: harian, mingguan, bulanan, dan custom range. Tampilkan omzet,
pesanan, produk terjual, transaksi tunai/online, produk terlaris, stok
menipis, dan estimasi profit.

Activity log dapat difilter berdasarkan role, nama, action, dan rentang
tanggal. Simpan nama, role, waktu, aktivitas, objek terkait, dan
metadata.

## 10. WhatsApp

Tampilkan tombol kontak di footer, Hubungi Kami, detail pesanan,
checkout/help, dan detail produk: - Aliya: https://wa.me/6282235526105 -
Puty: https://wa.me/6282287190402

## 11. Security

-   Role check di backend/database policy.
-   Buyer tidak boleh akses admin/cashier.
-   Cashier tidak boleh mengubah produk, harga, kategori, atau stok
    manual.
-   Validasi harga dan stok di backend.
-   Semua perubahan admin/cashier dicatat.
-   Gunakan soft delete bila memungkinkan.
-   Validasi upload gambar.
-   Gunakan transaksi database untuk pembayaran sukses, order, stok,
    stock movement, dan log.

## 12. Prioritas

### Phase 1

Google Auth; role; produk/kategori/gambar/varian; harga civitas;
katalog/search/filter; cart/checkout; ready stock/PO; Midtrans; order
history; POS; stock movement; dashboard; activity log; tombol WhatsApp.

### Phase 2

Harga promo/coret; featured/best seller/limited; bundle manual; estimasi
profit HPP; homepage management; export laporan; advanced filter.

## 13. Tidak Perlu Dibuat

-   Verifikasi KTM.
-   Approval civitas manual.
-   MOQ untuk buyer.
-   Auto-cancel/auto-refund PO.
-   Pilihan alih produk di web.
-   Notifikasi WhatsApp otomatis.
-   Pickup schedule.
-   Barcode/SKU scanner.
-   Sales channel.
-   Laporan per event/booth.
-   Bundle otomatis.
-   Kolom khusus Boneka Bara.
-   Loyalty, points, referral.

## 14. Acceptance Criteria

1.  Harga otomatis sesuai email UB/non-UB.
2.  Buyer dapat katalog, filter, varian, cart, checkout, Midtrans.
3.  Pickup FILKOM Merch atau shipping tersedia.
4.  Admin dapat kelola produk, kategori, varian, harga, stok, PO,
    pesanan.
5.  Cashier dapat transaksi tunai/Midtrans tanpa akses data master.
6.  Stok tidak minus.
7.  Webhook tidak menggandakan stok/transaksi.
8.  Laporan harian/mingguan/bulanan tersedia.
9.  Activity log dapat dilacak berdasarkan nama, waktu, role, aktivitas.
10. Semua route terlindungi sesuai role.

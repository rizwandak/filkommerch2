-- Nonaktifkan pemeriksaan foreign key sementara untuk mengosongkan tabel transaksi
SET FOREIGN_KEY_CHECKS = 0;

-- Kosongkan tabel transaksi online
TRUNCATE TABLE payments;
TRUNCATE TABLE order_items;
TRUNCATE TABLE order_discounts;
TRUNCATE TABLE orders;

-- Kosongkan tabel transaksi offline POS
TRUNCATE TABLE offline_sale_items;
TRUNCATE TABLE offline_sales;
TRUNCATE TABLE cashier_shifts;

-- Kosongkan riwayat mutasi stok dan log aktivitas jika diperlukan
TRUNCATE TABLE stock_movements;
TRUNCATE TABLE activity_logs;

-- Aktifkan kembali pemeriksaan foreign key
SET FOREIGN_KEY_CHECKS = 1;

-- Opsional: Kembalikan stok semua varian produk ke nilai semula (misal 50) untuk testing jika ingin mereset stok
-- UPDATE product_variants SET stock = 50, stock_reserved = 0;

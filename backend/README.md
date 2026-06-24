# FILKOM Merch - Backend API Server

Backend ini adalah server API standalone Node.js Express + TypeScript yang bertugas mengelola basis data MySQL2 dan menangani integrasi transaksi Midtrans Client.

## Persyaratan
- Node.js (versi 16 ke atas)
- Laragon atau XAMPP (MySQL berjalan di port 3306)

## Setup Instalan
1. Buka folder `/backend` pada terminal.
2. Instal semua dependensi:
   ```bash
   npm install
   ```
3. Sesuaikan konfigurasi basis data dan server key Midtrans Anda pada file `.env`.

## Cara Menjalankan Server

### Mode Development (Hot-reload)
```bash
npm run dev
```
Server akan berjalan di `http://localhost:8080`.

### Mode Production (Compile & Run)
```bash
npm run build
npm start
```

## Struktur Endpoint REST API
- `POST /api/payment/checkout` -> Generate token Snap Midtrans dari invoice pesanan.
- `POST /api/payment/notification` -> Webhook verifikasi transaksi dari Midtrans.
- `GET /api/products` -> Ambil seluruh produk aktif.
- `POST /api/sales` -> Catat transaksi POS offline kasir & potong stok varian.
- `GET /api/db-check` -> Cek integritas koneksi MySQL.
- *Endpoint CRUD admin, analitik, dan pengaturan toko.*

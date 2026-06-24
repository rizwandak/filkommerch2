# FILKOM Merch - Frontend Client UI

Frontend ini adalah antarmuka pengguna (UI) modern berbasis React & TanStack Start/Vite yang berkomunikasi dengan Backend API standalone untuk memproses transaksi, manajemen produk, dan monitoring analitik toko.

## Persyaratan
- Node.js (versi 16 ke atas)

## Setup Instalan
1. Buka folder `/frontend` pada terminal.
2. Instal semua dependensi:
   ```bash
   npm install
   ```
3. Salin file `.env.local` dan pastikan `VITE_API_URL` mengarah ke backend server Anda:
   ```env
   VITE_API_URL=http://localhost:8080
   ```

## Cara Menjalankan Aplikasi

### Mode Development (Hot-reload)
```bash
npm run dev
```
Aplikasi akan dapat diakses secara lokal di browser melalui port default Vite (misalnya `http://localhost:3000` atau `http://localhost:5173`).

### Mode Production (Compile & Build)
```bash
npm run build
npm run preview
```

## Fitur Integrasi Backend
Aplikasi ini sudah dipisahkan dari database secara langsung. Seluruh interaksi data dilakukan melalui **Client API Bridge** pada `src/backend/server-actions.ts` yang memanggil REST API backend menggunakan `fetch()`. Hal ini memastikan keamanan data dan kemudahan proses deployment (seperti host statis di Vercel).

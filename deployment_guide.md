# 🚀 Panduan Deployment FILKOM Merch ke cPanel Rumahweb

> **Hosting:** Rumahweb Unlimited M — `filkommerch.com`  
> **Username cPanel:** `filj5633`  
> **Server:** ACCL GUNTUR PRO  
> **Stack:** Frontend React (Vite static build) + Backend Express Node.js + MySQL

---

## 📐 Arsitektur Deployment

```
filkommerch.com (Browser)
        │
        ├── / (halaman web) ──→ public_html/ (file HTML/JS/CSS hasil build React)
        │
        └── /api/* ──→ .htaccess reverse proxy ──→ Node.js App (Express backend)
                                                        │
                                                        └── MySQL (db_filkommerch)
```

```
Alur Deploy:
  Local → git push → GitHub → GitHub Actions (build frontend) → FTP ke cPanel
                                                               → SSH restart backend
```

---

## ✅ CHECKLIST URUTAN DEPLOYMENT

Ikuti urutan ini step-by-step:

- [ ] **Step 1** — Setup Database MySQL di cPanel
- [ ] **Step 2** — Setup SSH & Git Version Control (Clone Repo Pertama)
- [ ] **Step 3** — Setup Node.js App di cPanel (Arahkan ke folder repo)
- [ ] **Step 4** — Build & Upload Frontend ke `public_html`
- [ ] **Step 5** — Konfigurasi `.htaccess` untuk routing
- [ ] **Step 6** — Setup GitHub Actions untuk Auto-Deploy (Opsional)
- [ ] **Step 7** — Setup Database Migration agar perubahan schema otomatis

---

## 🗄️ Step 1: Setup Database MySQL di cPanel

### 1.1 Buat Database & User

1. Login ke cPanel (`filkommerch.com/cpanel` atau klik **Masuk Panel** di Rumahweb)
2. Cari menu **MySQL® Database Wizard** (atau **MySQL® Databases**)
3. **Buat database baru:**
   - Nama: `filj5633_filkommerch`
   - *(cPanel akan otomatis menambahkan prefix `filj5633_`)*
4. **Buat user database:**
   - Username: `filj5633_merch`
   - Password: *(buat password yang kuat, CATAT password ini!)*
5. **Hubungkan user ke database:**
   - Centang **ALL PRIVILEGES**
   - Klik **Make Changes**

### 1.2 Import Schema Database

1. Buka **phpMyAdmin** di cPanel
2. Pilih database `filj5633_filkommerch` di sidebar kiri
3. Klik tab **Import**
4. Upload file `db_filkommerch (11 juli).sql` dari project kamu (gunakan file terbaru ini karena sudah difix collation-nya)
5. Klik **Go**

> [!IMPORTANT]
> **Catat info ini**, akan dipakai nanti:
> ```
> DB_HOST=localhost
> DB_USER=filj5633_merch
> DB_PASSWORD=(password yang kamu buat)
> DB_NAME=filj5633_filkommerch
> DB_PORT=3306
> ```

---

## 🐙 Step 2: Setup SSH & Git di cPanel (Clone Repository)

Langkah ini penting dilakukan **sebelum** membuat Node.js App agar file project-nya sudah ada di hosting.

### 2.1 Generate SSH Key di cPanel

1. Buka **SSH Access** → **Manage SSH Keys** di cPanel.
2. Klik **Generate a New Key**.
3. Isi nama key (contoh: `id_rsa`), password opsional.
4. Klik **Generate Key**.
5. Kembali ke halaman utama SSH, klik **Manage** pada public key baru tersebut → klik **Authorize**.
6. Klik **View/Download** pada **Private Key/Public Key** (pilih Public Key), copy seluruh isi teksnya.

### 2.2 Tambahkan Deploy Key ke GitHub

1. Buka repository GitHub kamu di browser → **Settings** → **Deploy keys**.
2. Klik **Add deploy key**.
3. Paste public key dari cPanel tadi.
4. Beri nama "cPanel Rumahweb".
5. ✅ Centang **Allow write access**.
6. Klik **Add key**.

### 2.3 Clone Repo di cPanel

1. Buka menu **Git™ Version Control** di cPanel.
2. Klik **Create**.
3. Isi kolom sebagai berikut:
   - **Clone URL:** `git@github.com:rizwandak/filkommerch2.git`
   - **Repository Path:** `repositories/filkommerch`
   - **Repository Name:** `filkommerch`
4. Klik **Create**. Tunggu beberapa saat sampai cloning selesai.

---

## ⚙️ Step 3: Setup Backend Node.js di cPanel

### 3.1 Buat Node.js App

Setelah repository berhasil di-clone di `repositories/filkommerch`, buat Node.js App:

1. Di cPanel, cari menu **Setup Node.js App**.
2. Klik **Create Application**.
3. Isi konfigurasi sebagai berikut:

| Field | Value | Penjelasan |
|---|---|---|
| **Node.js version** | `22.22.3` (atau versi terbaru yang tersedia) | Gunakan versi LTS stabil |
| **Application mode** | `Production` | Mode produksi |
| **Application root** | `repositories/filkommerch/backend` | Folder backend di dalam repo hasil clone |
| **Application URL** | `filkommerch.com` (dan biarkan kolom setelahnya kosong) | Default Domain |
| **Application startup file** | `dist/server.js` | Entry point server backend setelah dibuild |

4. Klik **Create**.

### 3.2 Set Environment Variables

Di halaman yang sama setelah membuat app, scroll ke bawah ke bagian **Environment variables**. Klik **ADD VARIABLE** untuk menambahkan data database dan Midtrans:

| Variable Name | Value |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_USER` | `filj5633_merch` |
| `DB_PASSWORD` | *(password database kamu)* |
| `DB_NAME` | `filj5633_filkommerch` |
| `DB_PORT` | `3306` |
| `MIDTRANS_SERVER_KEY` | *(server key production/sandbox)* |
| `MIDTRANS_CLIENT_KEY` | *(client key production/sandbox)* |
| `MIDTRANS_IS_PRODUCTION` | `false` (set `true` jika sudah siap live) |
| `FRONTEND_URL` | `https://filkommerch.com` |
| `NODE_ENV` | `production` |

### 3.3 Install Dependencies & Build Backend

1. Di bagian paling atas halaman Setup Node.js App, copy command virtual env yang disediakan (contoh: `source /home/filj5633/nodevenv/repositories/filkommerch/backend/22/bin/activate && cd /home/filj5633/repositories/filkommerch/backend`).
2. Cari menu **Terminal** di cPanel.
3. Paste command tersebut dan tekan **Enter** untuk masuk to virtual environment.
4. Jalankan perintah install dependencies (hanya module non-dev):
   ```bash
   npm install --omit=dev
   ```
5. Build project TypeScript backend kamu:
   ```bash
   npm run build
   ```
6. Kembali ke menu **Setup Node.js App** lalu klik **Restart** aplikasi.

---

## 🌐 Step 4: Build & Upload Frontend

### 4.1 Build Frontend di Local

Di komputer kamu, buka terminal di folder `frontend`:

```bash
cd frontend
```

Edit file `.env.local` atau `.env.production` di root project:
```env
VITE_API_URL=https://filkommerch.com/api
```

Lalu jalankan build:
```bash
npm run build
```
Hasil compile static file akan berada di folder `frontend/dist/`.

### 4.2 Upload Hasil Build ke public_html

1. Buka **File Manager** di cPanel.
2. Masuk ke folder `public_html`.
3. Hapus semua file bawaan default hosting (misal: `default.html` atau `index.php` bawaan Rumahweb).
4. Upload semua isi folder `frontend/dist/` (file `index.html`, folder `assets/`, dll.) langsung ke dalam `public_html`.

---

## 📄 Step 5: Konfigurasi `.htaccess`

File `.htaccess` digunakan untuk mengarahkan request `/api/*` dari domain utama ke port backend Node.js internal dan menangani client routing React SPA.

1. Di **File Manager** cPanel, pastikan opsi "Show Hidden Files" aktif di settings (pojok kanan atas).
2. Di dalam folder `public_html`, buat file baru bernama `.htaccess` (atau edit jika sudah ada).
3. Isi dengan kode berikut:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Pastikan request /api/* diteruskan ke Node.js Application URL
  # (Phusion Passenger otomatis memproses request ini jika root path sesuai)
  RewriteRule ^api/(.*)$ http://127.0.0.1:PORT_INTERNAL_NODE/$1 [P,L]

  # 2. Redirect request non-file & non-direktori ke index.html (React routing)
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```
*(Catatan: cPanel secara otomatis mengelola server backend jika Application URL diset ke domain utama. Jika api tidak terjangkau, pastikan subfolder routing `.htaccess` dikonfigurasi dengan benar).*

---

## 🤖 Step 6: (Opsional) GitHub Actions untuk Full Auto-Deploy

> Jika kamu ingin proses deployment 100% otomatis (setiap `git push` ke branch `main` langsung ter-update di hosting tanpa harus buka cPanel), gunakan GitHub Actions.

### 6.1 Setup FTP Credentials di GitHub Secrets

1. Buka repository GitHub kamu → **Settings** → **Secrets and variables** → **Actions**.
2. Tambahkan secrets berikut:

| Secret Name | Value |
|-------------|-------|
| `FTP_SERVER` | `filkommerch.com` (atau IP server cPanel) |
| `FTP_USERNAME` | `filj5633` |
| `FTP_PASSWORD` | `Xnr6v7QvYF9B45` *(Ganti password cPanel kamu jika sudah diubah)* |

### 6.2 Buat Workflow File di Project Kamu

Buat file `.github/workflows/deploy.yml` di repository kamu:

```yaml
name: 🚀 Deploy to cPanel

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: ✅ Checkout Code
        uses: actions/checkout@v4

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      # ---- BUILD FRONTEND ----
      - name: 🔨 Build Frontend
        env:
          VITE_API_URL: https://filkommerch.com/api
        run: |
          cd frontend
          npm ci
          npm run build

      # ---- DEPLOY FRONTEND ke public_html ----
      - name: 🌐 Deploy Frontend via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./frontend/dist/
          server-dir: /public_html/
          dangerous-clean-slate: false

      # ---- DEPLOY BACKEND ----
      - name: ⚙️ Deploy Backend via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./backend/
          server-dir: /repositories/filkommerch/backend/
          exclude: |
            **/node_modules/**
            **/.git/**
            **/.env
```

---

## 🧬 Step 7: Mengelola Perubahan Database (Migration)

Project ini dilengkapi dengan script migration otomatis di [migrate.ts](file:///c:/Users/rizwa/OneDrive/Gambar/web/filkommerch/web_filkom_merch/backend/src/migrate.ts) yang mendeteksi perubahan schema database setiap kali backend dijalankan.

### Cara Kerjanya:
1. Jika AI atau kamu menambahkan kolom baru, query database baru akan ditambahkan ke `migrate.ts` (misal: query `ALTER TABLE`).
2. Setelah code di-push ke GitHub dan ditarik ke cPanel, kamu cukup **Restart** Node.js App dari cPanel.
3. Saat app startup, fungsi `runMigration()` otomatis mengecek database phpMyAdmin kamu dan meng-apply alter query jika belum ada.
4. Database di phpMyAdmin cPanel akan langsung terupdate otomatis tanpa perlu query manual!

---

## 🎯 Alur Kerja Sehari-hari (Setelah Setup)

Jika kamu sudah selesai melakukan setup ini:

```bash
# 1. Edit kode di local / biarkan AI melakukan perbaikan
# 2. Compile frontend build di local
cd frontend && npm run build
cd ..

# 3. Commit dan push ke GitHub
git add .
git commit -m "update database & UI"
git push origin main

# 4. Buka cPanel → Git Version Control → Klik 'Update from Remote' → klik 'Deploy HEAD Commit'
# 5. Buka cPanel → Setup Node.js App → Klik 'Restart'
```
Aplikasi kamu di `https://filkommerch.com` akan langsung ter-update dengan perubahan terbaru!

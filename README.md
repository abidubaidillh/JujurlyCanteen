# Jujurly Canteen System

Sistem manajemen kantin berbasis web dengan fitur pembayaran QRIS otomatis menggunakan AI. Pelanggan melakukan scan bukti pembayaran melalui kamera, sistem memverifikasi nominal secara otomatis menggunakan Computer Vision (YOLOv8) dan OCR (Tesseract.js), lalu admin mengelola transaksi, stok, dan laporan melalui panel admin.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database & Storage | Supabase (PostgreSQL + Storage) |
| OCR Engine | Tesseract.js 7 |
| AI Detection | YOLOv8 via FastAPI (Python) |
| Image Processing | OpenCV.js (client-side) |
| Validation | Zod 4 |
| Dark Mode | next-themes |
| Animation | Framer Motion |
| Testing | Vitest |

---

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **Python** >= 3.10 (untuk backend AI detector, opsional)
- Akun **Supabase** (free tier cukup)
- Akun **Vercel** (untuk deployment)

---

## Environment Variables

Buat file `.env.local` di root proyek dengan variabel berikut:

| Variabel | Wajib | Deskripsi |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL project Supabase kamu (format: `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon/public key dari Supabase project settings |
| `NEXT_PUBLIC_API_URL` | ⚠️ | URL backend FastAPI (AI detector). Default: `http://127.0.0.1:8000`. Wajib diisi di production jika fitur kamera digunakan |

Contoh `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

> **Catatan:** Semua variabel menggunakan prefix `NEXT_PUBLIC_` sehingga dapat diakses di client-side. Tidak ada secret key yang tersimpan di codebase.

---

## Instalasi Lokal

### 1. Clone repository

```bash
git clone <repository-url>
cd jujurly-canteen
```

### 2. Install dependensi frontend

```bash
npm install
```

### 3. Konfigurasi environment

Salin contoh environment dan isi nilainya:

```bash
cp .env.local.example .env.local
# Edit .env.local dengan kredensial Supabase kamu
```

### 4. Jalankan development server

```bash
npm run dev
```

Aplikasi berjalan di: `http://localhost:3000`

### 5. (Opsional) Jalankan backend AI Detector

```bash
cd ai-detector
pip install fastapi uvicorn opencv-python numpy ultralytics
python run.py
```

Backend berjalan di: `http://127.0.0.1:8000`

---

## Pengaturan Database (Supabase)

Buat tabel-tabel berikut melalui SQL Editor di dashboard Supabase.

### Tabel `admin`

```sql
CREATE TABLE admin (
  id_admin  serial PRIMARY KEY,
  username  text NOT NULL UNIQUE,
  password  text NOT NULL
);
```

### Tabel `admin_sessions`

```sql
CREATE TABLE admin_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username    text NOT NULL,
  token       text NOT NULL UNIQUE,
  user_agent  text,
  created_at  timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);
```

### Tabel `transaksi`

```sql
CREATE TABLE transaksi (
  id_transaksi       serial PRIMARY KEY,
  nominal            numeric NOT NULL CHECK (nominal > 0),
  metode_pembayaran  text NOT NULL DEFAULT 'QRIS',
  waktu_transaksi    timestamptz DEFAULT now(),
  status_validasi    text NOT NULL CHECK (status_validasi IN ('Valid', 'Pending', 'Invalid'))
);
```

### Tabel `bukti_pembayaran`

```sql
CREATE TABLE bukti_pembayaran (
  id_bukti        serial PRIMARY KEY,
  id_transaksi    int REFERENCES transaksi(id_transaksi),
  file_gambar     text,
  status          text CHECK (status IN ('valid', 'invalid', 'pending')),
  waktu_capture   timestamptz DEFAULT now()
);
```

### Tabel `hasil_ocr`

```sql
CREATE TABLE hasil_ocr (
  id_ocr          serial PRIMARY KEY,
  id_bukti        int REFERENCES bukti_pembayaran(id_bukti),
  teks_ocr        text,
  nominal_terbaca numeric,
  merchant_name   text
);
```

### Tabel `stok_barang`

```sql
CREATE TABLE stok_barang (
  id_barang         serial PRIMARY KEY,
  nama_barang       text NOT NULL,
  kategori          text CHECK (kategori IN ('Makanan', 'Minuman')),
  harga             numeric NOT NULL,
  stok_tersedia     int NOT NULL DEFAULT 0,
  waktu_ditambahkan timestamptz DEFAULT now()
);
```

### Tabel `global_settings`

```sql
CREATE TABLE global_settings (
  id              int PRIMARY KEY DEFAULT 1,
  is_maintenance  boolean NOT NULL DEFAULT false
);

-- Seed baris awal (wajib)
INSERT INTO global_settings (id, is_maintenance) VALUES (1, false);
```

### Supabase Storage

Buat bucket bernama `bukti-transfer` dengan visibility **public**:

1. Buka **Storage** di dashboard Supabase
2. Klik **New bucket**
3. Nama: `bukti-transfer`
4. Aktifkan **Public bucket**

### Row Level Security (RLS)

Untuk kemudahan development, aktifkan akses penuh dengan anon key:

```sql
-- Izinkan anon key baca/tulis pada semua tabel yang dibutuhkan
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON transaksi FOR ALL USING (true) WITH CHECK (true);

-- Ulangi untuk: admin, admin_sessions, bukti_pembayaran,
-- hasil_ocr, stok_barang, global_settings
```

> **Peringatan:** Untuk production, ganti policy di atas dengan aturan RLS yang lebih ketat sesuai kebutuhan keamanan aplikasimu.

---

## Panduan Deployment (Vercel)

### 1. Push ke GitHub

```bash
git add .
git commit -m "ready for deployment"
git push origin main
```

### 2. Import ke Vercel

1. Buka [vercel.com](https://vercel.com) dan klik **Add New Project**
2. Import repository dari GitHub
3. Framework akan terdeteksi otomatis sebagai **Next.js**

### 3. Konfigurasi Environment Variables

Di halaman konfigurasi project Vercel, tambahkan semua variabel berikut:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase project kamu |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `NEXT_PUBLIC_API_URL` | URL backend AI detector yang sudah di-deploy |

### 4. Deploy

Klik **Deploy**. Vercel akan menjalankan `npm run build` secara otomatis.

---

## Peringatan Krusial Build

### ⚠️ Gambar dari Supabase Storage

Komponen bukti pembayaran di `transaction/page.tsx` menggunakan tag `<img>` native (bukan `next/image`) untuk menampilkan gambar dari Supabase Storage. Ini disengaja untuk menghindari kebutuhan konfigurasi `remotePatterns` di `next.config.ts`. Jika di masa depan beralih ke `next/image`, tambahkan konfigurasi berikut:

```ts
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
```

### ⚠️ Backend AI Detector

Fitur scan kamera membutuhkan backend Python (FastAPI + YOLOv8) yang berjalan terpisah. Vercel **tidak** dapat meng-host server Python. Deploy backend ke layanan terpisah seperti:
- Railway (`railway.app`)
- Render (`render.com`)
- Google Cloud Run

Setelah deployed, isi `NEXT_PUBLIC_API_URL` dengan URL backend tersebut.

### ⚠️ Proxy (Maintenance Mode)

File `src/proxy.ts` berjalan di **Edge Runtime** Vercel. File ini hanya menggunakan `next/server` dan native `fetch` — tidak ada dependency Node.js, aman untuk edge.

---

## Scripts

| Command | Fungsi |
|---|---|
| `npm run dev` | Jalankan development server (Turbopack) |
| `npm run build` | Build production |
| `npm run start` | Jalankan production server |
| `npm run lint` | Jalankan ESLint |
| `npm run test` | Jalankan test suite (Vitest, single run) |
| `npm run test:watch` | Jalankan test dalam watch mode |

---

## Struktur Direktori

```
src/
├── app/
│   ├── admin/          # Portal admin (dashboard, stock, transaction, dll)
│   │   ├── actions.ts  # Server Actions (Supabase mutations, cache)
│   │   └── layout.tsx  # Auth guard + sidebar layout
│   ├── api/            # API Routes
│   ├── scan/           # Halaman scan kamera pelanggan
│   ├── proses/         # Pipeline OCR
│   ├── hasil/          # Halaman hasil transaksi
│   └── maintenance/    # Halaman maintenance mode
├── components/
│   ├── admin/          # AdminSidebar, AdminHeader
│   ├── layout/         # Header, Footer, ScanOverlay
│   └── ui/             # Mascot, NotifBell, ThemeProvider
├── hooks/              # Custom hooks (kamera, CV, OCR)
├── proxy.ts            # Maintenance mode proxy (Edge Runtime)
└── types/
ai-detector/            # Backend Python (FastAPI + YOLOv8)
```

---

## Kontributor

Capstone Project — Jujurly Canteen System  
KWU · HMIT ITS

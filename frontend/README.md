# Tamafarm Frontend

Frontend React + Vite + Tailwind untuk backend Laravel Tamafarm.

## Menjalankan

Butuh Node.js 20.19 ke atas.

```bash
npm install
npm run dev
```

Buka http://localhost:5173. Backend Laravel harus jalan di http://localhost:8000:

```bash
cd ../backend
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

Saat development, Vite meneruskan `/api` dan `/storage` ke Laravel, jadi CORS belum perlu diatur.
Jika backend di alamat lain: `VITE_BACKEND_URL=http://alamat:port npm run dev`.

Akun awal dari seeder: username `pemilik`. Ganti password-nya sebelum dipakai sungguhan.

## Halaman

| Alamat | Siapa | Isi |
|---|---|---|
| `/` | Publik | Papan harga, katalog, cari dan filter kategori |
| `/produk/:id` | Publik | Detail produk, minimal order, tombol WhatsApp |
| `/login` | Semua | Masuk dengan username dan password |
| `/panel/produk` | admin | Tambah, ubah, hapus produk (dengan upload foto) |
| `/panel/kategori` | admin | Tambah, ubah, hapus kategori |
| `/panel/akun` | pemilik | Tambah, ubah, hapus akun admin |

Hak akses mengikuti backend: role `pemilik` hanya bisa mengelola akun admin,
sedangkan produk dan kategori hanya bisa dikelola role `admin`.

## Production

1. Salin `.env.example` ke `.env`, isi `VITE_API_URL` (contoh `https://api.domain.com/api`) dan `VITE_WHATSAPP`.
2. `npm run build`, lalu upload isi folder `dist`. Atur server agar semua path diarahkan ke `index.html`.
3. Di Laravel, aktifkan CORS untuk domain frontend: `php artisan config:publish cors`,
   lalu isi `allowed_origins` di `config/cors.php` dan pastikan `paths` memuat `api/*`.
4. Set `APP_URL` di `.env` Laravel ke alamat backend yang benar, karena `gambar_url` dibuat dari nilai itu.

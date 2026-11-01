# Tamafarm — akses dengan password

Salinan proyek Tamafarm ini memerlukan aktivasi melalui file `backend/.env`. Sebelum menjalankan website, penerima harus meminta password kepada pemilik proyek dan mengisinya secara manual. Tidak ada form password aktivasi di browser.

## Persiapan

1. Di folder `backend`, jalankan `composer install` dan salin `.env.example` menjadi `.env`.
2. Isi **secara manual** di `backend/.env`:

   ```dotenv
   WEBSITE_ACCESS_PASSWORD="isi-password-akses-di-sini"
   ```

   Isi dengan password dari pemilik proyek, bukan password baru buatan sendiri. Password diperiksa terhadap hash bcrypt yang disertakan di repository. Nilai kosong atau salah membuat aktivasi ditolak. Jangan menyimpan password asli di Git.
3. Sesuaikan koneksi database di `.env`, lalu jalankan:

   ```bash
   php artisan key:generate
   php artisan config:clear
   php artisan migrate --seed
   php artisan storage:link
   php artisan serve
   ```

4. Di folder `frontend`, jalankan `npm ci` lalu `npm run dev`.
5. Jika aktivasi benar, frontend dapat dibuka dan pengguna login akun seperti biasa. `npm run dev` dan `npm run preview` menolak mulai jika aktivasi belum valid. PHP harus tersedia di PATH terminal.

Setelah mengubah password di `.env`, jalankan `php artisan config:clear` dan mulai ulang backend. Untuk deployment yang menggunakan cache konfigurasi, bangun ulang cache dengan `php artisan config:cache`. Gunakan HTTPS untuk akses melalui internet.

Password aktivasi hanya dibaca di sisi server dan saat Vite memeriksa konfigurasi lokal. Password tidak dikirim ke browser dan tidak disimpan di sessionStorage. Jangan menaruh password ini pada variabel `VITE_*`. Build aset dapat dilakukan tanpa aktivasi, tetapi halaman aplikasi dan API tetap memerlukan backend yang diaktifkan. Notifikasi Midtrans tetap menggunakan verifikasi tanda tangan pembayaran sendiri.

Password yang diterima harus cocok dengan hash yang sudah ditetapkan oleh pemilik. Mengubah nilai `.env` saja menjadi password lain tidak mengubah password yang diterima aplikasi.

## Batasan

Pembatasan ini mengontrol akses pada aplikasi yang kode dan konfigurasinya Anda kelola. Penerima seluruh kode sumber dapat mengubah konfigurasi atau menghapus pemeriksaan password pada salinannya sendiri. Password ini tidak mengunci perangkat penerima secara permanen.

Proyek ini dikembangkan dari versi dasar [Tamafarm](https://github.com/sharrr296/Tamafarm). Kontribusi awal tetap berasal dari proyek tersebut; salinan ini menambahkan pengembangan lanjutan dan gerbang akses website.

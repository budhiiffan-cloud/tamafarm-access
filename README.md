# Tamafarm — akses dengan password

Salinan proyek Tamafarm ini memakai password akses website sebelum halaman aplikasi dan API dapat digunakan. Password ini terpisah dari password akun pelanggan, admin, dan pemilik.

## Persiapan

1. Di folder `backend`, jalankan `composer install` dan salin `.env.example` menjadi `.env`.
2. Isi **secara manual** di `backend/.env`:

   ```dotenv
   WEBSITE_ACCESS_PASSWORD="isi-password-akses-di-sini"
   ```

   Minta password kepada pemilik proyek. Jangan menyimpan password asli di Git. Nilai kosong membuat website tetap terkunci.
3. Sesuaikan koneksi database di `.env`, lalu jalankan:

   ```bash
   php artisan key:generate
   php artisan config:clear
   php artisan migrate --seed
   php artisan storage:link
   php artisan serve
   ```

4. Di folder `frontend`, jalankan `npm ci` lalu `npm run dev`.
5. Buka frontend dan masukkan password akses website, kemudian login akun seperti biasa.

Setelah mengubah password di `.env`, jalankan `php artisan config:clear` dan mulai ulang backend. Untuk deployment yang menggunakan cache konfigurasi, bangun ulang cache dengan `php artisan config:cache`. Gunakan HTTPS untuk akses melalui internet.

Password akses dikirim ke backend untuk setiap permintaan API dan disimpan di sessionStorage tab browser. Jangan menaruh password ini pada variabel `VITE_*`. Aset statis frontend bukan tempat menyimpan rahasia. Notifikasi Midtrans tetap menggunakan verifikasi tanda tangan pembayaran sendiri.

## Batasan

Pembatasan ini mengontrol akses pada aplikasi yang kode dan konfigurasinya Anda kelola. Penerima seluruh kode sumber dapat mengubah konfigurasi atau menghapus pemeriksaan password pada salinannya sendiri. Password ini tidak mengunci perangkat penerima secara permanen.

Proyek ini dikembangkan dari versi dasar [Tamafarm](https://github.com/sharrr296/Tamafarm). Kontribusi awal tetap berasal dari proyek tersebut; salinan ini menambahkan pengembangan lanjutan dan gerbang akses website.
